export type UserRole = 'student' | 'teacher';
export type CaseLevel = 'basic' | 'intermediate' | 'advanced';
export type SessionStatus = 'lobby' | 'active' | 'finished';
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    institution: string;
    specialty: string;
}
export interface ClinicalCase {
    id: string;
    title: string;
    ecgImageUrl: string;
    clinicalDescription: string;
    diagnosis: string;
    explanation: string;
    level: CaseLevel;
    tags: string[];
    createdBy: string;
    status: 'published' | 'pending_review';
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
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    explanation: string;
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
