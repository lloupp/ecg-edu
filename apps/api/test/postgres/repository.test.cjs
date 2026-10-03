const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { migrate } = require('../../../../scripts/db-migrate.cjs');
const { seed, seedId } = require('../../../../scripts/db-seed.cjs');
const { PostgresRepository } = require('../../dist/data/repositories/postgres.repository');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');

// Explicit opt-in dedicated database, with an isolated test schema. Never use DATABASE_URL as fallback.
if (!process.env.PG_TEST_URL) throw new Error('PG_TEST_URL must point to a dedicated test database');
const admin = new Pool({ connectionString: process.env.PG_TEST_URL });
const schema = `ecg_test_${randomUUID().replaceAll('-', '')}`;
const legacySchema = `${schema}_legacy`;
const partialSchema = `${schema}_partial`;
function scoped(name) {
  const url = new URL(process.env.PG_TEST_URL);
  url.searchParams.set('options', `-c search_path=${name}`);
  return url.toString();
}
const url = scoped(schema);
let repository;
const root = resolve(__dirname, '../../../..');
before(async () => {
  for (const name of [schema, legacySchema, partialSchema]) await admin.query(`CREATE SCHEMA "${name}"`);
  await migrate(url);
  process.env.DB_SEED_CONFIRM = 'development';
  await seed(url);
  repository = new PostgresRepository(url);
  await repository.onModuleInit();
});
after(async () => {
  if (repository) await repository.onModuleDestroy();
  // Only randomly named schemas created by this test are removed; existing schemas/data are untouched.
  for (const name of [schema, legacySchema, partialSchema]) await admin.query(`DROP SCHEMA "${name}" CASCADE`);
  await admin.end();
});
const casePayload = (teacher) => ({
  title: 'Teste de persistência', ecgImageUrl: '/ecgs/ecg-af.svg', clinicalDescription: 'Ilustração didática',
  diagnosis: 'Resposta de teste', explanation: 'Explicação original', level: 'basic', tags: ['teste'],
  createdBy: teacher, status: 'published', ecgImageKind: 'schematic',
  references: [{ title: 'Fonte de teste, sem conteúdo clínico novo', organization: 'Teste', url: 'https://example.org/test' }], competencies: ['rhythm'],
});

test('migration and development seed are repeatable and preserve existing rows', async () => {
  const teacher = seedId('u-teacher-1');
  const created = await repository.createCase({ ...casePayload(teacher), title: "Literal '; DROP TABLE users; --" });
  await migrate(url);
  await seed(url);
  assert.ok((await repository.listCases()).some((c) => c.id === created.id && c.title.includes('DROP TABLE')));
  assert.equal((await repository.listUsers()).length, 3);
  assert.equal(Number((await repository.pool.query('SELECT COUNT(*) FROM ecg_schema_migrations')).rows[0].count), 4);
});

test('existing legacy schema and history are migrated without recreation', async () => {
  const pool = new Pool({ connectionString: scoped(legacySchema) });
  try {
    await pool.query(readFileSync(resolve(root, 'database/postgresql/migrations/000_initial.sql'), 'utf8'));
    const u = randomUUID(), c = randomUUID(), q = randomUUID(), a = randomUUID();
    await pool.query("INSERT INTO users(id,name,email,role,institution,specialty) VALUES($1,'Legacy','legacy@example.org','student','Teste','Teste')", [u]);
    await pool.query("INSERT INTO clinical_cases(id,title,ecg_image_url,clinical_description,diagnosis,explanation,level,created_by) VALUES($1,'Legacy','/ecgs/ecg-af.svg','Teste','Teste','Explicação preservada','basic',$2)", [c,u]);
    await pool.query("INSERT INTO live_questions(id,case_id,prompt,options,correct_answer) VALUES($1,$2,'Teste','[]','Teste')", [q,c]);
    await pool.query("INSERT INTO training_attempts(id,user_id,question_id,selected_answer,is_correct) VALUES($1,$2,$3,'Teste',true)", [a,u,q]);
    await migrate(scoped(legacySchema));
    const attempt = (await pool.query('SELECT * FROM training_attempts WHERE id=$1', [a])).rows[0];
    assert.equal(attempt.case_id, c);
    assert.equal(attempt.explanation_snapshot, 'Explicação preservada');
    assert.ok(attempt.next_review_at);
    assert.equal(Number((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count), 1);
  } finally { await pool.end(); }
});

test('partial legacy schema is rejected without altering its data', async () => {
  const pool = new Pool({ connectionString: scoped(partialSchema) });
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    await pool.query('INSERT INTO users VALUES(42)');
    await assert.rejects(migrate(scoped(partialSchema)), /Partial existing schema/);
    assert.deepEqual((await pool.query('SELECT * FROM users')).rows, [{ id: 42 }]);
    assert.equal((await pool.query("SELECT to_regclass('ecg_schema_migrations') AS ledger")).rows[0].ledger, null);
  } finally { await pool.end(); }
});

