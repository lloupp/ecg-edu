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
- histórico de respostas em memória;
- revisão de erros;
- repetição espaçada inicial;
- domínio por competência;
- sessões ao vivo.

Os ECGs SVG incluídos no repositório são **ilustrações didáticas**, não traçados clínicos de pacientes.

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

A API ainda usa `InMemoryDatabase` em runtime. O schema e a migração de fundação estão preparados, mas a substituição por repositories PostgreSQL continua sendo requisito P0 antes de uso real.

Não execute migrações diretamente em produção sem backup, staging e teste de rollback.
