const { randomBytes, randomUUID, scryptSync } = require('node:crypto');
const { Pool } = require('pg');

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', COST, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64url'), key.toString('base64url')].join('$');
}

async function provision() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.AUTH_PROVISION_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_PROVISION_PASSWORD ?? '';
  const role = process.env.AUTH_PROVISION_ROLE?.trim() || 'student';
  const name = process.env.AUTH_PROVISION_NAME?.trim() || email?.split('@')[0] || 'ECG Edu User';

  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!email || !email.includes('@')) throw new Error('AUTH_PROVISION_EMAIL is required');
  if (password.length < 12 || password.length > 128) throw new Error('AUTH_PROVISION_PASSWORD must contain 12-128 characters');
  if (!['student', 'teacher'].includes(role)) throw new Error('AUTH_PROVISION_ROLE must be student or teacher');

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    const passwordHash = hashPassword(password);
    const existing = await pool.query('SELECT id, role FROM users WHERE lower(email)=lower($1) LIMIT 1', [email]);
    if (existing.rowCount) {
      await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1', [existing.rows[0].id, passwordHash]);
      console.log(`Credential provisioned for existing ${existing.rows[0].role} account: ${email}`);
      return;
    }

    await pool.query(
      `INSERT INTO users(id,name,email,role,institution,specialty,password_hash)
       VALUES($1,$2,$3,$4::user_role,'Comunidade ECG Edu','Aprendizagem em ECG',$5)`,
      [randomUUID(), name, email, role, passwordHash],
    );
    console.log(`Account provisioned with role ${role}: ${email}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  provision().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Provisioning failed');
    process.exitCode = 1;
  });
}

module.exports = { provision, hashPassword };