test('attempt, feedback, progress and error review survive closing and reopening the repository', async () => {
  const student = seedId('u-student-1');
  const question = seedId('q-af');
  const attempt = await repository.evaluateTraining(question, 'Resposta incorreta', student);
  assert.equal(attempt.isCorrect, false);
  await repository.onModuleDestroy();
  repository = new PostgresRepository(url);
  await repository.onModuleInit();
  const progress = await repository.learningProgress(student);
  assert.equal(progress.totalAttempts, 1);
  assert.equal(progress.competencies.find((c) => c.code === 'rhythm').attempts, 1);
  assert.equal((await repository.reviewErrors(student))[0].lastAttempt.id, attempt.id);
  assert.equal((await repository.reviewErrors(student))[0].lastAttempt.explanation, attempt.explanation);
  const other = await repository.login('other-student@example.org', 'student');
  assert.equal((await repository.learningProgress(other.id)).totalAttempts, 0);
});

test('concurrent correct answers serialize spaced repetition intervals without lost attempts', async () => {
  const student = await repository.login('concurrent@example.org', 'student');
  const attempts = await Promise.all([1,2,3].map(() => repository.evaluateTraining(seedId('q-af'), 'Fibrilação atrial', student.id)));
  assert.deepEqual(attempts.map((a) => Math.round((Date.parse(a.nextReviewAt)-Date.parse(a.answeredAt))/86400000)).sort((a,b) => a-b), [1,3,7]);
  assert.equal((await repository.learningProgress(student.id)).totalAttempts, 3);
});

test('latest attempt follows insertion order when timestamps are equal', async () => {
  const student = await repository.login('timestamp-tie@example.org', 'student');
  const question = seedId('q-af');
  await repository.evaluateTraining(question, 'Incorreta', student.id);
  await repository.evaluateTraining(question, 'Fibrilação atrial', student.id);
  await repository.pool.query("UPDATE training_attempts SET created_at='2026-10-03T00:00:00Z' WHERE user_id=$1", [student.id]);
  assert.equal((await repository.reviewErrors(student.id)).length, 0);
  assert.equal((await repository.learningProgress(student.id)).accuracy, 50);
});

test('failed question insert rolls back the corresponding case', async () => {
  await repository.pool.query("CREATE FUNCTION reject_test_question() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.prompt LIKE '%rollback-sentinel%' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$");
  await repository.pool.query('CREATE TRIGGER reject_test_question BEFORE INSERT ON live_questions FOR EACH ROW EXECUTE FUNCTION reject_test_question()');
  await assert.rejects(repository.createCase({ ...casePayload(seedId('u-teacher-1')), title: 'rollback-sentinel' }), /test rollback/);
  assert.equal((await repository.listCases()).filter((c) => c.title === 'rollback-sentinel').length, 0);
});

test('publication is revoked on reference removal; pending and archived cases cannot be trained', async () => {
  const c = await repository.createCase(casePayload(seedId('u-teacher-1')));
  const student = seedId('u-student-1');
  await repository.evaluateTraining(c.liveQuestionId, c.diagnosis, student);
  const prior = (await repository.learningProgress(student)).totalAttempts;
  const update = await repository.updateCase(c.id, { references: [] });
  assert.equal(update.status, 'pending_review');
  assert.equal(await repository.evaluateTraining(c.liveQuestionId, c.diagnosis, student), undefined);
  assert.equal(await repository.deleteCase(c.id), true);
  assert.equal(await repository.deleteCase(c.id), false);
  assert.equal((await repository.learningProgress(student)).totalAttempts, prior);
  assert.ok(!(await repository.listCases()).some((item) => item.id === c.id));
});

test('training rotation stays stable across independent requests', async () => {
  const ids = [];
  for (let i=0; i<4; i++) ids.push((await repository.nextTrainingQuestion(i)).question.id);
  assert.notEqual(ids[0], ids[1]);
  assert.equal((await repository.nextTrainingQuestion(0)).question.id, ids[0]);
});

test('Nest runtime uses PostgreSQL for login, cases, attempts and progress', async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url;
  let app;
  try {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'runtime@example.org', role: 'student' });
    assert.equal(login.status, 201);
    const answer = await request(app.getHttpServer()).post('/api/training/answer').send({ questionId: seedId('q-af'), selectedAnswer: 'Fibrilação atrial', userId: login.body.user.id });
    assert.equal(answer.status, 201);
    const progress = await request(app.getHttpServer()).get(`/api/training/progress?userId=${login.body.user.id}`);
    assert.equal(progress.body.totalAttempts, 1);
    assert.equal((await repository.learningProgress(login.body.user.id)).totalAttempts, 1);
    const live = await request(app.getHttpServer()).post('/api/live/sessions').send({ teacherId: seedId('u-teacher-1'), title: 'Aula', questionIds: [] });
    assert.equal(live.status, 503);
  } finally {
    if (app) await app.close();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});
