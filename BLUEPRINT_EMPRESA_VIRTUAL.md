# BLUEPRINT EXECUTIVO: Sistema de Empresa Virtual com Agentes Autônomos

## 1. EXECUTIVE SUMMARY
Este documento apresenta o blueprint executivo para a criação de um sistema de empresa virtual inovador, focado na simulação e estudo de comportamentos de agentes autônomos. A visão central é estabelecer um ecossistema digital onde "Cientistas Virtuais" (agentes supervisores) possam planejar e executar experimentos, enquanto "Pessoas Virtuais" (agentes executores) vivem, aprendem e evoluem dentro de regras e cenários customizados. O objetivo principal é desenvolver um Produto Mínimo Viável (MVP) em 2 a 3 meses.

## 2. VISÃO DO SISTEMA
O sistema de empresa virtual será um ambiente dinâmico e interativo:
*   **Cientistas (Agentes Supervisores):** Planejam experimentos e observam pessoas.
*   **Pessoas Virtuais (Agentes Executores):** Vivem, aprendem e evoluem sob a influência de LLMs e regras predefinidas.
*   **Crítico (Agente Validador):** Monitora todas as ações para garantir conformidade ética e científica (evitando alucinações).

## 3. STACK TECNOLÓGICO
*   **Orquestrador:** Google Antigravity
*   **Framework de Agentes:** LangChain + LangGraph
*   **Execução Durável:** Temporal
*   **Motor de Regras:** JSONLogic ou Drools
*   **Memória Vetorial:** Chroma / Pinecone
*   **Dashboard Web:** React/Next.js + SSE
*   **Observabilidade:** OpenTelemetry + LangSmith

## 4. ESTRUTURA BASE (Responsabilidade: Antigravity / Otávio)
As principais funções a serem codificadas nesta fase incluem:
1. `createScientist(name, specialization)`
2. `createVirtualPerson(name, traits)`
3. `proposeExperiment(scientist, virtualPerson, action)`
4. `validateWithCritic(proposal)`
5. `executeAction(virtualPerson, action)`
6. `streamToClient(event)`

## Endpoints (via MCP):
- `POST /scientists`
- `POST /virtual-persons`
- `POST /experiments`
- `GET /experiments/:id/stream`
- `GET /agents/:id/memory`
- `PUT /rules`

**Divisão da Próxima Fase:**
*   **Otávio (Antigravity):** Estrutura base de agentes, endpoints via Langchain e Dashboard Next.js (com SSE).
*   **Iago (Backend):** Servidor MCP de infraestrutura (Chroma, Temporal, CI/CD).
