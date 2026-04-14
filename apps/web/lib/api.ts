import { ClinicalCase, DashboardMetrics, LiveSession, LoginPayload, TrainingAttempt, UserProfile } from '@ecg-edu/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Erro ao comunicar com a API');
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: LoginPayload) => request<{ user: UserProfile; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  metrics: () => request<DashboardMetrics>('/dashboard/metrics'),
  users: () => request<UserProfile[]>('/users'),
  cases: () => request<ClinicalCase[]>('/cases'),
  createCase: (payload: Omit<ClinicalCase, 'id'>) => request<ClinicalCase>('/cases', { method: 'POST', body: JSON.stringify(payload) }),
  updateCase: (id: string, payload: Partial<Omit<ClinicalCase, 'id'>>) => request<ClinicalCase>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCase: (id: string) => request<{ success: boolean }>(`/cases/${id}`, { method: 'DELETE' }),
  sessions: () => request<(LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } })[]>('/live/sessions'),
  startSession: (payload: { teacherId: string; title: string; questionIds: string[] }) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>('/live/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  joinSession: (code: string, name: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  activateSession: (code: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/activate`, { method: 'POST' }),
  nextSessionQuestion: (code: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/next`, { method: 'POST' }),
  answerSession: (code: string, participantId: string, answer: string) => request<LiveSession & { currentQuestion?: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string } }>(`/live/sessions/${code}/answer`, { method: 'POST', body: JSON.stringify({ participantId, answer }) }),
  trainingQuestion: (index: number) => request<{ question: { id: string; prompt: string; options: string[]; correctAnswer: string; caseId: string }; caseData: ClinicalCase }>(`/training/question?index=${index}`),
  answerTraining: (questionId: string, selectedAnswer: string) => request<TrainingAttempt>('/training/answer', { method: 'POST', body: JSON.stringify({ questionId, selectedAnswer }) }),
};
