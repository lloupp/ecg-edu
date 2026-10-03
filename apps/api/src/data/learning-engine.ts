import { randomUUID } from 'crypto';
import { ClinicalCase, CompetencyCode, LearningProgress, LearningReviewItem, LiveQuestion, TrainingAttempt } from '@ecg-edu/shared';

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

export class LearningEngine {
  protected trainingOrder: string[] | null = null;
  constructor(public cases: ClinicalCase[], public questions: LiveQuestion[], public trainingAttempts: TrainingAttempt[] = [], private readonly shuffle = true) {}

  protected shuffledQuestionIds(): string[] {
    if (!this.shuffle) return this.questions.map((question) => question.id);
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
      if (!current || current.answeredAt <= attempt.answeredAt) {
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
