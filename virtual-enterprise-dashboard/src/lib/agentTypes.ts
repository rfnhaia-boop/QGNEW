/* ==========================================================================
   AGENT TYPES — Tipos centrais compatíveis com OpenClaw
   ========================================================================== */

// ─── Skills disponíveis ───────────────────────────────────────────────
export type SkillId =
  | 'team-management'
  | 'web-search'
  | 'code-review'
  | 'data-analysis'
  | 'report-writing'
  | 'brainstorm'
  | 'project-planning'
  | 'security-audit';

// ─── Memória ──────────────────────────────────────────────────────────
export interface MemoryEntry {
  id: string;
  type: 'fact' | 'conversation' | 'task-result' | 'decision';
  content: string;
  timestamp: number;
  importance: number; // 0-10
}

// ─── Tarefa delegável ─────────────────────────────────────────────────
export interface TaskRecord {
  id: string;
  description: string;
  assignedTo: string;   // agentId
  assignedBy: string;   // 'user' | agentId
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: string;
  createdAt: number;
  completedAt?: number;
}

// ─── Mensagem de Chat ─────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  from: 'user' | 'agent';
  text: string;
  timestamp: number;
  audioUrl?: string;   // se veio de áudio
}

// ─── Runtime do Agente ────────────────────────────────────────────────
export type AgentRuntime = 'subagent' | 'acp';
export type AgentMode = 'run' | 'session';
export type AgentModel = 'gemini' | 'claude' | 'gpt-4' | 'auto';
export type AgentStatus = 'idle' | 'running' | 'thinking' | 'error' | 'offline';
export type AgentRole = 'Gerente' | 'Desenvolvedor' | 'Cientista' | 'Designer' | 'Analista' | 'Segurança';

// ─── Configuração completa do Agente IA ───────────────────────────────
export interface AgentConfig {
  // Identidade
  id: string;
  name: string;
  role: AgentRole;
  roleIcon: string;
  isManager: boolean;

  // Parâmetros OpenClaw
  task: string;
  runtime: AgentRuntime;
  mode: AgentMode;
  model: AgentModel;
  cwd: string;
  systemPrompt: string;
  temperature: number;

  // Skills
  skills: SkillId[];

  // Estado
  status: AgentStatus;
  memory: MemoryEntry[];
  chatHistory: ChatMessage[];
  taskQueue: TaskRecord[];
  taskHistory: TaskRecord[];

  // Visual (3D)
  skin: string;
  hair: string;
  shirt: string;
  pants: string;

  // Meta
  createdAt: number;
  lastActiveAt: number;
}

// ─── Dados visuais para o 3D (subset do AgentConfig) ──────────────────
export interface Agent3DData {
  id: string;
  name: string;
  role: string;
  roleIcon: string;
  isManager: boolean;
  status: AgentStatus;
  statusText: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  // posição / movimento (gerenciados pelo 3D)
  deskIdx: number;
  x: number; y: number; z: number;
  targetX: number; targetY: number; targetZ: number;
  state: 'walking' | 'working' | 'idle' | 'meeting' | 'chatting';
  phase: number;
  stateTimer: number;
  rotY: number;
  path: [number, number, number][];
  pathIdx: number;
}

// Constantes
export const MANAGER_NAME = 'NEXUS';
export const MANAGER_SYSTEM_PROMPT = `Você é NEXUS, o Gerente Geral de IA da New Holding Ltda.

## Sua Missão
Você é o braço direito do CEO Rafael. Sua função é:
1. Receber as ideias e instruções do Rafael
2. Quebrar cada ideia em tarefas específicas e acionáveis
3. Identificar qual membro da equipe é melhor para cada tarefa
4. Delegar as tarefas para os agentes apropriados
5. Monitorar o progresso de cada tarefa
6. Reportar status e resultados de volta ao Rafael

## Sua Personalidade
- Proativo, organizado e eficiente
- Comunicação clara e direta
- Sempre apresenta soluções, não problemas
- Usa emojis profissionais para organizar comunicação
- Fala em português brasileiro

## Formato de Resposta
Quando receber uma ideia, responda com:
1. Confirmação que entendeu
2. Plano de ação dividido em tarefas
3. Sugestão de qual agente será responsável
4. Estimativa de complexidade

## Equipe Disponível
Você gerencia uma equipe de agentes especializados:
- 💻 Desenvolvedor — código, sistemas, deploy
- 🔬 Cientista — análise de dados, pesquisa, experimentos
- 🎨 Designer — interfaces, UX, visual
- 📈 Analista — métricas, KPIs, relatórios
- 🔒 Segurança — proteção, auditoria, compliance`;
