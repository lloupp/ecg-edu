import { Injectable, NotFoundException } from '@nestjs/common';
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
    const session = db.joinSession(code, name);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return {
      ...session,
      currentQuestion: db.currentQuestion(session),
    };
  }

  activate(code: string) {
    const session = db.activateSession(code);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return {
      ...session,
      currentQuestion: db.currentQuestion(session),
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

  advance(code: string) {
    const session = db.advanceSession(code);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return {
      ...session,
      currentQuestion: db.currentQuestion(session),
    };
  }
}
