import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { db } from '../../src/data/in-memory.db';

describe('ECG Edu API (e2e)', () => {
  let app: INestApplication;
  let studentToken: string;
  let studentId: string;
  const studentEmail = 'e2e.student@example.org';
  const studentPassword = 'EcgEdu-Test-2026!';

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Aluno E2E', email: studentEmail, password: studentPassword });
    expect(registered.status).toBe(201);
    studentToken = registered.body.token;
    studentId = registered.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('protege recursos e resolve a identidade pela sessão', async () => {
    expect((await request(app.getHttpServer()).get('/api/cases')).status).toBe(401);

    const me = await request(app.getHttpServer()).get('/api/auth/me').set(auth(studentToken));
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(studentId);
    expect(me.body.role).toBe('student');
    expect(me.body.passwordHash).toBeUndefined();

    const cases = await request(app.getHttpServer()).get('/api/cases').set(auth(studentToken));
    expect(cases.status).toBe(403);
  });

  it('não autentica com senha incorreta', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: studentEmail, password: 'Senha-incorreta-2026!' });
    expect(res.status).toBe(401);
  });

  it('não expõe gabarito nem feedback clínico antes da tentativa', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/training/question?index=0')
      .set(auth(studentToken));
    expect(res.status).toBe(200);
    expect(res.body.question.correctAnswer).toBeUndefined();
    expect(res.body.caseData.diagnosis).toBeUndefined();
    expect(res.body.caseData.explanation).toBeUndefined();
    expect(res.body.caseData.interpretation).toBeUndefined();
    expect(res.body.caseData.references).toBeUndefined();
    expect(Array.isArray(res.body.question.options)).toBe(true);
  });

  it('registra treino somente para o usuário autenticado e libera feedback depois da resposta', async () => {
    const question = await request(app.getHttpServer())
      .get('/api/training/question?index=0')
      .set(auth(studentToken));

    const injectedIdentity = await request(app.getHttpServer())
      .post('/api/training/answer')
      .set(auth(studentToken))
      .send({ questionId: question.body.question.id, selectedAnswer: 'resposta incorreta', userId: 'u-student-2' });
    expect(injectedIdentity.status).toBe(400);

    const answer = await request(app.getHttpServer())
      .post('/api/training/answer')
      .set(auth(studentToken))
      .send({ questionId: question.body.question.id, selectedAnswer: 'resposta incorreta' });
    expect(answer.status).toBe(201);
    expect(answer.body.attempt.userId).toBe(studentId);
    expect(answer.body.attempt.isCorrect).toBe(false);
    expect(answer.body.feedback.diagnosis).toBeDefined();
    expect(answer.body.feedback.explanation).toBeDefined();

    const progress = await request(app.getHttpServer()).get('/api/training/progress').set(auth(studentToken));
    expect(progress.status).toBe(200);
    expect(progress.body.userId).toBe(studentId);
    expect(progress.body.totalAttempts).toBeGreaterThanOrEqual(1);

    const review = await request(app.getHttpServer()).get('/api/training/review').set(auth(studentToken));
    expect(review.status).toBe(200);
    expect(Array.isArray(review.body)).toBe(true);
  });

  it('aplica RBAC e autoria derivada do servidor no CRUD de casos', async () => {
    const payload = {
      title: 'Caso de autorização',
      ecgImageUrl: '/ecgs/ecg-af.svg',
      clinicalDescription: 'Descrição didática',
      diagnosis: 'Diagnóstico didático',
      explanation: 'Explicação',
      level: 'basic',
      tags: ['teste'],
      status: 'published',
      references: [],
    };

    const denied = await request(app.getHttpServer())
      .post('/api/cases')
      .set(auth(studentToken))
      .send(payload);
    expect(denied.status).toBe(403);

    const teacherEmail = 'e2e.teacher@example.org';
    const teacherPassword = 'Teacher-Test-2026!';
    const registeredTeacher = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Professor E2E', email: teacherEmail, password: teacherPassword });
    const teacher = db.users.find((item) => item.id === registeredTeacher.body.user.id)!;
    teacher.role = 'teacher';
    const teacherToken = registeredTeacher.body.token;

    const forged = await request(app.getHttpServer())
      .post('/api/cases')
      .set(auth(teacherToken))
      .send({ ...payload, createdBy: studentId });
    expect(forged.status).toBe(400);

    const created = await request(app.getHttpServer())
      .post('/api/cases')
      .set(auth(teacherToken))
      .send(payload);
    expect(created.status).toBe(201);
    expect(created.body.createdBy).toBe(teacher.id);
    expect(created.body.status).toBe('pending_review');

    const otherEmail = 'e2e.teacher2@example.org';
    const other = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Professor Dois', email: otherEmail, password: 'Teacher-Two-2026!' });
    db.users.find((item) => item.id === other.body.user.id)!.role = 'teacher';

    const forbiddenEdit = await request(app.getHttpServer())
      .patch(`/api/cases/${created.body.id}`)
      .set(auth(other.body.token))
      .send({ title: 'Tentativa de alteração' });
    expect(forbiddenEdit.status).toBe(403);
  });

  it('revoga a sessão no logout', async () => {
    const account = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Logout Test', email: 'logout@example.org', password: 'Logout-Test-2026!' });
    const token = account.body.token;

    expect((await request(app.getHttpServer()).get('/api/auth/me').set(auth(token))).status).toBe(200);
    expect((await request(app.getHttpServer()).post('/api/auth/logout').set(auth(token))).status).toBe(201);
    expect((await request(app.getHttpServer()).get('/api/auth/me').set(auth(token))).status).toBe(401);
  });

  it('mantém proteção de ownership e resposta duplicada no modo live demonstrativo', async () => {
    const start = await request(app.getHttpServer())
      .post('/api/live/sessions')
      .send({ teacherId: 'u-teacher-1', title: 'Aula', questionIds: ['q-af'] });
    expect(start.status).toBe(201);
    expect(start.body.currentQuestion.correctAnswer).toBeUndefined();
    const code = start.body.code;

    const intruder = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/activate`)
      .send({ teacherId: 'intruso' });
    expect(intruder.status).toBe(403);

    const join = await request(app.getHttpServer()).post(`/api/live/sessions/${code}/join`).send({ name: 'Aluno Live' });
    const participantId = join.body.participants.find((p: { name: string }) => p.name === 'Aluno Live').id;

    const beforeActivation = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(beforeActivation.status).toBe(400);

    await request(app.getHttpServer()).post(`/api/live/sessions/${code}/activate`).send({ teacherId: 'u-teacher-1' });

    const firstAnswer = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(firstAnswer.status).toBe(201);

    const repeatedAnswer = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(repeatedAnswer.status).toBe(409);
  });
});
