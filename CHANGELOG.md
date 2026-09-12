# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [0.2.1] - 2026-09-12
### Corrigido
- Integridade de pontuação na aula ao vivo: `POST /live/sessions/:code/answer` agora rejeita respostas
  fora da rodada ativa (lobby/finalizada) e respostas repetidas do mesmo participante na mesma rodada,
  eliminando a inflação de pontuação por reenvio.
- `POST /live/sessions/:code/activate` agora só é aceito a partir do estado `lobby`, impedindo que o
  professor reative uma rodada já ativa e zere as respostas de uma pergunta já pontuada (reabrindo a
  pontuação para a mesma pergunta).
- Frontend: oculta as opções de resposta fora da rodada ativa/já respondida e desabilita "Iniciar rodada"
  fora do estado `lobby`; mensagens de erro da API agora exibem o texto real em vez do corpo JSON bruto.

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
