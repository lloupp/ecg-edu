import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthRepository } from '../../src/data/repositories/repositories';
import { hashPassword } from '../../src/modules/auth/password';

const password = 'Frase longa para teste 2026!';
const payload = { title: 'Exemplo do autor', ecgImageUrl: '/ecgs/ecg-af.svg', clinicalDescription: 'Cenário fictício',
  diagnosis: 'Resposta de teste', explanation: 'Explicação didática', level: 'basic', tags: ['teste'], status: 'published', references: [] };

describe('authenticated ECG Edu API', () => {
  let app: INestApplication;
  let student: ReturnType<typeof request.agent>, teacher: ReturnType<typeof request.agent>, otherTeacher: ReturnType<typeof request.agent>;
  let studentId: string, teacherId: string, caseId: string;
  let cookie: string;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    student = request.agent(app.getHttpServer()); teacher = request.agent(app.getHttpServer()); otherTeacher = request.agent(app.getHttpServer());
    const repository = app.get(AuthRepository);
    const hash = await hashPassword(password);
    for (const [email, client] of [['teacher-auth@example.org', teacher], ['other-teacher-auth@example.org', otherTeacher]] as const) {
      const user = await repository.createAccount({ id: randomUUID(), email, name: 'Professor de teste', role: 'teacher', institution: 'Teste', specialty: 'Teste' }, hash);
      if (client === teacher) teacherId = user.id;
      expect((await client.post('/api/auth/login').send({ email, password })).status).toBe(201);
    }
    const registration = await student.post('/api/auth/register').send({ email: 'student-auth@example.org', password, name: 'Aluno de teste' });
    expect(registration.status).toBe(201); studentId = registration.body.user.id;
    cookie = registration.headers['set-cookie'][0].split(';')[0];
    expect(registration.body.token).toBeUndefined();
    expect(registration.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(registration.headers['set-cookie'][0]).toContain('SameSite=Strict');
  });
  afterAll(async () => { await app.close(); });

  it('protects all private routes and rejects mock bearer tokens', async () => {
    for (const path of ['/cases', '/users', '/dashboard/metrics', '/training/question', '/training/progress', '/training/review', '/live/sessions', '/auth/me']) {
      expect((await request(app.getHttpServer()).get(`/api${path}`).set('Authorization', 'Bearer mock-token-u-teacher-1')).status).toBe(401);
    }
    expect((await request(app.getHttpServer()).get('/api/platform/capabilities')).body.authentication).toBe('session_cookie');
  });
  it('refuses arbitrary roles, seed account takeover, weak passwords and wrong credentials', async () => {
    expect((await request(app.getHttpServer()).post('/api/auth/register').send({ email: 'attacker@example.org', name: 'Teste', password, role: 'teacher' })).status).toBe(400);
    expect((await request(app.getHttpServer()).post('/api/auth/register').send({ email: 'marina@ecgedu.com', name: 'Teste', password })).status).toBe(409);
    expect((await request(app.getHttpServer()).post('/api/auth/register').send({ email: 'weak@example.org', name: 'Teste', password: 'curta' })).status).toBe(400);
    const wrong = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'student-auth@example.org', password: 'Uma senha completamente errada' });
    expect(wrong.status).toBe(401);
    expect((await student.get('/api/auth/me')).body.user.role).toBe('student');
  });
  it('hides answer and interpretation before submission, including the student library', async () => {
    const question = await student.get('/api/training/question?index=0');
    expect(question.status).toBe(200); expect(question.body.question.correctAnswer).toBeUndefined();
    for (const key of ['diagnosis', 'explanation', 'interpretation', 'differentialDiagnoses', 'references', 'learningObjectives']) expect(question.body.caseData[key]).toBeUndefined();
    expect(question.body.caseData.title).toBe('Caso de ECG');
    const cases = await student.get('/api/cases');
    expect(cases.status).toBe(200);
    expect(cases.body.every((c: { diagnosis?: string; status: string }) => c.diagnosis === undefined && c.status === 'published')).toBe(true);
    const users = await student.get('/api/users');
    expect(users.body.map((u: { id: string }) => u.id)).toEqual([studentId]);
  });
  it('records the authenticated student and refuses forged identity in every learning route', async () => {
    expect((await student.get('/api/training/progress?userId=u-student-1')).status).toBe(403);
    expect((await student.get('/api/training/review?userId=u-student-1')).status).toBe(403);
    expect((await student.get('/api/training/question?userId=u-student-1')).status).toBe(403);
    expect((await student.post('/api/training/answer').send({ questionId: 'q-af', selectedAnswer: 'Fibrilação atrial', userId: 'u-student-1' })).status).toBe(403);
    const answer = await student.post('/api/training/answer').send({ questionId: 'q-af', selectedAnswer: 'resposta incorreta' });
    expect(answer.status).toBe(201); expect(answer.body.userId).toBe(studentId);
    expect(answer.body.caseData.diagnosis).toBe('Fibrilação atrial com resposta ventricular rápida');
    const progress = await student.get('/api/training/progress');
    expect(progress.body.totalAttempts).toBe(1);
    expect((await student.get('/api/training/review')).body).toHaveLength(1);
  });
  it('enforces teacher role and authorship for creation, update and deletion', async () => {
    expect((await student.post('/api/cases').send(payload)).status).toBe(403);
    expect((await teacher.post('/api/cases').send({ ...payload, createdBy: studentId })).status).toBe(403);
    const created = await teacher.post('/api/cases').send(payload);
    expect(created.status).toBe(201); caseId = created.body.id;
    expect(created.body.createdBy).toBe(teacherId); expect(created.body.status).toBe('pending_review');
    expect((await student.patch(`/api/cases/${caseId}`).send({ title: 'Alteração indevida' })).status).toBe(403);
    expect((await otherTeacher.patch(`/api/cases/${caseId}`).send({ title: 'Alteração indevida' })).status).toBe(403);
    expect((await otherTeacher.delete(`/api/cases/${caseId}`)).status).toBe(403);
    expect((await teacher.patch(`/api/cases/${caseId}`).send({ createdBy: studentId })).status).toBe(400);
    expect((await teacher.patch(`/api/cases/${caseId}`).send({ reviewedBy: teacherId })).status).toBe(400);
    expect((await teacher.patch(`/api/cases/${caseId}`).send({ title: 'Atualização do autor' })).status).toBe(200);
    expect((await teacher.delete(`/api/cases/${caseId}`)).status).toBe(200);
  });
  it('rejects cross-origin mutations and keeps all live routes unavailable', async () => {
    expect((await student.post('/api/auth/logout').set('Origin', 'https://attacker.example')).status).toBe(403);
    expect((await request(app.getHttpServer()).post('/api/auth/login').set('Origin', 'https://attacker.example').send({ email: 'student-auth@example.org', password })).status).toBe(403);
    for (const path of ['/live/sessions', '/live/sessions/ABC/join', '/live/sessions/ABC/activate', '/live/sessions/ABC/answer', '/live/sessions/ABC/next']) expect((await teacher.post(`/api${path}`).send({})).status).toBe(503);
    expect((await teacher.get('/api/live/sessions')).body).toEqual([]);
  });
  it('revokes the server session at logout and restores identity through a fresh login', async () => {
    expect((await student.post('/api/auth/logout')).status).toBe(201);
    expect((await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect((await student.post('/api/auth/login').send({ email: 'STUDENT-AUTH@example.org', password })).status).toBe(201);
    expect((await student.get('/api/auth/me')).body.user.id).toBe(studentId);
  });
  it('limits repeated authentication attempts', async () => {
    let last = 0;
    for (let i=0;i<11;i++) last = (await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'absent-rate-test@example.org', password })).status;
    expect(last).toBe(429);
  });
});
