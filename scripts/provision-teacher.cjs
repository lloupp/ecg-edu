const { randomUUID } = require('node:crypto');
const { PostgresRepository } = require('../apps/api/dist/data/repositories/postgres.repository');
const { hashPassword } = require('../apps/api/dist/modules/auth/password');

// Operator-only development command. Password arrives on stdin, never via argv or logged output.
async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.DB_AUTH_CONFIRM !== 'development') throw new Error('Use DB_AUTH_CONFIRM=development em um banco de desenvolvimento.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatória.');
  let input = '';
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error('Entrada excessiva.'); }
  let payload;
  try { payload = JSON.parse(input); } catch { throw new Error('Forneça JSON válido no stdin.'); }
  const { email, name, password } = payload;
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || typeof password !== 'string' || password.length < 15 || password.length > 128) throw new Error('E-mail/nome inválidos ou senha fora de 15 a 128 caracteres.');
  const repository = new PostgresRepository(process.env.DATABASE_URL);
  try {
    await repository.onModuleInit();
    await repository.createAccount({ id: randomUUID(), email: email.trim().toLowerCase(), name: name.trim(), role: 'teacher', institution: 'Comunidade ECG Edu', specialty: 'Ensino de ECG' }, await hashPassword(password));
    console.log('Conta de professor criada.');
  } finally { await repository.onModuleDestroy(); }
}
main().catch(() => { console.error('Conta não criada. Verifique a confirmação de desenvolvimento, conexão, migrations e entrada JSON (nome, email e senha de 15 a 128 caracteres); e-mails existentes não podem ser reaproveitados.'); process.exitCode = 1; });
