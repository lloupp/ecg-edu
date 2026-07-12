import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../data/in-memory.db';
import { AnswerSessionDto, StartSessionDto } from './live.dto';

@Injectable()
export class LiveService {
  list() {
    return db.listSessions().map((session) => ({
      ...session,
      currentQuestion: db.currentQuestion(session),
    }));
  }

  start(payload: StartSessionDto) {
    const session = db.startSession(payload.teacherId, payload.title, payload.questionIds);
    return {
      ...session,
      currentQuestion: db.currentQuestion(session),
    };
  }

  join(code: string, name: string) {
    const session = db.findSessionByCode(code);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (session.participants.some((participant) => participant.name === name)) {
      throw new ConflictException('Participante já entrou nesta sessão');
    }
    const updated = db.joinSession(code, name)!;
    return {
      ...updated,
      currentQuestion: db.currentQuestion(updated),
    };
  }

  activate(code: string, teacherId: string) {
    const session = db.findSessionByCode(code);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (session.teacherId !== teacherId) {
      throw new ForbiddenException('Apenas o professor dono pode iniciar a rodada');
    }
    if (session.status === 'finished') {
      throw new BadRequestException('Sessão já finalizada');
    }
    const updated = db.activateSession(code)!;
    return {
      ...updated,
      currentQuestion: db.currentQuestion(updated),
    };
  }

  answer(code: string, payload: AnswerSessionDto) {
    const session = db.submitAnswer(code, payload.participantId, payload.answer);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return {
      ...session,
      currentQuestion: db.currentQuestion(session),
    };
  }

  advance(code: string, teacherId: string) {
    const session = db.findSessionByCode(code);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (session.teacherId !== teacherId) {
      throw new ForbiddenException('Apenas o professor dono pode avançar a pergunta');
    }
    if (session.status !== 'active') {
      throw new BadRequestException('Sessão não está ativa');
    }
    const updated = db.advanceSession(code)!;
    return {
      ...updated,
      currentQuestion: db.currentQuestion(updated),
    };
  }
}
