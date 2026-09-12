import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('ECG Edu API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/cases retorna os casos-semente', async () => {
    const res = await request(app.getHttpServer()).get('/api/cases');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  it('POST /api/auth/login retorna usuário e token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'marina@ecgedu.com', role: 'teacher' });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^mock-token-/);
    expect(res.body.user.email).toBe('marina@ecgedu.com');
  });

  it('GET /api/training/question retorna pergunta e caseData', async () => {
    const res = await request(app.getHttpServer()).get('/api/training/question?index=0');
    expect(res.status).toBe(200);
    expect(res.body.question).toBeDefined();
    expect(res.body.caseData).toBeDefined();
  });

  it('rejeita (403) ativar sessão de professor que não é o dono', async () => {
    const start = await request(app.getHttpServer())
      .post('/api/live/sessions')
      .send({ teacherId: 'u-teacher-1', title: 'Aula', questionIds: ['q-af'] });
    expect(start.status).toBe(201);
    const code = start.body.code;

    const res = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/activate`)
      .send({ teacherId: 'intruso' });
    expect(res.status).toBe(403);
  });

  it('impede pontuação indevida em /live/sessions/:code/answer (rodada não ativa e resposta duplicada)', async () => {
    const start = await request(app.getHttpServer())
      .post('/api/live/sessions')
      .send({ teacherId: 'u-teacher-1', title: 'Aula', questionIds: ['q-af'] });
    const code = start.body.code;

    const join = await request(app.getHttpServer()).post(`/api/live/sessions/${code}/join`).send({ name: 'Aluno' });
    const participantId = join.body.participants.find((p: { name: string }) => p.name === 'Aluno').id;

    const beforeActivation = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(beforeActivation.status).toBe(400);

    await request(app.getHttpServer()).post(`/api/live/sessions/${code}/activate`).send({ teacherId: 'u-teacher-1' });

    const firstAnswer = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(firstAnswer.status).toBe(201);
    expect(firstAnswer.body.participants.find((p: { id: string }) => p.id === participantId).score).toBe(100);

    const repeatedAnswer = await request(app.getHttpServer())
      .post(`/api/live/sessions/${code}/answer`)
      .send({ participantId, answer: 'Fibrilação atrial' });
    expect(repeatedAnswer.status).toBe(409);

    const sessions = await request(app.getHttpServer()).get('/api/live/sessions');
    const current = sessions.body.find((s: { code: string }) => s.code === code);
    expect(current.participants.find((p: { id: string }) => p.id === participantId).score).toBe(100);
  });
});
