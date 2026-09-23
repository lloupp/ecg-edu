import { randomUUID } from 'crypto';
import {
  ClinicalCase,
  CompetencyCode,
  DashboardMetrics,
  LearningProgress,
  LearningReviewItem,
  LiveQuestion,
  LiveSession,
  SessionParticipant,
  TrainingAttempt,
  UserProfile,
  UserRole,
} from '@ecg-edu/shared';
import { casesSeed, questionsSeed, usersSeed } from './mock-data';

const competencyLabels: Record<CompetencyCode, string> = {
  rate: 'Frequência',
  rhythm: 'Ritmo',
  axis: 'Eixo',
  intervals: 'Intervalos',
  waves: 'Ondas',
  segments: 'Segmentos',
  diagnosis: 'Diagnóstico provável',
  differential: 'Diagnóstico diferencial',
  clinical_context: 'Contexto clínico',
};

export class InMemoryDatabase {
  users: UserProfile[] = structuredClone(usersSeed);
  cases: ClinicalCase[] = structuredClone(casesSeed);
  questions: LiveQuestion[] = structuredClone(questionsSeed);
  sessions: LiveSession[] = [];
  trainingAttempts: TrainingAttempt[] = [];
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
    const references = payload.references ?? [];
    const created: ClinicalCase = {
      ...payload,
      id: randomUUID(),
      liveQuestionId: questionId,
      status: payload.status === 'published' && references.length > 0 ? 'published' : 'pending_review',
      ecgImageKind: payload.ecgImageKind ?? 'schematic',
      imageSource:
        payload.imageSource ??
        'Material enviado para fins educacionais; a origem e a autorização de uso devem ser verificadas antes da publicação.',
      learningObjectives: payload.learningObjectives ?? [],
      competencies: payload.competencies?.length ? payload.competencies : ['diagnosis'],
      differentialDiagnoses: payload.differentialDiagnoses ?? [],
      references,
    };
    this.cases.unshift(created);
    this.questions.push({
      id: questionId,
      caseId: created.id,
      prompt: `Qual o melhor diagnóstico para o caso ${created.title}?`,
      options: [created.diagnosis, 'Pericardite aguda', 'Taquicardia sinusal', 'ECG normal'],
      correctAnswer: created.diagnosis,
    });
    this.trainingOrder = null;
    return created;
  }

  updateCase(id: string, payload: Partial<Omit<ClinicalCase, 'id'>>): ClinicalCase | undefined {
    const current = this.cases.find((item) => item.id === id);
    if (!current) {
      return undefined;
    }

    const next = { ...payload };
    if (next.status === 'published') {
      const references = next.references ?? current.references ?? [];
      if (references.length === 0) {
        next.status = 'pending_review';
      }
    }

    Object.assign(current, next);
    return current;
  }

  deleteCase(id: string): boolean {
    const before = this.cases.length;
    this.cases = this.cases.filter((item) => item.id !== id);
    this.questions = this.questions.filter((item) => item.caseId !== id);
    this.trainingAttempts = this.trainingAttempts.filter((item) => item.caseId !== id);
    this.trainingOrder = null;
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

  private latestAttemptsByQuestion(userId: string): Map<string, TrainingAttempt> {
    const latest = new Map<string, TrainingAttempt>();
    for (const attempt of this.trainingAttempts.filter((item) => item.userId === userId)) {
      const current = latest.get(attempt.questionId);
      if (!current || current.answeredAt < attempt.answeredAt) {
        latest.set(attempt.questionId, attempt);
      }
    }
    return latest;
  }

  private personalizedQuestionIds(userId?: string): string[] {
    const baseOrder = [...this.shuffledQuestionIds()];
    if (!userId) {
      return baseOrder;
    }

    const latest = this.latestAttemptsByQuestion(userId);
    const now = Date.now();
    const due = baseOrder.filter((id) => {
      const attempt = latest.get(id);
      return attempt ? new Date(attempt.nextReviewAt).getTime() <= now : false;
    });
    const unseen = baseOrder.filter((id) => !latest.has(id));
    const remaining = baseOrder.filter((id) => !due.includes(id) && !unseen.includes(id));
    return [...due, ...unseen, ...remaining];
  }

  nextTrainingQuestion(index: number, userId?: string): { question: LiveQuestion; caseData: ClinicalCase } {
    const order = this.personalizedQuestionIds(userId);
    if (!order.length) {
      throw new Error('Nenhuma pergunta disponível');
    }
    const safeIndex = ((index % order.length) + order.length) % order.length;
    const question = this.questions.find((item) => item.id === order[safeIndex])!;
    const caseData = this.cases.find((item) => item.id === question.caseId)!;
    return { question, caseData };
  }

  evaluateTraining(questionId: string, selectedAnswer: string, userId?: string): TrainingAttempt | undefined {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question) {
      return undefined;
    }
    const caseData = this.cases.find((item) => item.id === question.caseId)!;
    const normalize = (value: string) => value.trim().toLowerCase();
    const isCorrect = normalize(selectedAnswer) === normalize(question.correctAnswer);
    const now = new Date();

    const priorCorrectAttempts = userId
      ? this.trainingAttempts.filter((item) => item.userId === userId && item.questionId === questionId && item.isCorrect).length
      : 0;
    const correctIntervals = [1, 3, 7, 14, 30];
    const intervalDays = isCorrect ? correctIntervals[Math.min(priorCorrectAttempts, correctIntervals.length - 1)] : 1;
    const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    const attempt: TrainingAttempt = {
      id: randomUUID(),
      userId,
      questionId,
      caseId: caseData.id,
      selectedAnswer,
      isCorrect,
      explanation: caseData.explanation,
      competencyCodes: caseData.competencies?.length ? caseData.competencies : ['diagnosis'],
      answeredAt: now.toISOString(),
      nextReviewAt: nextReview.toISOString(),
    };

    if (userId) {
      this.trainingAttempts.push(attempt);
    }
    return attempt;
  }

  reviewErrors(userId: string): LearningReviewItem[] {
    const latest = this.latestAttemptsByQuestion(userId);
    return [...latest.values()]
      .filter((attempt) => !attempt.isCorrect)
      .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
      .map((attempt) => {
        const question = this.questions.find((item) => item.id === attempt.questionId)!;
        const caseData = this.cases.find((item) => item.id === attempt.caseId)!;
        return { question, caseData, lastAttempt: attempt };
      });
  }

  learningProgress(userId: string): LearningProgress {
    const attempts = this.trainingAttempts.filter((item) => item.userId === userId);
    const correctAttempts = attempts.filter((item) => item.isCorrect).length;
    const now = Date.now();
    const latest = this.latestAttemptsByQuestion(userId);
    const dueReviews = [...latest.values()].filter((item) => new Date(item.nextReviewAt).getTime() <= now).length;

    const competencies = (Object.keys(competencyLabels) as CompetencyCode[]).map((code) => {
      const competencyAttempts = attempts.filter((item) => item.competencyCodes.includes(code));
      const correct = competencyAttempts.filter((item) => item.isCorrect).length;
      return {
        code,
        label: competencyLabels[code],
        attempts: competencyAttempts.length,
        correct,
        mastery: competencyAttempts.length ? Math.round((correct / competencyAttempts.length) * 100) : 0,
      };
    });

    return {
      userId,
      totalAttempts: attempts.length,
      correctAttempts,
      accuracy: attempts.length ? Math.round((correctAttempts / attempts.length) * 100) : 0,
      dueReviews,
      competencies,
      recentErrors: this.reviewErrors(userId).slice(0, 5),
    };
  }
}

export const db = new InMemoryDatabase();
