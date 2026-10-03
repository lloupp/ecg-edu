import { ClinicalCase, DashboardMetrics, LearningProgress, LearningReviewItem, LiveQuestion, TrainingAttempt, UserProfile } from '@ecg-edu/shared';

export interface AuthUserRecord {
  user: UserProfile;
  passwordHash: string | null;
}

export abstract class AuthRepository {
  abstract findAuthUserByEmail(email: string): Promise<AuthUserRecord | undefined>;
  abstract createStudentAccount(input: { name: string; email: string; passwordHash: string }): Promise<UserProfile>;
  abstract createAuthSession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<void>;
  abstract resolveAuthSession(tokenHash: string): Promise<UserProfile | undefined>;
  abstract revokeAuthSession(tokenHash: string): Promise<void>;
}

export abstract class UsersRepository {
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
