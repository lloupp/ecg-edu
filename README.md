# ECG Edu

Plataforma educacional para treinamento estruturado em interpretação de ECG.

> **Uso exclusivamente educacional.** O ECG Edu não é ferramenta de diagnóstico, prescrição ou tomada de decisão assistencial e não substitui avaliação profissional.

## Estrutura

- `apps/web`: frontend Next.js + Tailwind.
- `apps/api`: backend NestJS REST.
- `packages/shared`: tipos compartilhados.
- `database/postgresql/schema.sql`: schema para instalação PostgreSQL nova.
- `database/postgresql/migrations`: migrações incrementais.
- `docs/AUDIT-2026-10-03.md`: auditoria técnica, clínica e roadmap.

## Experiência educacional atual

- biblioteca de casos didáticos;
- dificuldade básica, intermediária e avançada;
- interpretação estruturada por frequência, ritmo, eixo, intervalos, ondas e segmentos;
- diagnóstico provável e diferenciais;
- contexto clínico e feedback;
- referências por caso;
- histórico de respostas persistente quando `DATABASE_URL` está configurada;
- revisão de erros;
- repetição espaçada inicial;
- domínio por competência;
- autenticação por senha com sessões expiráveis e revogáveis;
- RBAC e ownership no CRUD de casos;
- treino sem exposição de gabarito antes da resposta;
- sessões ao vivo no modo de demonstração em memória.

Os ECGs SVG incluídos no repositório são **ilustrações didáticas**, não traçados clínicos de pacientes.

## Requisitos

- Node.js 22+
- npm 10+

## Instalação

```bash
npm ci
```

## Desenvolvimento

```bash
npm run dev
```

Frontend: `http://localhost:3000`  
API: `http://localhost:4000/api`

## Validação

```bash
npm run typecheck
npm test
npm run build
# ou
npm run check
```

## Autenticação

O registro público cria somente contas de aluno. Papéis docentes não são escolhidos pelo cliente. Contas docentes existentes ou novas devem ser provisionadas por um operador autorizado:

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecg_edu
export AUTH_PROVISION_EMAIL=docente@example.org
export AUTH_PROVISION_PASSWORD='uma-senha-forte-com-12-ou-mais-caracteres'
export AUTH_PROVISION_ROLE=teacher
npm run auth:provision
```

A API usa tokens opacos aleatórios; apenas o hash do token é salvo em `auth_sessions`. As sessões expiram e podem ser revogadas por logout. O frontend mantém o token em `sessionStorage` durante esta fase; antes de exposição pública, a topologia de deploy deve ser revisada para cookies HttpOnly/SameSite ou mecanismo equivalente, além de rate limiting e auditoria de autenticação.

## PostgreSQL

A API seleciona repositories PostgreSQL quando `DATABASE_URL` está configurada. Sem essa variável, mantém o modo demonstrativo em memória. Falha de conexão ou schema incompleto interrompe a inicialização; nunca há fallback silencioso para memória.

As variáveis devem ser exportadas no shell: a API e os scripts não carregam `.env` automaticamente.

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecg_edu
npm run db:migrate
# Opcional, exclusivamente em um banco de desenvolvimento:
DB_SEED_CONFIRM=development npm run db:seed
npm run dev
```

O runner cria instalações novas ou adota um schema legado completo, aplica migrations em transação e registra checksums. Não altera linhas existentes durante o seed. Casos removidos são arquivados, preservando perguntas e tentativas. Migrações e seed nunca são executados automaticamente ao iniciar a API.

Para testes reais de repositório, use um banco dedicado:

```bash
PG_TEST_URL=postgresql://postgres:postgres@localhost:5432/ecg_edu_test npm run test:postgres
```

O CI executa essa suíte com PostgreSQL 16. Ela cria e remove apenas schemas aleatórios exclusivos do teste. Nunca aponte `PG_TEST_URL` para um banco de produção.

**Ainda não está pronto para produção:** autenticação por senha, sessões revogáveis e RBAC/ownership já existem para os fluxos persistentes, mas revisão clínica formal, rate limiting, auditoria de autenticação, política institucional/LGPD e hardening de deploy continuam P0. A API ainda recusa inicializar com `NODE_ENV=production`. Aulas ao vivo seguem demonstrativas em memória e ficam indisponíveis no modo PostgreSQL até receberem persistência e autorização próprias. Consulte [a revisão de persistência](docs/POSTGRES-RUNTIME-2026-10-03.md) e [a revisão de autenticação](docs/AUTH-RBAC-2026-10-03.md).

Não execute migrações diretamente em produção sem backup, staging e teste de rollback.
