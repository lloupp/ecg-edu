import { ClinicalCase, DashboardMetrics, LearningProgress, LearningReviewItem, LiveQuestion, TrainingAttempt, UserProfile, UserRole } from '@ecg-edu/shared';

export abstract class UsersRepository {
  // Demonstration identity only. This contract must be replaced by authenticated identity before production.
  abstract login(email: string, role: UserRole): Promise<UserProfile>;
  abstract listUsers(): Promise<UserProfile[]>;
  abstract metrics(): Promise<DashboardMetrics>;
}

export abstract class CasesRepository {
  abstract listCases(): Promise<ClinicalCase[]>;
  abstract createCase(payload: Omit<ClinicalCase, 'id'>): Promise<ClinicalCase>;
  abstract updateCase(id: string, payload: Partial<Omit<ClinicalCase, 'id'>>): Promise<ClinicalCase | undefined>;
  abstract deleteCase(id: string): Promise<boolean>;
}

export abstract class LearningRepository {
  abstract nextTrainingQuestion(index: number, userId?: string): Promise<{ question: LiveQuestion; caseData: ClinicalCase }>;
  abstract evaluateTraining(questionId: string, selectedAnswer: string, userId?: string): Promise<TrainingAttempt | undefined>;
  abstract learningProgress(userId: string): Promise<LearningProgress>;
  abstract reviewErrors(userId: string): Promise<LearningReviewItem[]>;
}
