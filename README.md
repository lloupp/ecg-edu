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

**Ainda não está pronto para produção:** o login continua mock, RBAC/ownership não estão implementados, e a revisão clínica formal é P0. A API recusa inicializar com `NODE_ENV=production`. Aulas ao vivo ficam indisponíveis no modo PostgreSQL até receberem persistência e autenticação próprias. Consulte [a revisão deste ciclo](docs/POSTGRES-RUNTIME-2026-10-03.md).

Não execute migrações diretamente em produção sem backup, staging e teste de rollback.
