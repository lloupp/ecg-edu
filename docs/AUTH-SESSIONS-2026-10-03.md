# Autenticação, permissões e apresentação do treino — 2026-10-03

## Comportamento implementado

- Cadastro cria somente alunos. Login exige senha; o payload não seleciona perfil.
- Senhas usam scrypt (N=32768, r=8, p=3), salt aleatório de 16 bytes e comparação constante. Fontes: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html e https://nodejs.org/docs/latest-v22.x/api/crypto.html.
- Sessões opacas usam 32 bytes aleatórios, validade de oito horas e revogação no logout. Apenas SHA-256 do token é armazenado; o cookie é HttpOnly, SameSite Strict, Path=/api e Secure quando AUTH_COOKIE_SECURE=true. Nenhum token aparece no JSON ou localStorage.
- Guard global protege todas as rotas por padrão. Login/cadastro/capabilities são públicos. Escritas rejeitam Origin não autorizado e Sec-Fetch-Site cross-site.
- Alunos recebem somente seu perfil, casos publicados sem resposta/explicação, e seu próprio progresso. IDs enviados para ler/gravar progresso de terceiros são rejeitados.
- Professores criam casos com identidade da sessão; update/delete exigem autoria. O cliente não pode transferir autoria nem afirmar revisão clínica através de reviewedBy/lastReviewedAt.
- Perguntas do treino omitem correctAnswer, diagnóstico, interpretação, diferenciais, referências e objetivos antecipados. Título/prompt são neutros e opções são embaralhadas. Feedback completo é retornado após a resposta; revisão de erros é limitada à conta autenticada.
- Aulas ao vivo por HTTP retornam indisponível até sua migração. O motor legado permanece isolado para testes; nenhuma rota pública o aciona.

## Banco e operadores

Migration 004 cria user_credentials e auth_sessions com índices de expiração/usuário e unicidade de e-mail sem distinção de caixa. A criação de conta/credencial é transacional. Contas antigas/semente não recebem senha e não podem ser reivindicadas; docentes novos são provisionados via comando de operador, por stdin. A migration falha sem alterar o banco se houver e-mails legados duplicados por caixa, exigindo resolução explícita pelo operador. Não há seed de senha padrão ou migração automática no startup.

Sem PostgreSQL, credenciais/sessões são temporárias. Com PostgreSQL, sessões válidas e credenciais sobrevivem ao restart; sessões expiradas são negadas e removidas nas próximas criações de sessão.

## Validação

Testes da API cobrem mock token, origem indevida, elevação de perfil, apropriação de contas-semente, consulta/escrita de progresso de terceiros, edição/exclusão por outro professor, campos editoriais forjados, logout e limite de tentativas. Testes PostgreSQL cobrem persistência, expiry, revogação e unicidade normalizada. O teste de navegador usa frontend real + API, testa cadastro, cookie, treino, progresso, logout, erro de senha e novo login; uma identidade localStorage forjada é ignorada.

A demo estática mantém testes próprios em desktop e celular. Esta branch de autenticação não publica sua API nem substitui automaticamente a branch da demo.

## Pendências de lançamento

NODE_ENV=production continua bloqueado. Faltam revisão clínica formal, confirmação/recuperação de contas, política de auditoria de acesso e limites distribuídos. O limite atual de login/cadastro é por processo: 10 chamadas por e-mail e 30 por IP em cinco minutos, com mapa limitado. Não há alegação de autenticação institucional, SSO ou operação clínica pronta.
