import {
  ClinicalCase,
  ClinicalReference,
  DashboardMetrics,
  EcgInterpretation,
  LearningProgress,
  LearningReviewItem,
  LiveSession,
  TrainingAttempt,
  UserProfile,
} from '@ecg-edu/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SESSION_KEY = 'ecg-auth-session';

type AuthSession = { user: UserProfile; token: string; expiresAt: string };
type CaseInput = Omit<ClinicalCase, 'id' | 'createdBy' | 'reviewedBy' | 'lastReviewedAt' | 'liveQuestionId'>;
type SafeTrainingCase = Omit<
  ClinicalCase,
  'diagnosis' | 'explanation' | 'interpretation' | 'differentialDiagnoses' | 'references' | 'reviewedBy' | 'lastReviewedAt'
>;
type SafeQuestion = { id: string; caseId: string; prompt: string; options: string[] };
type TrainingFeedback = {
  diagnosis: string;
  explanation: string;
  interpretation?: EcgInterpretation;
  differentialDiagnoses: string[];
  references: ClinicalReference[];
};
type SafeLiveQuestion = { id: string; caseId: string; prompt: string; options: string[] };
type SessionView = LiveSession & { currentQuestion?: SafeLiveQuestion };

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    return parsed.message ?? body;
  } catch {
    return body;
  }
}

function sessionToken() {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return undefined;
    return (JSON.parse(raw) as AuthSession).token;
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(extractErrorMessage(body) || 'Erro ao comunicar com a API');
  }
  return response.json() as Promise<T>;
}

export const authSessionStorage = {
  key: SESSION_KEY,
  save: (session: AuthSession) => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
  load: (): AuthSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(SESSION_KEY);
  },
};

export const api = {
  capabilities: () => request<{
    storage: 'postgresql' | 'memory';
    liveEnabled: boolean;
    authentication: 'password-session';
    liveAuthorization: 'demonstration-only' | 'disabled';
  }>('/platform/capabilities'),
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<UserProfile>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  metrics: () => request<DashboardMetrics>('/dashboard/metrics'),
  users: () => request<UserProfile[]>('/users'),
  cases: () => request<ClinicalCase[]>('/cases'),
  createCase: (payload: CaseInput) => request<ClinicalCase>('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: Partial<CaseInput>) =>
    request<ClinicalCase>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCase: (id: string) => request<{ success: boolean }>(`/cases/${id}`, { method: 'DELETE' }),

  sessions: () => request<SessionView[]>('/live/sessions'),
  startSession: (payload: { teacherId: string; title: string; questionIds: string[] }) =>
    request<SessionView>('/live/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  joinSession: (code: string, name: string) =>
    request<SessionView>(`/live/sessions/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  activateSession: (code: string, teacherId: string) =>
    request<SessionView>(`/live/sessions/${code}/activate`, { method: 'POST', body: JSON.stringify({ teacherId }) }),
  nextSessionQuestion: (code: string, teacherId: string) =>
    request<SessionView>(`/live/sessions/${code}/next`, { method: 'POST', body: JSON.stringify({ teacherId }) }),
  answerSession: (code: string, participantId: string, answer: string) =>
    request<SessionView>(`/live/sessions/${code}/answer`, { method: 'POST', body: JSON.stringify({ participantId, answer }) }),

  trainingQuestion: (index: number) =>
    request<{ question: SafeQuestion; caseData: SafeTrainingCase }>(`/training/question?index=${index}`),
  answerTraining: (questionId: string, selectedAnswer: string) =>
    request<{ attempt: TrainingAttempt; feedback: TrainingFeedback }>('/training/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedAnswer }),
    }),
  learningProgress: () => request<LearningProgress>('/training/progress'),
  reviewErrors: () => request<LearningReviewItem[]>('/training/review'),
};
