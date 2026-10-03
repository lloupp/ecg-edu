import { CasePreview, TrainingFeedback, TrainingQuestionView, ClinicalCase, DashboardMetrics, LearningProgress, LearningReviewItem, LiveSession, LoginPayload, UserProfile } from '@ecg-edu/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    return parsed.message ?? body;
  } catch {
    return body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (await import('./demo-api')).demoRequest<T>(path, init);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/me' && path !== '/auth/login') window.dispatchEvent(new Event('ecg-session-expired'));
    const body = await response.text();
    throw new Error(extractErrorMessage(body) || 'Erro ao comunicar com a API');
  }

  return response.json() as Promise<T>;
}

export const api = {
  capabilities: () => request<{ storage: 'postgresql' | 'memory' | 'browser'; liveEnabled: boolean; authentication: 'session_cookie' | 'public_demo' }>('/platform/capabilities'),
  resetDemo: () => request<{ success: boolean }>('/demo/reset', { method: 'POST' }),
  login: (payload: LoginPayload) => request<{ user: UserProfile }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: LoginPayload & { name: string }) => request<{ user: UserProfile }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<{ user: UserProfile }>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  enterDemo: (role: 'student' | 'teacher') => request<{ user: UserProfile }>('/auth/login', { method: 'POST', body: JSON.stringify({ role }) }),
  metrics: () => request<DashboardMetrics>('/dashboard/metrics'),
  users: () => request<UserProfile[]>('/users'),
  cases: () => request<(ClinicalCase | CasePreview)[]>('/cases'),
  createCase: (payload: Omit<ClinicalCase, 'id'>) => request<ClinicalCase>('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: Partial<Omit<ClinicalCase, 'id' | 'createdBy'>>) => request<ClinicalCase>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCase: (id: string) => request<{ success: boolean }>(`/cases/${id}`, { method: 'DELETE' }),
  sessions: () => request<(LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } })[]>('/live/sessions'),
  startSession: (payload: { teacherId: string; title: string; questionIds: string[] }) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>('/live/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  joinSession: (code: string, name: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  activateSession: (code: string, teacherId: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/activate`, { method: 'POST', body: JSON.stringify({ teacherId }) }),
  nextSessionQuestion: (code: string, teacherId: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/next`, { method: 'POST', body: JSON.stringify({ teacherId }) }),
  answerSession: (code: string, participantId: string, answer: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/answer`, { method: 'POST', body: JSON.stringify({ participantId, answer }) }),
  trainingQuestion: (index: number, userId?: string) => request<TrainingQuestionView>(`/training/question?index=${index}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`),
  answerTraining: (questionId: string, selectedAnswer: string, userId?: string) => request<TrainingFeedback>('/training/answer', { method: 'POST', body: JSON.stringify({ questionId, selectedAnswer, userId }) }),
  learningProgress: (userId: string) => request<LearningProgress>(`/training/progress?userId=${encodeURIComponent(userId)}`),
  reviewErrors: (userId: string) => request<LearningReviewItem[]>(`/training/review?userId=${encodeURIComponent(userId)}`),
};
