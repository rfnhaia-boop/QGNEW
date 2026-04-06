/* ==========================================================================
   AGENT STORE — Store central com persistência localStorage
   ========================================================================== */

import {
  AgentConfig, AgentRole, AgentModel, AgentRuntime, AgentMode,
  SkillId, MemoryEntry, ChatMessage, TaskRecord,
  MANAGER_NAME, MANAGER_SYSTEM_PROMPT,
} from './agentTypes';
import { RECOMMENDED_SKILLS, ROLE_SYSTEM_PROMPTS } from './agentSkills';
import { addMemory, createMemoryEntry } from './agentMemory';

const STORAGE_KEY = 'new-holding-agents';

// ─── Persistência ─────────────────────────────────────────────────────

function loadAgents(): AgentConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAgents(agents: AgentConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.warn('Failed to save agents:', e);
  }
}

// ─── State (in-memory, synced com localStorage) ───────────────────────

let _agents: AgentConfig[] = [];
let _listeners: (() => void)[] = [];

export function initStore() {
  _agents = loadAgents();
  // Garantir que NEXUS existe
  if (!_agents.find(a => a.isManager)) {
    _agents.push(createManager());
  }
  // Garantir que a equipe padrão existe (primeira vez)
  const initialized = typeof window !== 'undefined' && localStorage.getItem('new-holding-initialized');
  if (!initialized) {
    for (const emp of DEFAULT_TEAM) {
      const exists = _agents.find(a => a.name === emp.name);
      if (!exists) {
        _agents.push(createDefaultEmployee(emp));
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('new-holding-initialized', 'true');
    }
  }
  saveAgents(_agents);
}

function notify() {
  saveAgents(_agents);
  _listeners.forEach(fn => fn());
}

export function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter(l => l !== listener); };
}

export function getAgents(): AgentConfig[] { return _agents; }
export function getAgent(id: string): AgentConfig | undefined { return _agents.find(a => a.id === id); }
export function getManager(): AgentConfig | undefined { return _agents.find(a => a.isManager); }

// ─── Criar Agentes ────────────────────────────────────────────────────

