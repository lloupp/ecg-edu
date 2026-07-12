# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [0.2.0] - 2026-07-12
### Adicionado
- Testes unitários (services/db) e e2e (fluxo crítico) com Jest + supertest.
- `PLAN.md` com o roteiro da Fase 2 (PostgreSQL, autenticação real, WebSocket).

### Corrigido
- `tsconfig` da API apontando `@ecg-edu/shared` para o código-fonte, corrigindo o `typecheck` quebrado.
- `createCase` agora expõe `liveQuestionId`, removendo o mapa hardcoded `questionIdByCase` do frontend.
- Validação de dono e de estado na aula ao vivo (activate/next exigem o professor dono; join rejeita duplicados; máquina de estados).
- Quiz de treino embaralha perguntas e compara respostas ignorando caixa/espaços.
- Métrica `activeStudents` contando apenas sessões não finalizadas.

## [0.1.0] - 2026-04-14
### Adicionado
- Projeto inicial versionado
- Documentação básica (README, LICENSE, CONTRIBUTING)
