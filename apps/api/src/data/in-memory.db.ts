import { randomUUID } from 'crypto';
import {
  ClinicalCase,
  DashboardMetrics,
  LiveQuestion,
  LiveSession,
  SessionParticipant,
  TrainingAttempt,
  UserProfile,
  UserRole,
} from '@ecg-edu/shared';
import { casesSeed, questionsSeed, usersSeed } from './mock-data';

export class InMemoryDatabase {
  users: UserProfile[] = structuredClone(usersSeed);
  cases: ClinicalCase[] = structuredClone(casesSeed);
  questions: LiveQuestion[] = structuredClone(questionsSeed);
  sessions: LiveSession[] = [];
  private trainingOrder: string[] | null = null;

  login(email: string, role: UserRole): UserProfile {
    const normalized = email.trim().toLowerCase();
    const existing = this.users.find((user) => user.email.toLowerCase() === normalized);
    if (existing) {
      if (existing.role !== role) {
        throw new Error(`Este e-mail já está vinculado ao perfil ${existing.role === 'teacher' ? 'professor' : 'aluno'}.`);
      }
      return existing;
    }

    const name = normalized.split('@')[0].replace(/\./g, ' ');
    const created: UserProfile = {
      id: randomUUID(),
      name: name.replace(/\b\w/g, (char) => char.toUpperCase()),
      email: normalized,
      role,
      institution: 'Comunidade ECG Edu',
      specialty: role === 'teacher' ? 'Cardiologia' : 'Aprendiz em cardiologia',
    };
    this.users.push(created);
    return created;
  }

  listUsers(): UserProfile[] {
    return this.users;
  }

  listCases(): ClinicalCase[] {
    return this.cases;
  }

  createCase(payload: Omit<ClinicalCase, 'id'>): ClinicalCase {
    const questionId = randomUUID();
    const created: ClinicalCase = { ...payload, id: randomUUID(), liveQuestionId: questionId };
    this.cases.unshift(created);
    this.questions.push({
      id: questionId,
      caseId: created.id,
      prompt: `Qual o melhor diagnóstico para o caso ${created.title}?`,
      options: [created.diagnosis, 'Pericardite aguda', 'Taquicardia sinusal', 'ECG normal'],
      correctAnswer: created.diagnosis,
    });
    return created;
  }

  updateCase(id: string, payload: Partial<Omit<ClinicalCase, 'id'>>): ClinicalCase | undefined {
    const current = this.cases.find((item) => item.id === id);
    if (!current) {
      return undefined;
    }
    Object.assign(current, payload);
    return current;
  }

  deleteCase(id: string): boolean {
    const before = this.cases.length;
    this.cases = this.cases.filter((item) => item.id !== id);
    this.questions = this.questions.filter((item) => item.caseId !== id);
    return this.cases.length < before;
  }

  metrics(): DashboardMetrics {
    const activeStudents = this.sessions
      .filter((session) => session.status !== 'finished')
      .flatMap((session) => session.participants)
      .filter((participant) => participant.role === 'student').length;
    return {
      totalCases: this.cases.length,
      liveSessions: this.sessions.filter((session) => session.status !== 'finished').length,
      publishedCases: this.cases.filter((item) => item.status === 'published').length,
      pendingCases: this.cases.filter((item) => item.status === 'pending_review').length,
      activeStudents,
    };
  }

  startSession(teacherId: string, title: string, questionIds: string[]): LiveSession {
    const resolvedQuestionIds = questionIds.length ? questionIds : this.questions.map((item) => item.id);
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const teacher = this.users.find((user) => user.id === teacherId);
    const teacherParticipant: SessionParticipant = {
      id: teacherId,
      name: teacher?.name ?? 'Professor',
      role: 'teacher',
      score: 0,
    };
    const session: LiveSession = {
      id: randomUUID(),
      code,
      teacherId,
      title,
      status: 'lobby',
      currentQuestionIndex: 0,
      questionIds: resolvedQuestionIds,
      participants: [teacherParticipant],
      answers: {},
    };
    this.sessions.unshift(session);
    return session;
  }

  listSessions(): LiveSession[] {
    return this.sessions;
  }

  findSessionByCode(code: string): LiveSession | undefined {
    return this.sessions.find((session) => session.code === code.toUpperCase());
  }

  joinSession(code: string, name: string): LiveSession | undefined {
    const session = this.findSessionByCode(code);
    if (!session) {
      return undefined;
    }
    session.participants.push({
      id: randomUUID(),
      name,
      role: 'student',
      score: 0,
    });
    return session;
  }

  activateSession(code: string): LiveSession | undefined {
    const session = this.findSessionByCode(code);
    if (!session) {
      return undefined;
    }
    session.status = 'active';
    session.answers = {};
    return session;
  }

  advanceSession(code: string): LiveSession | undefined {
    const session = this.findSessionByCode(code);
    if (!session) {
      return undefined;
    }
    session.currentQuestionIndex += 1;
    session.answers = {};
    if (session.currentQuestionIndex >= session.questionIds.length) {
      session.status = 'finished';
      session.currentQuestionIndex = session.questionIds.length - 1;
    }
    return session;
  }

  submitAnswer(code: string, participantId: string, answer: string): LiveSession | undefined {
    const session = this.findSessionByCode(code);
    if (!session) {
      return undefined;
    }
    const question = this.questions.find((item) => item.id === session.questionIds[session.currentQuestionIndex]);
    if (!question) {
      return session;
    }
    session.answers[participantId] = answer;
    const participant = session.participants.find((item) => item.id === participantId);
    if (participant && answer === question.correctAnswer) {
      participant.score += 100;
    }
    return session;
  }

  currentQuestion(session: LiveSession): LiveQuestion | undefined {
    return this.questions.find((item) => item.id === session.questionIds[session.currentQuestionIndex]);
  }

  private shuffledQuestionIds(): string[] {
    if (!this.trainingOrder || this.trainingOrder.length !== this.questions.length) {
      const ids = this.questions.map((item) => item.id);
      for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      this.trainingOrder = ids;
    }
    return this.trainingOrder;
  }

  nextTrainingQuestion(index: number): { question: LiveQuestion; caseData: ClinicalCase } {
    const order = this.shuffledQuestionIds();
    const safeIndex = ((index % order.length) + order.length) % order.length;
    const question = this.questions.find((item) => item.id === order[safeIndex])!;
    const caseData = this.cases.find((item) => item.id === question.caseId)!;
    return { question, caseData };
  }

  evaluateTraining(questionId: string, selectedAnswer: string): TrainingAttempt | undefined {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question) {
      return undefined;
    }
    const caseData = this.cases.find((item) => item.id === question.caseId)!;
    const normalize = (value: string) => value.trim().toLowerCase();
    return {
      questionId,
      selectedAnswer,
      isCorrect: normalize(selectedAnswer) === normalize(question.correctAnswer),
      explanation: caseData.explanation,
    };
  }
}

export const db = new InMemoryDatabase();
