/* ==========================================================================
   AGENT CHAT COMPONENT — Chat real com texto + áudio
   ========================================================================== */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AgentConfig, ChatMessage } from '@/lib/agentTypes';
import { sendToLLM, buildLLMMessages } from '@/lib/llmAdapter';
import { addChatMessage, updateStatus, getAgent } from '@/lib/agentStore';
import { memoryStats } from '@/lib/agentMemory';

interface Props {
  agent: AgentConfig;
  onClose: () => void;
}

export default function AgentChat({ agent, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(agent.chatHistory);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null!);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync messages from store
  useEffect(() => {
    const fresh = getAgent(agent.id);
    if (fresh) setMessages([...fresh.chatHistory]);
  }, [agent.id]);

  // ─── Send Message ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const fresh = getAgent(agent.id);
    if (!fresh) return;

    // Adicionar mensagem do user
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      from: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(agent.id, userMsg);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    updateStatus(agent.id, 'thinking');

    try {
      // Build request com memória + histórico
      const freshAgent = getAgent(agent.id)!;
      const request = buildLLMMessages(freshAgent, text.trim());
      const response = await sendToLLM(request);

      // Adicionar resposta do agente
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        from: 'agent',
        text: response.text,
        timestamp: Date.now(),
      };
      addChatMessage(agent.id, agentMsg);
      setMessages(prev => [...prev, agentMsg]);
      updateStatus(agent.id, 'idle');
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        from: 'agent',
        text: '❌ Desculpe, tive um erro ao processar. Tente novamente.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      updateStatus(agent.id, 'error');
    }
    setIsThinking(false);
  }, [agent.id]);

  // ─── Speech to Text ─────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    // Auto-send after recording
    setTimeout(() => {
      const currentInput = (document.querySelector('[data-chat-input]') as HTMLInputElement)?.value;
      if (currentInput?.trim()) {
        sendMessage(currentInput);
      }
    }, 300);
  }, [sendMessage]);

  // ─── Text to Speech ─────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    // Pegar voz pt-BR se disponível
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stats = memoryStats(agent.memory);
  const isManager = agent.isManager;

  return (
    <div className="absolute bottom-4 right-4 z-30 w-[420px] max-h-[600px] bg-[#080a14]/97 border border-white/12 rounded-2xl backdrop-blur-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 p-3.5 border-b border-white/8 shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{
            backgroundColor: agent.shirt + '20',
            border: `1px solid ${agent.shirt}40`,
            boxShadow: isManager ? `0 0 16px ${agent.shirt}30` : 'none',
          }}
        >
          {agent.roleIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-white/90 truncate">{agent.name}</p>
            {isManager && <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/25 uppercase tracking-widest font-bold">Gerente</span>}
          </div>
          <p className="text-[9px] text-white/25">
            {agent.role} • {agent.model === 'gemini' ? '✨ Gemini' : agent.model} • {agent.status === 'thinking' ? '💭 Pensando...' : '🟢 Online'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowMemory(!showMemory)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${showMemory ? 'bg-violet-600/30 text-violet-300' : 'bg-white/5 text-white/25 hover:text-white/50'}`} title="Memória">🧠</button>
          <button onClick={() => setShowInfo(!showInfo)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${showInfo ? 'bg-indigo-600/30 text-indigo-300' : 'bg-white/5 text-white/25 hover:text-white/50'}`} title="Info">⚙️</button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 text-white/25 flex items-center justify-center text-xs hover:text-white/60 transition">✕</button>
        </div>
      </div>

      {/* ─── Info Panel (colapsável) ─── */}
      {showInfo && (
        <div className="px-3.5 py-2.5 border-b border-white/6 bg-indigo-950/20 text-[9px] space-y-1.5 shrink-0">
          <div className="flex items-center justify-between"><span className="text-white/30">Modelo</span><span className="text-indigo-300 font-mono">{agent.model}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/30">Runtime</span><span className="text-indigo-300 font-mono">{agent.runtime}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/30">Mode</span><span className="text-indigo-300 font-mono">{agent.mode}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/30">Temperature</span><span className="text-indigo-300 font-mono">{agent.temperature}</span></div>
          <div className="flex items-center justify-between"><span className="text-white/30">Skills</span><span className="text-indigo-300">{agent.skills.length} ativas</span></div>
          <div className="flex items-center justify-between"><span className="text-white/30">Task</span><span className="text-indigo-300 truncate max-w-[200px]">{agent.task || '—'}</span></div>
        </div>
      )}

      {/* ─── Memory Panel (colapsável) ─── */}
      {showMemory && (
        <div className="px-3.5 py-2.5 border-b border-white/6 bg-violet-950/20 max-h-[150px] overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">Memória ({stats.total})</span>
            <div className="flex gap-1.5 text-[8px] text-white/20">
              <span>📌{stats.facts}</span>
              <span>💬{stats.conversations}</span>
              <span>📋{stats.taskResults}</span>
              <span>🎯{stats.decisions}</span>
            </div>
          </div>
          {agent.memory.length === 0 ? (
            <p className="text-[9px] text-white/15 italic">Nenhuma memória registrada ainda.</p>
          ) : (
            <div className="space-y-1">
              {agent.memory.slice(-8).map(m => (
                <div key={m.id} className="text-[9px] text-white/40 flex gap-1.5">
                  <span className="shrink-0">{m.type === 'fact' ? '📌' : m.type === 'conversation' ? '💬' : m.type === 'task-result' ? '📋' : '🎯'}</span>
                  <span className="truncate">{m.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Messages ─── */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[220px] max-h-[350px]">
        {/* Welcome message se vazio */}
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.06] text-white/70 text-xs leading-relaxed">
              {isManager
                ? `👋 Olá Rafael! Sou o **NEXUS**, seu Gerente IA. Estou pronto pra receber suas ideias e delegar pro time. O que vamos construir hoje?`
                : `Olá! Sou ${agent.name}, ${agent.role} da New Holding. Como posso ajudar?`
              }
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative group max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
              msg.from === 'user'
                ? 'bg-indigo-600/35 text-indigo-50 rounded-br-sm'
                : 'bg-white/[0.06] text-white/75 rounded-bl-sm'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {/* Speaker button on agent messages */}
              {msg.from === 'agent' && (
                <button
                  onClick={() => speak(msg.text)}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                  title="Ouvir"
                >
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[9px] text-white/20 ml-1">{agent.name} está pensando...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Input ─── */}
      <div className="p-3 border-t border-white/8 flex items-center gap-2 shrink-0">
        {/* Mic button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all ${
            isRecording
              ? 'bg-red-500/40 text-red-300 border border-red-500/50 animate-pulse shadow-lg shadow-red-500/20'
              : 'bg-white/5 text-white/25 border border-white/8 hover:text-white/50 hover:bg-white/10'
          }`}
          title="Segurar para falar"
        >
          🎤
        </button>

        <input
          data-chat-input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder={isRecording ? '🔴 Ouvindo...' : isManager ? 'Fale uma ideia pro NEXUS...' : `Mensagem para ${agent.name}...`}
          className="flex-1 bg-white/[0.04] border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/15 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all"
          disabled={isThinking}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={isThinking || !input.trim()}
          className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600/50 flex items-center justify-center text-sm text-white/80 hover:bg-indigo-600/70 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
