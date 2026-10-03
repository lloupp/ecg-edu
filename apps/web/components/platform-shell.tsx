'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ClinicalCase, DashboardMetrics, LearningProgress, UserProfile, UserRole } from '@ecg-edu/shared';
import { Activity, BookOpenText, CirclePlay, Gauge, HeartPulse, ShieldCheck, Trophy, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type SessionView = Awaited<ReturnType<typeof api.sessions>>[number];
type TrainingQuestion = Awaited<ReturnType<typeof api.trainingQuestion>>;

const navigation = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'cases', label: 'Banco de casos' },
  { id: 'live', label: 'Aula ao vivo' },
  { id: 'training', label: 'Treino' },
  { id: 'progress', label: 'Meu progresso' },
  { id: 'community', label: 'Colaboração' },
] as const;

const emptyCaseForm = {
  title: '',
  ecgImageUrl: '/ecgs/ecg-af.svg',
  clinicalDescription: '',
  diagnosis: '',
  explanation: '',
  level: 'basic' as ClinicalCase['level'],
  tags: 'arritmia',
  status: 'pending_review' as ClinicalCase['status'],
  imageSource: 'Ilustração didática própria ou ECG desidentificado com autorização de uso.',
  learningObjectives: '',
  differentialDiagnoses: '',
  referenceTitle: '',
  referenceOrganization: '',
  referenceUrl: '',
};

