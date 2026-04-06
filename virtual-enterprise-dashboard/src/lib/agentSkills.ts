/* ==========================================================================
   AGENT SKILLS — Registry de habilidades
   ========================================================================== */

import { SkillId, AgentRole } from './agentTypes';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  category: 'management' | 'technical' | 'creative' | 'analytical';
}

export const SKILLS: SkillDefinition[] = [
  {
    id: 'team-management',
    name: 'Gestão de Equipe',
    icon: '📋',
    description: 'Gerenciar membros, delegar tarefas e monitorar progresso',
    category: 'management',
  },
  {
    id: 'web-search',
    name: 'Pesquisa Web',
    icon: '🌐',
    description: 'Pesquisar informações na internet em tempo real',
    category: 'technical',
  },
  {
    id: 'code-review',
    name: 'Review de Código',
    icon: '💻',
    description: 'Analisar código, encontrar bugs e sugerir melhorias',
    category: 'technical',
  },
  {
    id: 'data-analysis',
    name: 'Análise de Dados',
    icon: '📊',
    description: 'Processar dados, encontrar padrões e gerar insights',
    category: 'analytical',
  },
  {
    id: 'report-writing',
    name: 'Relatórios',
    icon: '📝',
    description: 'Escrever relatórios, documentação e sumários executivos',
    category: 'creative',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: '💡',
    description: 'Gerar ideias criativas e soluções inovadoras',
    category: 'creative',
  },
  {
    id: 'project-planning',
    name: 'Planejamento',
    icon: '🗂️',
    description: 'Criar cronogramas, roadmaps e planos de execução',
    category: 'management',
  },
  {
    id: 'security-audit',
    name: 'Auditoria de Segurança',
    icon: '🔒',
    description: 'Analisar vulnerabilidades e recomendar proteções',
    category: 'technical',
  },
];

/** Skills recomendadas por cargo */
export const RECOMMENDED_SKILLS: Record<AgentRole, SkillId[]> = {
  'Gerente': ['team-management', 'project-planning', 'report-writing', 'brainstorm'],
  'Desenvolvedor': ['code-review', 'web-search', 'brainstorm'],
  'Cientista': ['data-analysis', 'report-writing', 'web-search'],
  'Designer': ['brainstorm', 'web-search', 'report-writing'],
  'Analista': ['data-analysis', 'report-writing', 'project-planning'],
  'Segurança': ['security-audit', 'code-review', 'report-writing'],
};

/** System prompts pré-prontos por cargo */
export const ROLE_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  'Gerente': '', // Usa MANAGER_SYSTEM_PROMPT
  'Desenvolvedor': `Você é um Desenvolvedor Sênior da New Holding Ltda.
Especialidades: escrever código limpo, arquitetar sistemas, fazer code review, debugar problemas.
Fale em português brasileiro. Seja técnico mas acessível. Use exemplos de código quando relevante.
Quando receber uma tarefa, quebre em passos técnicos e indique tecnologias.`,
  'Cientista': `Você é um Cientista de Dados da New Holding Ltda.
Especialidades: análise estatística, machine learning, visualização de dados, experimentação A/B.
Fale em português brasileiro. Seja analítico e baseado em evidências.
Quando receber uma tarefa, proponha hipóteses e métodos de validação.`,
  'Designer': `Você é um Designer de Produto da New Holding Ltda.
Especialidades: UI/UX design, design systems, prototipagem, pesquisa com usuários.
Fale em português brasileiro. Pense na experiência do usuário em primeiro lugar.
Quando receber uma tarefa, proponha wireframes e fluxos de interação.`,
  'Analista': `Você é um Analista de Negócios da New Holding Ltda.
Especialidades: métricas, KPIs, análise competitiva, relatórios executivos.
Fale em português brasileiro. Seja objetivo e orientado a resultados.
Quando receber uma tarefa, identifique métricas-chave e benchmarks.`,
  'Segurança': `Você é um Especialista em Segurança da New Holding Ltda.
Especialidades: cybersecurity, compliance, auditoria, LGPD, pen testing.
Fale em português brasileiro. Seja cauteloso e detalhista.
Quando receber uma tarefa, identifique riscos e proponha mitigações.`,
};

export function getSkill(id: SkillId): SkillDefinition | undefined {
  return SKILLS.find(s => s.id === id);
}

export function getSkillNames(ids: SkillId[]): string {
  return ids.map(id => getSkill(id)?.name || id).join(', ');
}
