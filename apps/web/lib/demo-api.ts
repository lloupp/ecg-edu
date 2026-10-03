import { ClinicalCase, LearningProgress, LiveQuestion, TrainingAttempt, UserProfile } from '@ecg-edu/shared';
import fixture from './demo-data.json';

const key = 'ecg-edu-public-demo-v1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
type State = { users: UserProfile[]; cases: ClinicalCase[]; questions: LiveQuestion[]; attempts: TrainingAttempt[] };
let state: State | undefined;

function data(): State {
  if (state) return state;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) state = JSON.parse(stored) as State;
  } catch { /* Browser storage is optional; keep an in-memory session when unavailable. */ }
  state ??= { users: structuredClone(fixture.users) as UserProfile[], cases: structuredClone(fixture.cases) as ClinicalCase[],
    questions: structuredClone(fixture.questions), attempts: [] };
  return state;
}
function save() { try { window.localStorage.setItem(key, JSON.stringify(data())); } catch { /* Temporary browser session. */ } }
function cases() { return data().cases.map((item) => ({ ...item, ecgImageUrl: item.ecgImageUrl.startsWith('/ecgs/') ? `${basePath}${item.ecgImageUrl}` : item.ecgImageUrl })); }
function latest(userId: string) {
  const result = new Map<string, TrainingAttempt>();
  for (const attempt of data().attempts.filter((item) => item.userId === userId)) result.set(attempt.questionId, attempt);
  return [...result.values()];
}
function review(userId: string) {
  return latest(userId).filter((item) => !item.isCorrect).reverse().map((lastAttempt) => ({ lastAttempt,
    question: data().questions.find((item) => item.id === lastAttempt.questionId)!, caseData: cases().find((item) => item.id === lastAttempt.caseId)! }));
}
function progress(userId: string): LearningProgress {
  const attempts = data().attempts.filter((item) => item.userId === userId);
  const correctAttempts = attempts.filter((item) => item.isCorrect).length;
  const labels = { rate: 'Frequência', rhythm: 'Ritmo', axis: 'Eixo', intervals: 'Intervalos', waves: 'Ondas', segments: 'Segmentos', diagnosis: 'Diagnóstico provável', differential: 'Diagnóstico diferencial', clinical_context: 'Contexto clínico' };
  return { userId, totalAttempts: attempts.length, correctAttempts,
    accuracy: attempts.length ? Math.round(100 * correctAttempts / attempts.length) : 0,
    dueReviews: latest(userId).filter((item) => Date.parse(item.nextReviewAt) <= Date.now()).length,
    recentErrors: review(userId).slice(0, 5),
    competencies: (Object.keys(labels) as (keyof typeof labels)[]).map((code) => {
      const matches = attempts.filter((item) => item.competencyCodes.includes(code));
      const correct = matches.filter((item) => item.isCorrect).length;
      return { code, label: labels[code], attempts: matches.length, correct, mastery: matches.length ? Math.round(100 * correct / matches.length) : 0 };
    }) };
}

// Public static demonstration. No HTTP requests, credentials, patients or shared accounts.
export async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, 'https://demo.invalid');
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const store = data();
  let result: unknown;
  if (url.pathname === '/platform/capabilities') result = { storage: 'browser', liveEnabled: false, authentication: 'public_demo' };
  else if (url.pathname === '/auth/login') {
    const role = body.role === 'teacher' ? 'teacher' : 'student';
    const user = store.users.find((item) => item.role === role)!;
    result = { user, token: 'public-demo-no-authentication' };
  } else if (url.pathname === '/demo/reset') {
    state = undefined;
    try { window.localStorage.removeItem(key); window.localStorage.removeItem('ecg-user'); } catch { /* Optional storage. */ }
    result = { success: true };
  } else if (url.pathname === '/users') result = store.users;
  else if (url.pathname === '/dashboard/metrics') result = { totalCases: store.cases.length, publishedCases: store.cases.filter((item) => item.status === 'published').length, pendingCases: store.cases.filter((item) => item.status !== 'published').length, activeStudents: 0, liveSessions: 0 };
  else if (url.pathname === '/live/sessions') result = [];
  else if (url.pathname === '/training/question') {
    const available = store.questions.filter((q) => store.cases.some((c) => c.id === q.caseId && c.status === 'published'));
    if (!available.length) throw new Error('Nenhum caso demonstrativo publicado. Reinicie a demo para restaurar os exemplos.');
    const question = available[Number(url.searchParams.get('index') ?? 0) % available.length];
    result = { question, caseData: cases().find((item) => item.id === question.caseId) };
  } else if (url.pathname === '/training/answer') {
    const question = store.questions.find((item) => item.id === body.questionId);
    const clinicalCase = store.cases.find((item) => item.id === question?.caseId);
    if (!question || !clinicalCase) throw new Error('Pergunta demonstrativa não encontrada.');
    const isCorrect = body.selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    const count = store.attempts.filter((a) => a.userId === body.userId && a.questionId === question.id && a.isCorrect).length;
    const days = isCorrect ? [1,3,7,14,30][Math.min(count,4)] : 1;
    const attempt: TrainingAttempt = { id: crypto.randomUUID(), userId: body.userId, questionId: question.id, caseId: clinicalCase.id,
      selectedAnswer: body.selectedAnswer, isCorrect, explanation: clinicalCase.explanation, competencyCodes: clinicalCase.competencies ?? ['diagnosis'],
      answeredAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + days * 86400000).toISOString() };
    store.attempts.push(attempt); save(); result = attempt;
  } else if (url.pathname === '/training/progress') result = progress(url.searchParams.get('userId') ?? '');
  else if (url.pathname === '/training/review') result = review(url.searchParams.get('userId') ?? '');
  else if (url.pathname === '/cases' && (!init?.method || init.method === 'GET')) result = cases();
  else if (url.pathname === '/cases' && init?.method === 'POST') {
    const id = crypto.randomUUID(), questionId = crypto.randomUUID();
    const item: ClinicalCase = { ...body, id, liveQuestionId: questionId, status: body.status === 'published' && body.references?.length ? 'published' : 'pending_review' };
    store.cases.unshift(item);
    store.questions.push({ id: questionId, caseId: id, prompt: `Qual o diagnóstico provável do caso ${item.title}?`, options: [...new Set([item.diagnosis, 'ECG normal', 'Outra hipótese'])], correctAnswer: item.diagnosis });
    save(); result = item;
  } else if (url.pathname.startsWith('/cases/')) {
    const id = url.pathname.split('/').pop();
    const item = store.cases.find((c) => c.id === id);
    if (!item) throw new Error('Caso demonstrativo não encontrado.');
    if (init?.method === 'DELETE') {
      store.cases = store.cases.filter((c) => c.id !== id);
      store.questions = store.questions.filter((q) => q.caseId !== id);
      store.attempts = store.attempts.filter((a) => a.caseId !== id);
      result = { success: true };
    } else {
      Object.assign(item, body);
      if (item.status === 'published' && !item.references?.length) item.status = 'pending_review';
      const question = store.questions.find((q) => q.caseId === id);
      if (question) { question.correctAnswer = item.diagnosis; question.options[0] = item.diagnosis; }
      result = item;
    }
    save();
  } else throw new Error('Esta funcionalidade exige a plataforma completa e não está disponível na demo.');
  return structuredClone(result) as T;
}
