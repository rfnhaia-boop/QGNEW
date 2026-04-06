/* ==========================================================================
   LLM ADAPTER — Adaptador unificado para Google Gemini
   ========================================================================== */

import { AgentModel, ChatMessage, AgentConfig } from './agentTypes';
import { getMemoryContext } from './agentMemory';

interface LLMRequest {
  messages: { role: 'user' | 'model'; content: string }[];
  systemPrompt: string;
  model: AgentModel;
  temperature: number;
}

interface LLMResponse {
  text: string;
  model: string;
  tokensUsed?: number;
}

/** Envia para o Gemini via nossa API route */
export async function sendToLLM(request: LLMRequest): Promise<LLMResponse> {
  try {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      console.warn('LLM API falhou, usando mock:', res.status);
      return mockResponse(request);
    }

    const data = await res.json();
    return {
      text: data.text || 'Sem resposta do modelo.',
      model: data.model || 'gemini',
      tokensUsed: data.tokensUsed,
    };
  } catch (err) {
    console.warn('LLM request failed, using mock:', err);
    return mockResponse(request);
  }
}

/** Constrói o array de mensagens para enviar ao LLM usando o contexto do agente */
export function buildLLMMessages(
  agent: AgentConfig,
  userMessage: string
): LLMRequest {
  const memoryCtx = getMemoryContext(agent.memory);

  // Converter chatHistory para o formato do LLM (últimas 20)
  const history = agent.chatHistory.slice(-20).map(m => ({
    role: (m.from === 'user' ? 'user' : 'model') as 'user' | 'model',
    content: m.text,
  }));

  // Adicionar a mensagem atual
  history.push({ role: 'user', content: userMessage });

  // System prompt enriquecido com memória
  const enrichedPrompt = `${agent.systemPrompt}

## Sua Memória (contexto recente)
${memoryCtx}

## Skills Ativas
${agent.skills.join(', ')}

## Informações
- Seu nome: ${agent.name}
- Seu cargo: ${agent.role}
- Modelo IA: ${agent.model}
- Tarefa principal: ${agent.task || 'Nenhuma tarefa específica'}`;

  return {
    messages: history,
    systemPrompt: enrichedPrompt,
    model: agent.model,
    temperature: agent.temperature,
  };
}

/** Mock inteligente quando a API não está disponível */
function mockResponse(request: LLMRequest): LLMResponse {
  const lastMsg = request.messages[request.messages.length - 1]?.content || '';
  const prompt = request.systemPrompt.toLowerCase();

  let text: string;

  if (prompt.includes('gerente') || prompt.includes('nexus')) {
    const responses = [
      `📋 Entendi sua solicitação! Vou organizar isso em tarefas:\n\n1. **Análise inicial** — Preciso entender melhor o escopo\n2. **Planejamento** — Vou criar um plano de ação\n3. **Delegação** — Distribuir entre a equipe\n\nVou começar agora e te mantenho atualizado! 🚀`,
      `✅ Perfeito! Recebi sua instrução sobre "${lastMsg.slice(0, 50)}..."\n\nVou quebrar isso em etapas e delegar para o time. Alguma prioridade específica?`,
      `🎯 Boa ideia! Vou montar o plano de execução:\n\n**Próximos passos:**\n- Analisar viabilidade técnica com o Dev\n- Pedir wireframes ao Designer\n- Definir métricas com o Analista\n\nEstimativa: 3-5 dias úteis. Posso prosseguir?`,
    ];
    text = responses[Math.floor(Math.random() * responses.length)];
  } else if (prompt.includes('desenvolvedor') || prompt.includes('código')) {
    text = `💻 Analisei o pedido sobre "${lastMsg.slice(0, 40)}...".\n\nDo ponto de vista técnico, sugiro:\n- Stack: Next.js + TypeScript\n- Estimativa: ~${2 + Math.floor(Math.random() * 5)} horas\n- Risco: baixo\n\nPosso começar a implementar.`;
  } else if (prompt.includes('cientista') || prompt.includes('dados')) {
    text = `🔬 Interessante! Para "${lastMsg.slice(0, 40)}...", proponho:\n\n**Hipótese:** Podemos validar isso com uma análise de ${Math.floor(Math.random() * 1000) + 100} data points.\n**Método:** Análise estatística + visualização.\n**Confiança estimada:** ${75 + Math.floor(Math.random() * 20)}%`;
  } else if (prompt.includes('designer')) {
    text = `🎨 Adorei a ideia! Para "${lastMsg.slice(0, 40)}...", penso em:\n\n- Layout clean e moderno\n- Paleta escura com accent em indigo\n- Micro-animações nos CTAs\n- Mobile-first\n\nVou montar um wireframe de alta fidelidade!`;
  } else {
    text = `Entendi! Vou trabalhar nisso: "${lastMsg.slice(0, 60)}..."\n\nMe dê um momento para processar e retorno com resultados. 💪`;
  }

  return { text, model: 'mock' };
}
