import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, Injectable, NotFoundException } from '@nestjs/common';
import { LiveSession } from '@ecg-edu/shared';
import { presentQuestion } from '../../data/question-presentation';
import { runtimeConfig } from '../../data/runtime-config';
import { db } from '../../data/in-memory.db';
import { AnswerSessionDto, StartSessionDto } from './live.dto';

@Injectable()
export class LiveService {
  private requireDemoLive() {
    if (!runtimeConfig().liveEnabled) throw new ServiceUnavailableException('Aulas ao vivo indisponíveis no modo PostgreSQL até persistência e autorização próprias.');
  }

  private currentQuestion(session: LiveSession) {
    const question = db.currentQuestion(session);
    if (!question) return undefined;
    return presentQuestion(question, `live:${session.id}:${question.id}`);
  }

  list() {
    if (!runtimeConfig().liveEnabled) return [];
    return db.listSessions().map((session) => ({
      ...session,
      currentQuestion: this.currentQuestion(session),
    }));
  }

  start(payload: StartSessionDto) {
    this.requireDemoLive();
    const session = db.startSession(payload.teacherId, payload.title, payload.questionIds);
    return {
      ...session,
      currentQuestion: this.currentQuestion(session),
    };
  }

  join(code: string, name: string) {
    this.requireDemoLive();
    const session = db.findSessionByCode(code);
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.participants.some((participant) => participant.name === name)) {
      throw new ConflictException('Participante já entrou nesta sessão');
    }
    const updated = db.joinSession(code, name)!;
    return { ...updated, currentQuestion: this.currentQuestion(updated) };
  }

  activate(code: string, teacherId: string) {
    this.requireDemoLive();
    const session = db.findSessionByCode(code);
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Apenas o professor dono pode iniciar a rodada');
    if (session.status !== 'lobby') throw new BadRequestException('Rodada já iniciada ou sessão finalizada');
    const updated = db.activateSession(code)!;
    return { ...updated, currentQuestion: this.currentQuestion(updated) };
  }

  answer(code: string, payload: AnswerSessionDto) {
    this.requireDemoLive();
    const existing = db.findSessionByCode(code);
    if (!existing) throw new NotFoundException('Sessão não encontrada');
    if (existing.status !== 'active') throw new BadRequestException('A rodada não está ativa');
    if (existing.answers[payload.participantId] !== undefined) {
      throw new ConflictException('Resposta já registrada para esta rodada');
    }
    const session = db.submitAnswer(code, payload.participantId, payload.answer)!;
    return { ...session, currentQuestion: this.currentQuestion(session) };
  }

  advance(code: string, teacherId: string) {
    this.requireDemoLive();
    const session = db.findSessionByCode(code);
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.teacherId !== teacherId) throw new ForbiddenException('Apenas o professor dono pode avançar a pergunta');
    if (session.status !== 'active') throw new BadRequestException('Sessão não está ativa');
    const updated = db.advanceSession(code)!;
    return { ...updated, currentQuestion: this.currentQuestion(updated) };
  }
}
