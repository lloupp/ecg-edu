import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LiveService } from '../../src/modules/live/live.service';
import { db } from '../../src/data/in-memory.db';

describe('LiveService (F2)', () => {
  let service: LiveService;

  beforeEach(() => {
    service = new LiveService();
  });

  it('permite que o professor dono ative e avance a sessão', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    expect(() => service.activate(session.code, 'u-teacher-1')).not.toThrow();
    expect(() => service.advance(session.code, 'u-teacher-1')).not.toThrow();
  });

  it('rejeita ativar a sessão de um professor que não é o dono', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    expect(() => service.activate(session.code, 'outro-professor')).toThrow(ForbiddenException);
  });

  it('rejeita avançar uma sessão que não está ativa', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    expect(() => service.advance(session.code, 'u-teacher-1')).toThrow(BadRequestException);
  });

  it('rejeita entrada duplicada de participante', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    service.join(session.code, 'Aluno');
    expect(() => service.join(session.code, 'Aluno')).toThrow(ConflictException);
  });

  it('rejeita responder antes de o professor ativar a rodada (lobby)', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    const joined = service.join(session.code, 'Aluno');
    const participantId = joined.participants.find((p) => p.name === 'Aluno')!.id;
    expect(() => service.answer(session.code, { participantId, answer: 'Fibrilação atrial' })).toThrow(
      BadRequestException,
    );
  });

  it('rejeita responder mais de uma vez na mesma rodada, mesmo com resposta correta', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    const joined = service.join(session.code, 'Aluno');
    const participantId = joined.participants.find((p) => p.name === 'Aluno')!.id;
    service.activate(session.code, 'u-teacher-1');

    service.answer(session.code, { participantId, answer: 'Fibrilação atrial' });
    expect(() => service.answer(session.code, { participantId, answer: 'Fibrilação atrial' })).toThrow(
      ConflictException,
    );

    const score = db.findSessionByCode(session.code)!.participants.find((p) => p.id === participantId)!.score;
    expect(score).toBe(100);
  });

  it('permite responder novamente na rodada seguinte após o professor avançar', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af', 'q-stemi']);
    const joined = service.join(session.code, 'Aluno');
    const participantId = joined.participants.find((p) => p.name === 'Aluno')!.id;
    service.activate(session.code, 'u-teacher-1');
    service.answer(session.code, { participantId, answer: 'Fibrilação atrial' });

    service.advance(session.code, 'u-teacher-1');
    expect(() =>
      service.answer(session.code, { participantId, answer: 'Ativar protocolo de reperfusão' }),
    ).not.toThrow();

    const score = db.findSessionByCode(session.code)!.participants.find((p) => p.id === participantId)!.score;
    expect(score).toBe(200);
  });

  it('rejeita reativar uma rodada já ativa, impedindo repontuar a mesma pergunta', () => {
    const session = db.startSession('u-teacher-1', 'Aula', ['q-af']);
    const joined = service.join(session.code, 'Aluno');
    const participantId = joined.participants.find((p) => p.name === 'Aluno')!.id;
    service.activate(session.code, 'u-teacher-1');
    service.answer(session.code, { participantId, answer: 'Fibrilação atrial' });

    expect(() => service.activate(session.code, 'u-teacher-1')).toThrow(BadRequestException);

    const score = db.findSessionByCode(session.code)!.participants.find((p) => p.id === participantId)!.score;
    expect(score).toBe(100);
  });
});