function createManager(): AgentConfig {
  return {
    id: crypto.randomUUID(),
    name: MANAGER_NAME,
    role: 'Gerente',
    roleIcon: '🎯',
    isManager: true,
    task: 'Gerenciar a equipe da New Holding, delegar tarefas e manter o CEO atualizado',
    runtime: 'subagent',
    mode: 'session',
    model: 'gemini',
    cwd: '/',
    systemPrompt: MANAGER_SYSTEM_PROMPT,
    temperature: 0.7,
    skills: RECOMMENDED_SKILLS['Gerente'],
    status: 'idle',
    memory: [],
    chatHistory: [],
    taskQueue: [],
    taskHistory: [],
    skin: '#D4A574',
    hair: '#1a1a2e',
    shirt: '#f59e0b',
    pants: '#1e1e3a',
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
}

// ─── Equipe padrão da New Holding ─────────────────────────────────────
interface DefaultEmployee {
  name: string;
  role: AgentRole;
  roleIcon: string;
  task: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

const DEFAULT_TEAM: DefaultEmployee[] = [
  {
    name: 'Dra. Ada',
    role: 'Desenvolvedor',
    roleIcon: '💻',
    task: 'Desenvolver features do sistema principal, fazer code reviews e manter a arquitetura limpa',
    skin: '#FFDBAC',
    hair: '#3d2314',
    shirt: '#7c3aed',
    pants: '#111111',
  },
  {
    name: 'Dr. Pavlov',
    role: 'Cientista',
    roleIcon: '🔬',
    task: 'Analisar dados dos produtos, rodar experimentos A/B e gerar insights para crescimento',
    skin: '#D4A574',
    hair: '#1a1a2e',
    shirt: '#6366f1',
    pants: '#1e1e3a',
  },
  {
    name: 'Eva Martinez',
    role: 'Designer',
    roleIcon: '🎨',
    task: 'Criar interfaces premium, manter o design system e prototipar features novas',
    skin: '#C68B59',
    hair: '#8b2500',
    shirt: '#e11d48',
    pants: '#111111',
  },
  {
    name: 'Marcus Reed',
    role: 'Analista',
    roleIcon: '📈',
    task: 'Acompanhar métricas de negócio, criar dashboards e relatórios executivos para o CEO',
    skin: '#6B3A1F',
    hair: '#1a1a2e',
    shirt: '#f59e0b',
    pants: '#374151',
  },
  {
    name: 'Agent Sigma',
    role: 'Segurança',
    roleIcon: '🔒',
    task: 'Auditar sistemas, garantir compliance LGPD e monitorar vulnerabilidades',
    skin: '#8D5524',
    hair: '#1a1a2e',
    shirt: '#10b981',
    pants: '#2a3a5c',
  },
];

function createDefaultEmployee(emp: DefaultEmployee): AgentConfig {
  return {
    id: crypto.randomUUID(),
    name: emp.name,
    role: emp.role,
    roleIcon: emp.roleIcon,
    isManager: false,
    task: emp.task,
    runtime: 'subagent',
    mode: 'run',
    model: 'gemini',
    cwd: '/',
    systemPrompt: ROLE_SYSTEM_PROMPTS[emp.role],
    temperature: 0.7,
    skills: RECOMMENDED_SKILLS[emp.role],
    status: 'idle',
    memory: [],
    chatHistory: [],
    taskQueue: [],
    taskHistory: [],
    skin: emp.skin,
    hair: emp.hair,
    shirt: emp.shirt,
    pants: emp.pants,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
}

export interface CreateAgentParams {
  name: string;
  role: AgentRole;
  roleIcon: string;
  task: string;
  runtime: AgentRuntime;
  mode: AgentMode;
  model: AgentModel;
  cwd: string;
  systemPrompt: string;
  temperature: number;
  skills: SkillId[];
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
}

export function createAgent(params: CreateAgentParams): AgentConfig {
  const agent: AgentConfig = {
    ...params,
    id: crypto.randomUUID(),
    isManager: false,
    status: 'idle',
    memory: [],
    chatHistory: [],
    taskQueue: [],
    taskHistory: [],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  _agents.push(agent);
  notify();
  return agent;
}

// ─── Chat ─────────────────────────────────────────────────────────────

export function addChatMessage(agentId: string, msg: ChatMessage) {
  const agent = getAgent(agentId);
  if (!agent) return;
  agent.chatHistory.push(msg);
  // Salvar na memória se for do agente
  if (msg.from === 'agent') {
    agent.memory = addMemory(agent.memory, createMemoryEntry('conversation', `Eu respondi: ${msg.text.slice(0, 100)}`, 3));
  } else {
    agent.memory = addMemory(agent.memory, createMemoryEntry('conversation', `CEO disse: ${msg.text.slice(0, 100)}`, 5));
  }
  agent.lastActiveAt = Date.now();
  notify();
}

// ─── Tarefas ──────────────────────────────────────────────────────────

export function addTask(agentId: string, task: TaskRecord) {
  const agent = getAgent(agentId);
  if (!agent) return;
  agent.taskQueue.push(task);
  agent.memory = addMemory(agent.memory, createMemoryEntry('fact', `Recebi nova tarefa: ${task.description}`, 7));
  agent.status = 'running';
  agent.lastActiveAt = Date.now();
  notify();
}

export function completeTask(agentId: string, taskId: string, result: string) {
  const agent = getAgent(agentId);
  if (!agent) return;
  const task = agent.taskQueue.find(t => t.id === taskId);
  if (task) {
    task.status = 'done';
    task.result = result;
    task.completedAt = Date.now();
    agent.taskQueue = agent.taskQueue.filter(t => t.id !== taskId);
    agent.taskHistory.push(task);
    agent.memory = addMemory(agent.memory, createMemoryEntry('task-result', `Completei: ${task.description} → ${result.slice(0, 100)}`, 8));
    agent.status = agent.taskQueue.length > 0 ? 'running' : 'idle';
  }
  notify();
}

// ─── Memória ──────────────────────────────────────────────────────────

export function addAgentMemory(agentId: string, entry: MemoryEntry) {
  const agent = getAgent(agentId);
  if (!agent) return;
  agent.memory = addMemory(agent.memory, entry);
  notify();
}

export function clearMemory(agentId: string) {
  const agent = getAgent(agentId);
  if (!agent) return;
  agent.memory = [];
  agent.chatHistory = [];
  notify();
}

// ─── Status ───────────────────────────────────────────────────────────

export function updateStatus(agentId: string, status: AgentConfig['status']) {
  const agent = getAgent(agentId);
  if (!agent) return;
  agent.status = status;
  agent.lastActiveAt = Date.now();
  notify();
}

// ─── Reset ────────────────────────────────────────────────────────────

export function resetAll() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('new-holding-initialized');
  }
  _agents = [createManager(), ...DEFAULT_TEAM.map(createDefaultEmployee)];
  notify();
}

export function removeAgent(agentId: string) {
  const agent = getAgent(agentId);
  if (agent?.isManager) return; // Nunca remover o gerente
  _agents = _agents.filter(a => a.id !== agentId);
  notify();
}
