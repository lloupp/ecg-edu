# ECG Edu — persistência de aprendizagem

Data: 2026-10-03. Branch: `feat/postgres-learning-runtime-20261003`.

## Base e auditoria

- `main`: `cf643c681776d44cc5841982623baf8d6af68625`.
- Fundação educacional: `0a007d8323d8d8b6655d75a1c908440b51c6e2d8`, PR #10 aberta, CI 37122198105 verde.
- PR #8 aberta com conflito; caches compilados ainda estavam versionados. Este ciclo remove esses caches e desativa incremental na API. Não fez merge da PR #8 nem alterou sua branch.
- Frontend: Next.js 15.5.24/React 19.2.8, shell extenso em um componente. ECGs com proporção preservada; zoom/pan e e2e de interface continuam pendentes.
- Backend: NestJS 11.2.6, validação global, CORS configurado; serviços usavam singleton global. Login mock aceita perfil do cliente; APIs de casos, usuários, aprendizagem e aulas não possuem autenticação real.
- PostgreSQL existia apenas como schema/SQL; nenhum runtime, runner de migrations ou teste de repository.
- Casos-semente: três SVGs didáticos, referências e interpretação estruturada. Referência não equivale a aprovação clínica; não há revisão especialista comprovada, versionamento editorial ou upload seguro.
- Treino expõe resposta e explicação antes da tentativa. Histórico/progresso confiam em `userId`. Isso é um bloqueio para produção, a corrigir junto da autenticação e contratos de apresentação.
- Não há configuração de deploy de API/DB, backup ou observabilidade no repositório. Não há evidência de credenciais de staging disponíveis neste ciclo.

## Escopo concluído

1. Contratos `UsersRepository`, `CasesRepository`, `LearningRepository`, injetados pelo Nest. Adapter em memória preserva o modo existente. PostgreSQL é escolhido por `DATABASE_URL`, sem fallback.
2. Repositório PostgreSQL relacional para usuários, casos, perguntas e tentativas. Pool com timeouts e encerramento no lifecycle; SQL parametrizado, colunas dinâmicas vindas de whitelist estática.
3. Motor de aprendizagem separado do singleton e reutilizado por ambos os adapters. Progresso, revisão de erros e repetição espaçada calculados sobre tentativas persistentes. No PostgreSQL, rotação estável entre requisições; somente casos publicados e não arquivados são treináveis.
4. Criação/edição de caso e pergunta em transação. Serialização de tentativas por usuário com row lock; leituras de progresso/revisão em snapshot consistente.
5. Arquivamento lógico no PostgreSQL. Perguntas e tentativas permanecem preservadas, inclusive resultados históricos. Casos indisponíveis não entram nas revisões agendadas.
6. Explicação da tentativa preservada como snapshot. O backfill legado usa a explicação atual porque o sistema anterior não guardava versões.
7. Remover referências de um caso publicado o devolve a `pending_review`, mesmo quando o PATCH omite `status`; proteção testada nos dois adapters.
8. Runner transacional com advisory lock, ledger e checksum. Seed explícito de desenvolvimento, com UUIDs estáveis e `ON CONFLICT DO NOTHING`.
9. API bloqueada em `NODE_ENV=production` enquanto identidade/permissões/revisão não estiverem prontas. Aulas ao vivo indisponíveis no modo PostgreSQL; capability endpoint e UI comunicam a limitação.

## Migrações

- `000_initial.sql`: baseline legado, criado somente em instalação vazia. Schema legado completo é adotado; schema parcial é rejeitado em transação.
- `001_learning_foundation.sql`: existente e preservada, acrescenta metadados e backfill de aprendizagem.
- `002_runtime_persistence.sql`: `clinical_cases.archived_at`, `training_attempts.explanation_snapshot`, backfill e índice de casos ativos.
- `003_attempt_order.sql`: ordem de inserção monotônica para desempatar timestamps. Empates legados não permitem reconstruir a ordem original.
- Nenhuma migration remove tabelas, recria o banco, apaga usuários ou apaga tentativas. `schema.sql` acompanha instalações novas.
- A memória demonstrativa nunca foi durável. Não há exportação/migração automática de um processo de demonstração já em execução.

## Verificação

- Instalação limpa, audit de produção, typecheck, testes unitários/e2e e build executados localmente.
- 27 testes unitários/e2e passam (23 existentes + 4 novos).
- Audit de produção: zero vulnerabilidades. Audit completo: 32 alertas altos no tooling, propagados de `braces <=3.0.3`. Registry observado não oferece patch compatível; sem `audit fix --force`, sem downgrade de proteções e sem esconder o audit.
- Suíte PostgreSQL dedicada cobre migração nova/legada/partial, seed idempotente, rollback, isolamento entre usuários na leitura de repositório, reconexão, concorrência, publicação, arquivamento, rotação e runtime Nest.
- PostgreSQL local não inicia neste executor: apenas UID 0 está mapeado e não é possível criar usuário não root. Integração real no GitHub Actions com PostgreSQL 16 passou no primeiro commit (9/9 testes, CI 37124505368). Review posterior adicionou teste de desempate de timestamps; resultado final registrado na PR.
- Smoke de UI bloqueado neste executor: `agent-browser` não inicia e downloads de Chrome/Chromium falham por certificado/arquivo incompleto. Servidores frontend/API iniciaram, porém isso não conta como verificação visual. CI desta etapa cobre REST e persistência; não equivale a revisão de acessibilidade ou clínica especializada.

## Riscos e P0 restantes

- Login é mock e armazenamento do usuário no frontend é demonstrativo. Não usar dados de pacientes/alunos reais ou expor esta API publicamente.
- AuthService ainda retorna token mock; não valida identidade. IDs/roles/autoria/revisores continuam controlados pelo cliente. RBAC/ownership e rate limit/audit log são o próximo bloqueio principal.
- Workflow permanece `published | pending_review`. Referências são presença de metadados; não comprovam revisão, direitos ou desidentificação. Nenhum conteúdo clínico novo foi criado neste ciclo.
- Aulas ao vivo permanecem em memória somente no modo demonstrativo; não há integração híbrida com casos PostgreSQL.
- Histórico guarda resultado, competências e explicação, mas não a versão completa do caso/pergunta. Edição de conteúdo ainda deve evoluir para versionamento formal.
- Projeções de aprendizagem carregam conteúdo e tentativas do usuário; para grandes volumes, adicionar paginação/queries de agregação e avaliação de desempenho.
- LGPD: políticas de retenção/exportação/exclusão, consentimento e isolamento institucional ainda precisam ser implementados e revisados.
- Sem merge/deploy até resolver bloqueadores de segurança e clínicos exigidos. `main` permanece intacta.

## Próximo objetivo

Autenticação real com sessões expirantes e revogáveis, identidade derivada no servidor, RBAC/ownership testados e remoção de respostas/explicações dos payloads de treino antes da tentativa. Depois, revisão clínica versionada e staging com PostgreSQL, backup e smoke de interface.