export function PlatformShell() {
  const [activeTab, setActiveTab] = useState<(typeof navigation)[number]['id']>('overview');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('marina@ecgedu.com');
  const [role, setRole] = useState<UserRole>('teacher');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [training, setTraining] = useState<TrainingQuestion | null>(null);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingFeedback, setTrainingFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [selectedTrainingAnswer, setSelectedTrainingAnswer] = useState('');
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [reviewErrors, setReviewErrors] = useState<Awaited<ReturnType<typeof api.reviewErrors>>>([]);
  const [caseForm, setCaseForm] = useState(emptyCaseForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState('Discussão de plantão - ECGs críticos');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinedParticipantId, setJoinedParticipantId] = useState('');
  const [selectedSessionCode, setSelectedSessionCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = window.localStorage.getItem('ecg-user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser) as UserProfile;
      setUser(parsed);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refreshAll();
      void loadLearning(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadTraining(trainingIndex);
    }
  }, [user, trainingIndex]);

  async function refreshAll() {
    const [metricsData, casesData, usersData, sessionsData] = await Promise.all([api.metrics(), api.cases(), api.users(), api.sessions()]);
    setMetrics(metricsData);
    setCases(casesData);
    setUsers(usersData);
    setSessions(sessionsData);
    if (!selectedSessionCode && sessionsData[0]) {
      setSelectedSessionCode(sessionsData[0].code);
    }
  }

  async function loadTraining(index: number) {
    if (!user) {
      return;
    }
    const data = await api.trainingQuestion(index, user.id);
    setTraining(data);
    setSelectedTrainingAnswer('');
    setTrainingFeedback(null);
  }

  async function loadLearning(userId: string) {
    const [progressData, reviewData] = await Promise.all([api.learningProgress(userId), api.reviewErrors(userId)]);
    setLearningProgress(progressData);
    setReviewErrors(reviewData);
  }

  async function handleLogin() {
    setLoading(true);
    setStatusMessage('');
    try {
      const response = await api.login({ email, role });
      setUser(response.user);
      window.localStorage.setItem('ecg-user', JSON.stringify(response.user));
      setStatusMessage(`Sessão iniciada como ${response.user.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  async function submitCaseForm() {
    if (!user) {
      return;
    }
    const { referenceTitle, referenceOrganization, referenceUrl, learningObjectives, differentialDiagnoses, ...baseCaseForm } = caseForm;
    const payload = {
      ...baseCaseForm,
      tags: caseForm.tags.split(',').map((item) => item.trim()).filter(Boolean),
      createdBy: user.id,
      ecgImageKind: 'schematic' as const,
      learningObjectives: learningObjectives.split(',').map((item) => item.trim()).filter(Boolean),
      differentialDiagnoses: differentialDiagnoses.split(',').map((item) => item.trim()).filter(Boolean),
      references: referenceTitle && referenceOrganization && referenceUrl ? [{ title: referenceTitle, organization: referenceOrganization, url: referenceUrl }] : [],
    };

    const saved = editingId
      ? await api.updateCase(editingId, payload)
      : await api.createCase(payload);
    setStatusMessage(
      saved.status === 'pending_review' && caseForm.status === 'published'
        ? 'Caso salvo como pendente: uma referência clínica verificável é obrigatória para publicação.'
        : editingId
          ? 'Caso atualizado.'
          : 'Novo caso cadastrado.',
    );
    setCaseForm(emptyCaseForm);
    setEditingId(null);
    await refreshAll();
  }

  function startEdit(item: ClinicalCase) {
    setEditingId(item.id);
    setCaseForm({
      title: item.title,
      ecgImageUrl: item.ecgImageUrl,
      clinicalDescription: item.clinicalDescription,
      diagnosis: item.diagnosis,
      explanation: item.explanation,
      level: item.level,
      tags: item.tags.join(', '),
      status: item.status,
      imageSource: item.imageSource ?? '',
      learningObjectives: item.learningObjectives?.join(', ') ?? '',
      differentialDiagnoses: item.differentialDiagnoses?.join(', ') ?? '',
      referenceTitle: item.references?.[0]?.title ?? '',
      referenceOrganization: item.references?.[0]?.organization ?? '',
      referenceUrl: item.references?.[0]?.url ?? '',
    });
    setActiveTab('cases');
  }

  async function removeCase(id: string) {
    await api.deleteCase(id);
    setStatusMessage('Caso removido.');
    await refreshAll();
  }

  async function createLiveSession() {
    if (!user) {
      return;
    }
    const session = await api.startSession({
      teacherId: user.id,
      title: liveTitle,
      questionIds: cases.slice(0, 3).map((item) => item.liveQuestionId).filter((id): id is string => Boolean(id)),
    });
    setSelectedSessionCode(session.code);
    setStatusMessage(`Sessão criada com código ${session.code}.`);
    await refreshAll();
  }

  async function activateSession(code: string) {
    if (!user) {
      return;
    }
    try {
      await api.activateSession(code, user.id);
      setStatusMessage(`Sessão ${code} iniciada.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Falha ao iniciar rodada');
    }
    await refreshAll();
  }

  async function nextSessionQuestion(code: string) {
    if (!user) {
      return;
    }
    await api.nextSessionQuestion(code, user.id);
    await refreshAll();
  }

  async function joinLiveSession() {
    const session = await api.joinSession(joinCode, joinName || user?.name || 'Participante');
    const participant = session.participants.find((item) => item.name === (joinName || user?.name || 'Participante'));
    setJoinedParticipantId(participant?.id ?? '');
    setSelectedSessionCode(session.code);
    setStatusMessage(`Entrada confirmada na sessão ${session.code}.`);
    await refreshAll();
  }

  async function submitLiveAnswer(answer: string) {
    if (!selectedSession || !joinedParticipantId) {
      return;
    }
    try {
      await api.answerSession(selectedSession.code, joinedParticipantId, answer);
      setStatusMessage('Resposta enviada.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Falha ao enviar resposta');
    }
    await refreshAll();
  }

  async function submitTrainingAnswer() {
    if (!training || !selectedTrainingAnswer) {
      return;
    }
    const result = await api.answerTraining(training.question.id, selectedTrainingAnswer, user?.id);
    setTrainingFeedback({ isCorrect: result.isCorrect, explanation: result.explanation });
    if (user) {
      await loadLearning(user.id);
    }
  }

  const selectedSession = useMemo(
    () => sessions.find((session) => session.code === selectedSessionCode) ?? sessions[0],
    [selectedSessionCode, sessions],
  );
  const hasAnsweredCurrentRound = Boolean(joinedParticipantId && selectedSession?.answers[joinedParticipantId] !== undefined);

  const teacherList = users.filter((item) => item.role === 'teacher');
  const contributorCases = cases.filter((item) => item.status === 'pending_review');

  if (!user) {
    return (
      <main className="min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-border bg-card p-8 shadow-panel md:p-12">
            <Badge>ECG Edu Platform</Badge>
            <h1 className="mt-6 max-w-2xl font-display text-5xl leading-none text-secondary md:text-7xl">Ensino clínico de cardiologia em formato de plataforma.</h1>
            <p className="mt-6 max-w-xl text-base text-foreground/72 md:text-lg">
              Casos didáticos de ECG com fontes verificáveis, treino com feedback, revisão de erros e acompanhamento de competências.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Casos curados', 'ECGs didáticos com contexto, fonte e revisão clínica'],
                ['Interpretação estruturada', 'Frequência, ritmo, eixo, intervalos, ondas e segmentos'],
                ['Aprendizado longitudinal', 'Feedback, revisão de erros e domínio por competência'],
              ].map(([title, text]) => (
                <Card key={title} className="border-none bg-muted p-5 shadow-none">
                  <p className="font-semibold text-secondary">{title}</p>
                  <p className="mt-2 text-sm text-foreground/70">{text}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-border bg-secondary p-8 text-white shadow-panel md:p-10">
            <p className="text-sm uppercase tracking-[0.24em] text-white/60">Acesso</p>
            <h2 className="mt-4 font-display text-4xl">Entrar na plataforma</h2>
            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">E-mail</label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} className="border-white/20 bg-white/10 text-white placeholder:text-white/50" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Perfil</label>
                <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="h-11 w-full rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white outline-none">
                  <option value="teacher" className="text-black">Professor</option>
                  <option value="student" className="text-black">Aluno</option>
                </select>
              </div>
              <Button variant="accent" className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'Acessar'}
              </Button>
              <p className="text-sm text-white/70">Sugestões: `marina@ecgedu.com` para professor, `lucas@ecgedu.com` para aluno.</p>
              <p className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs leading-relaxed text-white/75">Uso exclusivamente educacional. O ECG Edu não fornece diagnóstico, prescrição ou decisão clínica e não substitui avaliação profissional.</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[36px] border border-border bg-card px-6 py-8 shadow-panel md:px-10 md:py-10">
          <div className="absolute inset-0 bg-grid bg-[size:36px_36px] opacity-40" />
          <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{user.role === 'teacher' ? 'Perfil professor' : 'Perfil aluno'}</Badge>
                <span className="text-sm text-foreground/60">{user.institution}</span>
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-secondary md:text-6xl">
                Plataforma de treinamento clínico com raciocínio estruturado em ECG.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-foreground/72 md:text-lg">
                Banco estruturado de casos, sessões síncronas com pontuação e trilha individual para consolidar padrões eletrocardiográficos de alto valor clínico.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {navigation.map((item) => (
                  <Button key={item.id} variant={activeTab === item.id ? 'accent' : 'outline'} onClick={() => setActiveTab(item.id)}>
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
            <Card className="border-none bg-secondary p-6 text-white">
              <p className="text-sm uppercase tracking-[0.24em] text-white/55">Sessão</p>
              <p className="mt-3 font-display text-3xl">{user.name}</p>
              <p className="mt-2 text-sm text-white/70">{user.specialty}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <QuickStat icon={HeartPulse} label="Casos" value={metrics?.totalCases ?? 0} />
                <QuickStat icon={CirclePlay} label="Ao vivo" value={metrics?.liveSessions ?? 0} />
                <QuickStat icon={Users} label="Alunos ativos" value={metrics?.activeStudents ?? 0} />
                <QuickStat icon={ShieldCheck} label="Pendentes" value={metrics?.pendingCases ?? 0} />
              </div>
              <Button variant="outline" className="mt-6 w-full border-white/15 bg-white/10 text-white hover:bg-white/20" onClick={() => {
                window.localStorage.removeItem('ecg-user');
                setUser(null);
              }}>
                Encerrar sessão
              </Button>
            </Card>
          </div>
        </section>

        {statusMessage ? <p role="status" aria-live="polite" className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-panel">{statusMessage}</p> : null}
        <p className="mt-4 rounded-2xl border border-border bg-muted px-4 py-3 text-xs leading-relaxed text-foreground/70">Conteúdo para treinamento educacional. Não utilize a plataforma para diagnóstico, prescrição ou tomada de decisão assistencial.</p>

        <section className="mt-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Operação</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={BookOpenText} label="Casos publicados" value={metrics?.publishedCases ?? 0} detail="Biblioteca pronta para ensino" />
                  <MetricCard icon={Gauge} label="Em revisão" value={metrics?.pendingCases ?? 0} detail="Preparado para moderação" />
                  <MetricCard icon={Activity} label="Sessões abertas" value={metrics?.liveSessions ?? 0} detail="Aulas síncronas em andamento" />
                  <MetricCard icon={Trophy} label="Docentes" value={teacherList.length} detail="Autores e facilitadores" />
                </div>
              </Card>
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Pipeline educacional</p>
                <div className="mt-6 space-y-4">
                  {[
                    ['1. Curadoria', 'Casos entram com status publicado ou pendente, preservando autoria e prontidão para moderação futura.'],
                    ['2. Sessão síncrona', 'Professor abre a aula, distribui código e acompanha respostas em tempo real com ranking.'],
                    ['3. Treino individual', 'Aluno revisa o mesmo banco em modo de quiz com explicação imediata por questão.'],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-3xl bg-muted p-5">
                      <p className="font-semibold text-secondary">{title}</p>
                      <p className="mt-2 text-sm text-foreground/70">{text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">CRUD de casos</p>
                <h2 className="mt-3 font-display text-3xl text-secondary">{editingId ? 'Editar caso' : 'Novo caso clínico'}</h2>
                <div className="mt-6 space-y-4">
                  <Input placeholder="Título do caso" value={caseForm.title} onChange={(event) => setCaseForm((prev) => ({ ...prev, title: event.target.value }))} />
                  <Input placeholder="URL da imagem do ECG" value={caseForm.ecgImageUrl} onChange={(event) => setCaseForm((prev) => ({ ...prev, ecgImageUrl: event.target.value }))} />
                  <Textarea placeholder="Descrição clínica" value={caseForm.clinicalDescription} onChange={(event) => setCaseForm((prev) => ({ ...prev, clinicalDescription: event.target.value }))} />
                  <Input placeholder="Diagnóstico correto" value={caseForm.diagnosis} onChange={(event) => setCaseForm((prev) => ({ ...prev, diagnosis: event.target.value }))} />
                  <Textarea placeholder="Explicação" value={caseForm.explanation} onChange={(event) => setCaseForm((prev) => ({ ...prev, explanation: event.target.value }))} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <select aria-label="Nível de dificuldade do caso" value={caseForm.level} onChange={(event) => setCaseForm((prev) => ({ ...prev, level: event.target.value as ClinicalCase['level'] }))} className="h-11 rounded-2xl border border-border bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                      <option value="basic">Básico</option>
                      <option value="intermediate">Intermediário</option>
                      <option value="advanced">Avançado</option>
                    </select>
                    <select aria-label="Status editorial do caso" value={caseForm.status} onChange={(event) => setCaseForm((prev) => ({ ...prev, status: event.target.value as ClinicalCase['status'] }))} className="h-11 rounded-2xl border border-border bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                      <option value="published">Publicado</option>
                      <option value="pending_review">Pendente de revisão</option>
                    </select>
                  </div>
                  <Input placeholder="Tags separadas por vírgula" value={caseForm.tags} onChange={(event) => setCaseForm((prev) => ({ ...prev, tags: event.target.value }))} />
                  <Textarea placeholder="Objetivos de aprendizagem separados por vírgula" value={caseForm.learningObjectives} onChange={(event) => setCaseForm((prev) => ({ ...prev, learningObjectives: event.target.value }))} />
                  <Textarea placeholder="Diagnósticos diferenciais separados por vírgula" value={caseForm.differentialDiagnoses} onChange={(event) => setCaseForm((prev) => ({ ...prev, differentialDiagnoses: event.target.value }))} />
                  <Input placeholder="Origem/autorização da imagem" value={caseForm.imageSource} onChange={(event) => setCaseForm((prev) => ({ ...prev, imageSource: event.target.value }))} />
                  <Input placeholder="Título da referência clínica" value={caseForm.referenceTitle} onChange={(event) => setCaseForm((prev) => ({ ...prev, referenceTitle: event.target.value }))} />
                  <Input placeholder="Organização responsável pela referência" value={caseForm.referenceOrganization} onChange={(event) => setCaseForm((prev) => ({ ...prev, referenceOrganization: event.target.value }))} />
                  <Input placeholder="URL verificável da referência clínica" value={caseForm.referenceUrl} onChange={(event) => setCaseForm((prev) => ({ ...prev, referenceUrl: event.target.value }))} />
                  <p className="text-xs leading-relaxed text-foreground/60">Para publicação, informe título, organização responsável e URL verificável da referência. Caso contrário, o caso permanece em revisão.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="accent" onClick={() => void submitCaseForm()}>
                      {editingId ? 'Salvar alterações' : 'Cadastrar caso'}
                    </Button>
                    {editingId ? (
                      <Button variant="outline" onClick={() => {
                        setEditingId(null);
                        setCaseForm(emptyCaseForm);
                      }}>
                        Cancelar edição
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                {cases.map((item) => (
                  <Card key={item.id} className="overflow-hidden p-4 md:p-5">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[180px] overflow-hidden rounded-[24px] bg-muted">
                        <Image src={item.ecgImageUrl} alt={item.title} fill className="object-contain p-2" unoptimized />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{item.level}</Badge>
                          <Badge className={cn(item.status === 'published' ? 'bg-[#dcefdc] text-success' : 'bg-[#f3e4d1] text-[#8e5a22]')}>
                            {item.status === 'published' ? 'Publicado' : 'Pendente'}
                          </Badge>
                        </div>
                        <h3 className="mt-3 font-display text-2xl text-secondary">{item.title}</h3>
                        <p className="mt-3 text-sm text-foreground/75">{item.clinicalDescription}</p>
                        <p className="mt-3 text-sm"><strong>Diagnóstico:</strong> {item.diagnosis}</p>
                        <p className="mt-2 text-sm text-foreground/72">{item.explanation}</p>
                        {item.imageSource ? <p className="mt-2 text-xs text-foreground/55"><strong>Imagem:</strong> {item.imageSource}</p> : null}
                        {item.references?.[0] ? <p className="mt-2 text-xs text-foreground/60"><strong>Fonte:</strong> <a className="underline" href={item.references[0].url} target="_blank" rel="noreferrer">{item.references[0].title}</a></p> : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">#{tag}</span>
                          ))}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" onClick={() => startEdit(item)}>Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => void removeCase(item.id)}>Excluir</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Modo aula ao vivo</p>
                <h2 className="mt-3 font-display text-3xl text-secondary">Professor conduz, turma responde por código.</h2>
                <div className="mt-6 space-y-4">
                  <Input value={liveTitle} onChange={(event) => setLiveTitle(event.target.value)} placeholder="Título da sessão" />
                  <Button variant="accent" onClick={() => void createLiveSession()} disabled={user.role !== 'teacher'}>
                    Criar sessão ao vivo
                  </Button>
                </div>
                <div className="mt-8 border-t border-border pt-6">
                  <p className="font-semibold text-secondary">Entrar em sessão</p>
                  <div className="mt-4 space-y-3">
                    <Input placeholder="Código da sessão" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
                    <Input placeholder="Nome exibido" value={joinName} onChange={(event) => setJoinName(event.target.value)} />
                    <Button variant="outline" onClick={() => void joinLiveSession()}>Entrar com código</Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Sessões</p>
                    <h3 className="mt-2 font-display text-3xl text-secondary">Painel da aula</h3>
                  </div>
                  <select aria-label="Selecionar sessão ao vivo" value={selectedSession?.code ?? ''} onChange={(event) => setSelectedSessionCode(event.target.value)} className="h-11 min-w-[180px] rounded-2xl border border-border bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                    {sessions.map((session) => (
                      <option key={session.code} value={session.code}>{session.title} ({session.code})</option>
                    ))}
                  </select>
                </div>

                {selectedSession ? (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-[28px] bg-muted p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-foreground/60">Código</p>
                          <p className="font-display text-4xl text-secondary">{selectedSession.code}</p>
                        </div>
                        <Badge>{selectedSession.status}</Badge>
                      </div>
                      <p className="mt-4 text-sm text-foreground/70">Pergunta atual: {selectedSession.currentQuestion?.prompt ?? 'Sem pergunta carregada'}</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button variant="accent" onClick={() => void activateSession(selectedSession.code)} disabled={user.role !== 'teacher' || selectedSession.status !== 'lobby'}>Iniciar rodada</Button>
                        <Button variant="outline" onClick={() => void nextSessionQuestion(selectedSession.code)} disabled={user.role !== 'teacher'}>Próxima pergunta</Button>
                      </div>
                    </div>
                    {selectedSession.currentQuestion ? (
                      selectedSession.status === 'finished' ? (
                        <p className="rounded-3xl bg-muted p-4 text-sm text-foreground/70">Sessão encerrada.</p>
                      ) : selectedSession.status !== 'active' ? (
                        <p className="rounded-3xl bg-muted p-4 text-sm text-foreground/70">Aguardando o professor iniciar a rodada.</p>
                      ) : hasAnsweredCurrentRound ? (
                        <p className="rounded-3xl bg-muted p-4 text-sm text-foreground/70">Resposta enviada para esta rodada. Aguarde o professor avançar.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedSession.currentQuestion.options.map((option) => (
                            <button key={option} className="rounded-3xl border border-border bg-card p-4 text-left transition hover:border-secondary" onClick={() => void submitLiveAnswer(option)}>
                              <p className="font-semibold text-secondary">{option}</p>
                              <p className="mt-2 text-sm text-foreground/65">Enviar como resposta do participante conectado.</p>
                            </button>
                          ))}
                        </div>
                      )
                    ) : null}
                    <div>
                      <p className="font-semibold text-secondary">Ranking</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {selectedSession.participants
                          .slice()
                          .sort((a, b) => b.score - a.score)
                          .map((participant) => (
                            <div key={participant.id} className="rounded-3xl border border-border bg-white px-4 py-3">
                              <p className="font-semibold">{participant.name}</p>
                              <p className="text-sm text-foreground/60">{participant.role === 'teacher' ? 'Professor' : 'Aluno'}</p>
                              <p className="mt-2 text-sm font-semibold text-accent">{participant.score} pts</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-foreground/60">Nenhuma sessão criada ainda.</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'training' && training && (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="overflow-hidden p-0">
                <div className="relative min-h-[320px] bg-muted">
                  <Image src={training.caseData.ecgImageUrl} alt={training.caseData.title} fill className="object-contain p-2" unoptimized />
                </div>
                <div className="p-6 md:p-8">
                  <Badge>{training.caseData.level}</Badge>
                  <h2 className="mt-3 font-display text-3xl text-secondary">{training.caseData.title}</h2>
                  <p className="mt-4 text-sm text-foreground/72">{training.caseData.clinicalDescription}</p>
                </div>
              </Card>

              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Modo treino</p>
                <h3 className="mt-3 font-display text-3xl text-secondary">{training.question.prompt}</h3>
                <div className="mt-6 grid gap-3">
                  {training.question.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedTrainingAnswer(option)}
                      aria-pressed={selectedTrainingAnswer === option}
                      className={cn(
                        'rounded-3xl border px-4 py-4 text-left transition',
                        selectedTrainingAnswer === option ? 'border-accent bg-accentSoft' : 'border-border bg-white hover:border-secondary',
                      )}
                    >
                      <p className="font-semibold text-secondary">{option}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="accent" onClick={() => void submitTrainingAnswer()} disabled={!selectedTrainingAnswer}>Responder</Button>
                  <Button variant="outline" onClick={() => setTrainingIndex((prev) => prev + 1)}>Próximo caso</Button>
                </div>
                {trainingFeedback ? (
                  <div className={cn('mt-6 rounded-[28px] p-5', trainingFeedback.isCorrect ? 'bg-[#dcefdc]' : 'bg-[#f4d8ca]')}>
                    <p className="font-semibold text-secondary">{trainingFeedback.isCorrect ? 'Resposta correta' : 'Resposta incorreta'}</p>
                    <p className="mt-3 text-sm text-foreground/75">{trainingFeedback.explanation}</p>
                    <p className="mt-3 text-sm"><strong>Diagnóstico provável:</strong> {training.caseData.diagnosis}</p>
                    {training.caseData.interpretation ? (
                      <div className="mt-5 border-t border-black/10 pt-4">
                        <p className="font-semibold text-secondary">Interpretação passo a passo</p>
                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <div><dt className="font-semibold">Frequência</dt><dd className="text-foreground/70">{training.caseData.interpretation.rate}</dd></div>
                          <div><dt className="font-semibold">Ritmo</dt><dd className="text-foreground/70">{training.caseData.interpretation.rhythm}</dd></div>
                          <div><dt className="font-semibold">Eixo</dt><dd className="text-foreground/70">{training.caseData.interpretation.axis}</dd></div>
                          <div><dt className="font-semibold">Intervalos</dt><dd className="text-foreground/70">{training.caseData.interpretation.intervals}</dd></div>
                          <div><dt className="font-semibold">Ondas</dt><dd className="text-foreground/70">{training.caseData.interpretation.waves}</dd></div>
                          <div><dt className="font-semibold">Segmentos</dt><dd className="text-foreground/70">{training.caseData.interpretation.segments}</dd></div>
                        </dl>
                        <p className="mt-4 text-sm"><strong>Síntese:</strong> {training.caseData.interpretation.summary}</p>
                      </div>
                    ) : null}
                    {training.caseData.differentialDiagnoses?.length ? <p className="mt-4 text-sm"><strong>Diferenciais:</strong> {training.caseData.differentialDiagnoses.join('; ')}</p> : null}
                    {training.caseData.references?.length ? (
                      <div className="mt-4 text-sm">
                        <strong>Referências:</strong>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {training.caseData.references.map((reference) => <li key={reference.url}><a className="underline" href={reference.url} target="_blank" rel="noreferrer">{reference.title}{reference.year ? ` (${reference.year})` : ''}</a></li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Aprendizado longitudinal</p>
                <h2 className="mt-3 font-display text-3xl text-secondary">Meu progresso</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <MetricCard icon={BookOpenText} label="Tentativas" value={learningProgress?.totalAttempts ?? 0} detail="Respostas registradas no treino" />
                  <MetricCard icon={Trophy} label="Acerto" value={learningProgress?.accuracy ?? 0} detail="Percentual global de respostas corretas" />
                  <MetricCard icon={Gauge} label="Revisões" value={learningProgress?.dueReviews ?? 0} detail="Itens vencidos para repetição espaçada" />
                </div>
                <div className="mt-8 space-y-4">
                  <div>
                    <p className="font-semibold text-secondary">Domínio por competência</p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/60">Indicador educacional calculado a partir das respostas registradas; não representa certificação de competência clínica profissional.</p>
                  </div>
                  {(learningProgress?.competencies ?? []).map((item) => (
                    <div key={item.code}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{item.label}</span>
                        <span className="font-semibold">{item.mastery}% · {item.attempts} tentativas</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${item.mastery}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Revisão de erros</p>
                <h3 className="mt-3 font-display text-3xl text-secondary">Casos para revisar</h3>
                <div className="mt-6 space-y-4">
                  {reviewErrors.map((item) => (
                    <div key={item.lastAttempt.id} className="rounded-3xl border border-border bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-secondary">{item.caseData.title}</p>
                        <Badge>{item.caseData.level}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-foreground/70">Sua resposta: {item.lastAttempt.selectedAnswer}</p>
                      <p className="mt-2 text-sm"><strong>Revisar:</strong> {item.lastAttempt.explanation}</p>
                      <Button className="mt-4" variant="outline" size="sm" onClick={() => { setActiveTab('training'); setTrainingIndex(0); }}>
                        Voltar ao treino
                      </Button>
                    </div>
                  ))}
                  {!reviewErrors.length ? <p className="rounded-3xl bg-muted p-5 text-sm text-foreground/65">Nenhum erro pendente registrado neste perfil.</p> : null}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Colaboração</p>
                <h2 className="mt-3 font-display text-3xl text-secondary">Rede de profissionais contribuindo com novos ECGs.</h2>
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl bg-muted p-5">
                    <p className="font-semibold text-secondary">Submissão distribuída</p>
                    <p className="mt-2 text-sm text-foreground/70">Professores e colaboradores podem cadastrar casos diretamente pelo banco clínico.</p>
                  </div>
                  <div className="rounded-3xl bg-muted p-5">
                    <p className="font-semibold text-secondary">Estado de moderação</p>
                    <p className="mt-2 text-sm text-foreground/70">Cada caso já registra `published` ou `pending_review`, preparando fila de aprovação futura.</p>
                  </div>
                  <div className="rounded-3xl bg-muted p-5">
                    <p className="font-semibold text-secondary">Autoria preservada</p>
                    <p className="mt-2 text-sm text-foreground/70">Todo caso mantém `createdBy`, facilitando auditoria e ranking de contribuição.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 md:p-8">
                <p className="text-sm uppercase tracking-[0.24em] text-foreground/50">Fila atual</p>
                <div className="mt-5 space-y-4">
                  {contributorCases.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-border bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-secondary">{item.title}</p>
                        <Badge>Pendente</Badge>
                      </div>
                      <p className="mt-2 text-sm text-foreground/70">Autor: {users.find((candidate) => candidate.id === item.createdBy)?.name ?? item.createdBy}</p>
                      <p className="mt-3 text-sm text-foreground/70">{item.clinicalDescription}</p>
                    </div>
                  ))}
                  {!contributorCases.length ? <p className="text-sm text-foreground/60">Nenhum caso aguardando revisão.</p> : null}
                </div>
              </Card>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof HeartPulse; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[28px] bg-muted p-5">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-4 text-3xl font-display text-secondary">{value}</p>
      <p className="mt-1 font-semibold text-secondary">{label}</p>
      <p className="mt-2 text-sm text-foreground/65">{detail}</p>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof HeartPulse; label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4">
      <Icon className="h-5 w-5 text-white/80" />
      <p className="mt-4 text-2xl font-display">{value}</p>
      <p className="text-sm text-white/65">{label}</p>
    </div>
  );
}
