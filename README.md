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
- autenticação por senha e sessão; aulas ao vivo aguardam migração de identidade e persistência.

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

A API seleciona repositories PostgreSQL quando `DATABASE_URL` está configurada. Sem essa variável, usa armazenamento temporário em memória; contas e sessões somem após reiniciar. Falha de conexão ou schema incompleto interrompe a inicialização; nunca há fallback silencioso para memória.

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

**Ainda não está pronto para produção:** a API agora verifica senhas, sessões e permissões por perfil/autoria. A revisão clínica formal, verificação/recuperação de contas e limites distribuídos de autenticação continuam pendentes. A API recusa inicializar com `NODE_ENV=production`. Aulas ao vivo ficam indisponíveis em todos os modos da API até receberem persistência e vínculo dos participantes à identidade autenticada. Consulte [o ciclo PostgreSQL](docs/POSTGRES-RUNTIME-2026-10-03.md) e [o ciclo de autenticação](docs/AUTH-SESSIONS-2026-10-03.md).

Não execute migrações diretamente em produção sem backup, staging e teste de rollback.

## Demo pública no GitHub Pages

A demo é um export estático independente da API e do PostgreSQL. Usa exclusivamente exemplos fictícios e ilustrações SVG, oferece os perfis de aluno/professor e salva as alterações no navegador. Não tem autenticação real nem aulas ao vivo. O botão **Reiniciar demo** restaura os exemplos.

```bash
npm run build:demo
npx playwright install chromium
npm run test:demo
```

O workflow `.github/workflows/pages-demo.yml` testa a demo em desktop/celular e publica `apps/web/out` a partir de `feat/pages-product-demo-20261003`, sem exigir merge na `main`. Para a primeira publicação, configure **Settings → Pages → Build and deployment → Source: GitHub Actions** e use **Re-run failed jobs** na execução existente do workflow **Public product demo** dessa branch. Se o ambiente `github-pages` restringir branches, permita a branch da demo em **Settings → Environments → github-pages**.

Endereço esperado após um deploy bem-sucedido: `https://lloupp.github.io/ecg-edu/`. O workflow publica apenas o frontend estático, nunca a API, credenciais ou banco. Os ECGs e o conteúdo demonstrativo ainda aguardam revisão especialista; este endereço apresenta o produto, não um serviço clínico.

## Contas e sessões de desenvolvimento

O cadastro público cria **somente alunos** e exige uma senha de 15 a 128 caracteres. O login usa e-mail/senha; o perfil vem do banco. As identidades-semente não têm senha e não podem ser reivindicadas pelo cadastro. A demo do Pages continua com os dois perfis fictícios, sem autenticação real.

Para criar um novo professor como operador, após configurar PostgreSQL e executar as migrations:

```bash
DB_AUTH_CONFIRM=development npm run auth:teacher < /caminho/seguro/conta.json
```

O JSON deve conter `name`, `email` e `password`. Envie uma senha própria por stdin a partir de uma fonte protegida, sem colocá-la em argumentos ou histórico do shell. O comando não altera contas existentes e não imprime senha ou token.

O frontend restaura a identidade em `/auth/me`, usa cookie HttpOnly/SameSite Strict e revoga a sessão em `/auth/logout`; o token nunca vai para localStorage. Configure frontend e API no mesmo site (por exemplo, `localhost` em ambos, evitando misturar `localhost` e `127.0.0.1`). Para staging em HTTPS, configure `AUTH_COOKIE_SECURE=true`; `CORS_ORIGINS` deve conter as origens exatas autorizadas. Requisições de escrita de origens não autorizadas são rejeitadas.

Alunos consultam e registram apenas seu próprio progresso. Professores criam casos e alteram/excluem apenas os de sua autoria. O endpoint de treino não inclui gabarito ou interpretação antes da resposta; a biblioteca do aluno mostra somente a apresentação dos casos publicados.

```bash
npm run build
npx playwright install chromium
npm run test:auth:web
```
