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
});
