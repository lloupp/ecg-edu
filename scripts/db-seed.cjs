// Explicit development-only seed. Existing records are never updated or removed.
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { casesSeed, questionsSeed, usersSeed } = require('../apps/api/dist/data/mock-data');
function seedId(value) {
  const hex = createHash('sha256').update(`ecg-edu-development:${value}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
async function seed(connectionString) {
  if (process.env.NODE_ENV === 'production' || process.env.DB_SEED_CONFIRM !== 'development') {
    throw new Error('Seed requires DB_SEED_CONFIRM=development and a non-production environment');
  }
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of usersSeed) {
      await client.query('INSERT INTO users(id,name,email,role,institution,specialty) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [seedId(u.id),u.name,u.email,u.role,u.institution,u.specialty]);
    }
    for (const c of casesSeed) {
      const owner = usersSeed.find((u) => u.id === c.createdBy);
      // Resolve by email to preserve installations where an account already exists under another UUID.
      const result = await client.query('SELECT id FROM users WHERE email=$1', [owner.email]);
      await client.query(`INSERT INTO clinical_cases(id,title,ecg_image_url,clinical_description,diagnosis,explanation,level,tags,created_by,status,
        ecg_image_kind,image_source,learning_objectives,competencies,differential_diagnoses,interpretation,clinical_references)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT DO NOTHING`,
        [seedId(c.id),c.title,c.ecgImageUrl,c.clinicalDescription,c.diagnosis,c.explanation,c.level,c.tags,result.rows[0].id,c.status,
          c.ecgImageKind,c.imageSource,c.learningObjectives,c.competencies,c.differentialDiagnoses,JSON.stringify(c.interpretation),JSON.stringify(c.references)]);
    }
    for (const q of questionsSeed) {
      await client.query('INSERT INTO live_questions(id,case_id,prompt,options,correct_answer) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [seedId(q.id),seedId(q.caseId),q.prompt,JSON.stringify(q.options),q.correctAnswer]);
    }
    await client.query('COMMIT');
    console.log('Development seed completed; existing records preserved.');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
module.exports = { seed, seedId };
if (require.main === module) seed(process.env.DATABASE_URL).catch(() => {
  console.error('Development seed failed; no changes committed. Check configuration without logging credentials.');
  process.exitCode = 1;
});
