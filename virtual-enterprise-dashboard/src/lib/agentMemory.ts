/* ==========================================================================
   AGENT MEMORY — Sistema de memória por agente
   ========================================================================== */

import { MemoryEntry } from './agentTypes';
import { generateUUID } from './utils';

const MAX_SHORT_TERM = 30;  // últimas N mensagens/fatos
const MAX_LONG_TERM = 200;  // fatos importantes persistidos

export function createMemoryEntry(
  type: MemoryEntry['type'],
  content: string,
  importance: number = 5
): MemoryEntry {
  return {
    id: generateUUID(),
    type,
    content,
    timestamp: Date.now(),
    importance: Math.max(0, Math.min(10, importance)),
  };
}

/** Adiciona uma memória e mantém o limite */
export function addMemory(memories: MemoryEntry[], entry: MemoryEntry): MemoryEntry[] {
  const updated = [...memories, entry];

  // Se passou do limite, remove as menos importantes e mais antigas
  if (updated.length > MAX_LONG_TERM) {
    return updated
      .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
      .slice(0, MAX_LONG_TERM);
  }
  return updated;
}

/** Busca memórias relevantes por query (match simples por keywords) */
export function recall(memories: MemoryEntry[], query: string, limit: number = 10): MemoryEntry[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  if (keywords.length === 0) return memories.slice(-limit);

  const scored = memories.map(m => {
    const text = m.content.toLowerCase();
    let score = 0;
    keywords.forEach(k => { if (text.includes(k)) score++; });
    // Boost por importância e recência
    score += m.importance * 0.1;
    score += (1 - (Date.now() - m.timestamp) / (1000 * 60 * 60 * 24 * 30)) * 0.5; // decai em 30 dias
    return { ...m, _score: score };
  });

  return scored
    .filter(m => (m as any)._score > 0)
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .slice(0, limit);
}

/** Gera um contexto resumido das memórias para enviar ao LLM */
export function getMemoryContext(memories: MemoryEntry[], maxTokens: number = 500): string {
  if (memories.length === 0) return 'Nenhuma memória registrada ainda.';

  const recent = memories.slice(-MAX_SHORT_TERM);
  const important = memories.filter(m => m.importance >= 7).slice(-10);

  // Une sem duplicatas
  const combined = Array.from(new Map([...important, ...recent].map(m => [m.id, m])).values());
  combined.sort((a, b) => a.timestamp - b.timestamp);

  const lines = combined.map(m => {
    const when = new Date(m.timestamp).toLocaleString('pt-BR');
    const tag = m.type === 'task-result' ? '📋' :
                m.type === 'decision' ? '🎯' :
                m.type === 'conversation' ? '💬' : '📌';
    return `${tag} [${when}] ${m.content}`;
  });

  let text = lines.join('\n');
  // Truncar se muito grande
  if (text.length > maxTokens * 4) {
    text = text.slice(-maxTokens * 4);
  }
  return text;
}

/** Resumo estatístico da memória */
export function memoryStats(memories: MemoryEntry[]) {
  return {
    total: memories.length,
    facts: memories.filter(m => m.type === 'fact').length,
    conversations: memories.filter(m => m.type === 'conversation').length,
    taskResults: memories.filter(m => m.type === 'task-result').length,
    decisions: memories.filter(m => m.type === 'decision').length,
    avgImportance: memories.length > 0
      ? Math.round((memories.reduce((s, m) => s + m.importance, 0) / memories.length) * 10) / 10
      : 0,
  };
}
