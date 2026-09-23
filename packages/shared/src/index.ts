export type UserRole = 'student' | 'teacher';
export type CaseLevel = 'basic' | 'intermediate' | 'advanced';
export type SessionStatus = 'lobby' | 'active' | 'finished';
export type CompetencyCode =
  | 'rate'
  | 'rhythm'
  | 'axis'
  | 'intervals'
  | 'waves'
  | 'segments'
  | 'diagnosis'
  | 'differential'
  | 'clinical_context';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  specialty: string;
}

export interface EcgInterpretation {
  rate: string;
  rhythm: string;
  axis: string;
  intervals: string;
  waves: string;
  segments: string;
  summary: string;
}

export interface ClinicalReference {
  title: string;
  organization: string;
  year: number;
  url: string;
}

export interface ClinicalCase {
  id: string;
  liveQuestionId?: string;
  title: string;
  ecgImageUrl: string;
  clinicalDescription: string;
  diagnosis: string;
  explanation: string;
  level: CaseLevel;
  tags: string[];
  createdBy: string;
  status: 'published' | 'pending_review';
  ecgImageKind?: 'schematic' | 'deidentified_clinical';
  imageSource?: string;
  learningObjectives?: string[];
  competencies?: CompetencyCode[];
  differentialDiagnoses?: string[];
  interpretation?: EcgInterpretation;
  references?: ClinicalReference[];
  reviewedBy?: string;
  lastReviewedAt?: string;
}

export interface LiveQuestion {
  id: string;
  caseId: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
}

export interface SessionParticipant {
  id: string;
  name: string;
  role: UserRole;
  score: number;
}

export interface LiveSession {
  id: string;
  code: string;
  teacherId: string;
  title: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  questionIds: string[];
  participants: SessionParticipant[];
  answers: Record<string, string>;
}

export interface TrainingAttempt {
  id: string;
  userId?: string;
  questionId: string;
  caseId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  explanation: string;
  competencyCodes: CompetencyCode[];
  answeredAt: string;
  nextReviewAt: string;
}

export interface CompetencyProgress {
  code: CompetencyCode;
  label: string;
  attempts: number;
  correct: number;
  mastery: number;
}

export interface LearningReviewItem {
  question: LiveQuestion;
  caseData: ClinicalCase;
  lastAttempt: TrainingAttempt;
}

export interface LearningProgress {
  userId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  dueReviews: number;
  competencies: CompetencyProgress[];
  recentErrors: LearningReviewItem[];
}

export interface DashboardMetrics {
  totalCases: number;
  liveSessions: number;
  publishedCases: number;
  pendingCases: number;
  activeStudents: number;
}

export interface LoginPayload {
  email: string;
  role: UserRole;
}
