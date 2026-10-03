import { ClinicalCase, DashboardMetrics, LearningProgress, LearningReviewItem, LiveQuestion, TrainingAttempt, UserProfile } from '@ecg-edu/shared';

export abstract class UsersRepository {
  abstract listUsers(): Promise<UserProfile[]>;
  abstract metrics(): Promise<DashboardMetrics>;
}

export type Credential = { user: UserProfile; passwordHash: string };
export abstract class AuthRepository {
  abstract createAccount(user: UserProfile, passwordHash: string): Promise<UserProfile>;
  abstract findCredential(email: string): Promise<Credential | undefined>;
  abstract createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  abstract sessionUser(tokenHash: string): Promise<UserProfile | undefined>;
  abstract revokeSession(tokenHash: string): Promise<void>;
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
