const { Pool } = require('pg');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');

async function migrate(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 60000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('ecg-edu-migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS ecg_schema_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const directory = resolve(__dirname, '../database/postgresql/migrations');
    for (const name of readdirSync(directory).filter((file) => /^\d+_.*\.sql$/.test(file)).sort()) {
      const sql = readFileSync(resolve(directory, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const applied = await client.query('SELECT checksum FROM ecg_schema_migrations WHERE name=$1', [name]);
      if (applied.rowCount) {
        if (applied.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      // Adopt an existing legacy schema only when ALL expected base tables exist.
      // No DROP, TRUNCATE, recreation or seed is used for adoption.
      let adopted = false;
      if (name === '000_initial.sql') {
        const tables = ['users', 'clinical_cases', 'live_questions', 'live_sessions', 'session_participants', 'session_answers', 'training_attempts'];
        const found = await client.query('SELECT name,to_regclass(name) AS relation FROM unnest($1::text[]) name', [tables]);
        const count = found.rows.filter((row) => row.relation !== null).length;
        if (count && count !== tables.length) throw new Error('Partial existing schema: review manually before migration');
        adopted = count === tables.length;
      }
      if (!adopted) await client.query(sql);
      await client.query('INSERT INTO ecg_schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
      console.log(`${adopted ? 'Adopted' : 'Applied'} ${name}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}
module.exports = { migrate };
if (require.main === module) {
  migrate(process.env.DATABASE_URL).catch(() => {
    console.error('Migration failed; no changes committed. Check schema and connectivity without logging credentials.');
    process.exitCode = 1;
  });
}
