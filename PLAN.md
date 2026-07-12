# Plano de Evolução — Fase 2 (requer infra: PostgreSQL)

Este documento detalha os itens do plano que **não são executáveis no ambiente atual
(Termux sem PostgreSQL/Docker instalado)**. A Fase 1 (correções de robustez e testes)
já foi implementada e validada. Aqui está o roteiro para a fundação de produção.

## Pré-requisitos de infra

- Instalar PostgreSQL no Termux: `pkg install postgresql` e inicializar com
  `pg_ctl -D $PREFIX/var/lib/postgresql initdb` + `pg_ctl -D $PREFIX/var/lib/postgresql -l logfile start`
  (alternativa: `docker-compose up -d postgres`, se o Docker estiver disponível).
- Criar banco: `createdb ecg_edu` (credenciais em `.env`, ver `.env.example`).

## F6 — Persistência PostgreSQL (substituir `in-memory.db.ts`)

**Objetivo:** a API sobrevive a reinícios e deploy. O `database/postgresql/schema.sql`
já está modelado; falta o `DataSource` + repositórios.

Passos:
1. Adicionar `prisma` (ou TypeORM) + cliente ao `apps/api`.
2. `schema.prisma`/entidades espelhando `schema.sql` (users, clinical_cases,
   live_questions, live_sessions, session_participants, session_answers,
   training_attempts). **Decisão de ID: manter UUID em tudo** (coerente com o schema
   e com o frontend que espera `string`).
3. Criar repositórios Nest que implementem a mesma superfície de `InMemoryDatabase`
   (listUsers, listCases, createCase, startSession, joinSession, activateSession,
   advanceSession, submitAnswer, nextTrainingQuestion, evaluateTraining, metrics).
4. Migration inicial a partir de `schema.sql`; seed idempotente
   (`INSERT ... ON CONFLICT DO NOTHING`) em script separado (`npm run db:seed`),
   **não** auto-executado no boot.
5. `DataSource` injetado via `APP_MODULE`/`ConfigModule`; `InMemoryDatabase` permanece
   como fallback opcional atrás de flag de env (`USE_IN_MEMORY`).

Critérios de aceitação:
- `npm run db:migrate` cria as tabelas; `npm run db:seed` popula sem violar unique.
- Reiniciar a API **não** perde usuários/casos/sessões.
- `npm run test:e2e` passa contra o Postgres de teste.

Riscos/gotchas:
- **Cascade**: `onDelete: CASCADE` em respostas/participantes; `SET NULL` onde o
  histórico deve persistir. Testar `DELETE` em dev.
- **Transações**: `activateSession`/respostas precisam `@Transactional()` (ou
  `DataSource.transaction`) — testar concorrência (2 professores ativando mesma sessão).
- **Timezone**: banco em UTC; frontend formata com `Intl.DateTimeFormat`.
- **Termux + volumes**: preferir *named volume* no `docker-compose`; se bind-mount no
  host, ajustar permissão do diretório.

## F7 — Autenticação real (JWT + bcrypt + AuthGuard)

**Objetivo:** fechar rotas sensíveis e validar identidade de fato.

Passos:
1. `AuthService.login` passa a validar senha com `bcrypt` (custo ≥ 10) e emitir JWT
   assinado (`JWT_SECRET` em `.env`).
2. `JwtStrategy` + `AuthGuard` (`@nestjs/jwt`, `@nestjs/passport`).
3. Proteger rotas: criar/editar/excluir caso, métricas, e ações de sessão do professor
   (activate/next) — substituindo o `teacherId` vindo do body por `req.user.id`.
4. Migrar usuários-semente para terem senha (hash no seed).

Critérios de aceitação:
- `POST /auth/login` retorna JWT; rotas protegidas sem `Authorization: Bearer` → 401.
- Token expirado/inválido → 401.
- Teste e2e: login → usa token → acessa rota protegida.

## F8 — WebSocket (substituir polling)

**Objetivo:** "aula ao vivo" com push em tempo real.

Passos:
1. `LiveGateway` (Socket.io/`@nestjs/websockets`) emite `question:activated`,
   `question:next`, `ranking:updated`.
2. Frontend (`platform-shell.tsx`) ouve eventos e remove o `refreshAll` por clique.
3. Manter fallback de polling para reconexão.

Critérios de aceitação:
- 2 abas (prof + aluno): ao professor clicar "Ativar", o aluno recebe a pergunta
  instantaneamente.

Ordem recomendada: **F6 → F7 → F8** (fundação antes de realtime).
