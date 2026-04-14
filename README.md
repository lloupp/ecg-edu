# ECG Edu

Plataforma web educacional para ensino de cardiologia baseada em casos reais de ECG.

## Estrutura

- `apps/web`: frontend Next.js + Tailwind com interface interativa.
- `apps/api`: backend NestJS com API REST e dados mockados em memória preparados para futura persistência em PostgreSQL.
- `packages/shared`: tipos compartilhados entre frontend e backend.
- `database/postgresql/schema.sql`: modelo relacional inicial para migração da persistência mock para PostgreSQL.

## Requisitos

- Node.js 22+
- npm 10+

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Ou, se quiser subir separado:

```bash
npm run dev:api
npm run dev:web
```

Frontend: `http://localhost:3000`
API: `http://localhost:4000/api`

## Validação

```bash
npm run build
npm run typecheck
```

## Evolução para PostgreSQL

A camada de dados no backend está isolada em `apps/api/src/data/in-memory.db.ts`. O próximo passo natural é substituir esse arquivo por repositórios Nest conectados ao PostgreSQL usando Prisma ou TypeORM, preservando contratos, DTOs e tipos compartilhados.
