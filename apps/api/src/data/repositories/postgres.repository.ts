import { randomUUID } from 'crypto';
import { BadRequestException, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ClinicalCase, LiveQuestion, TrainingAttempt, UserProfile, UserRole } from '@ecg-edu/shared';
import { LearningEngine } from '../learning-engine';
import { CasesRepository, LearningRepository, UsersRepository } from './repositories';

const caseColumns = {
  title: 'title', ecgImageUrl: 'ecg_image_url', clinicalDescription: 'clinical_description',
  diagnosis: 'diagnosis', explanation: 'explanation', level: 'level', tags: 'tags',
  createdBy: 'created_by', status: 'status', ecgImageKind: 'ecg_image_kind', imageSource: 'image_source',
  learningObjectives: 'learning_objectives', competencies: 'competencies', differentialDiagnoses: 'differential_diagnoses',
  interpretation: 'interpretation', references: 'clinical_references', reviewedBy: 'reviewed_by', lastReviewedAt: 'last_reviewed_at',
} as const;
const caseSelect = ['c.id', ...Object.entries(caseColumns).map(([key, col]) => `c.${col} AS "${key}"`),
  '(SELECT q.id FROM live_questions q WHERE q.case_id = c.id ORDER BY q.id LIMIT 1) AS "liveQuestionId"',
  "to_char(c.last_reviewed_at, 'YYYY-MM-DD') AS \"lastReviewedAt\""].join(', ');
const userSelect = 'id, name, email, role, institution, specialty';
const questionSelect = 'id, case_id AS "caseId", prompt, options, correct_answer AS "correctAnswer"';
const attemptSelect = 'id, user_id AS "userId", question_id AS "questionId", case_id AS "caseId", selected_answer AS "selectedAnswer", is_correct AS "isCorrect", explanation_snapshot AS explanation, competency_codes AS "competencyCodes", created_at AS "answeredAt", next_review_at AS "nextReviewAt"';

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException('Identificador inválido');
  }
  return value;
}
function storedValue(key: string, value: unknown) {
  return key === 'references' || key === 'interpretation' ? JSON.stringify(value ?? (key === 'references' ? [] : null)) : value ?? null;
}

export class PostgresRepository implements CasesRepository, LearningRepository, UsersRepository, OnModuleInit, OnModuleDestroy {
  readonly pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
      statement_timeout: 10000, application_name: 'ecg-edu-api' });
    this.pool.on('error', () => Logger.error('PostgreSQL connection error', 'DataRepository'));
  }

  async onModuleInit() {
    // Startup never creates schema, runs migrations, seeds data or falls back to memory.
    await this.pool.query('SELECT archived_at FROM clinical_cases LIMIT 0');
    await this.pool.query('SELECT explanation_snapshot FROM training_attempts LIMIT 0');
  }
  async onModuleDestroy() { await this.pool.end(); }

  private async transaction<T>(action: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async login(email: string, role: UserRole): Promise<UserProfile> {
    const normalized = email.trim().toLowerCase();
    // Demonstration only; production startup is blocked independently of DATABASE_URL.
    const name = normalized.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const { rows } = await this.pool.query<UserProfile>(`INSERT INTO users(id, name, email, role, institution, specialty)
      VALUES ($1,$2,$3,$4,'Comunidade ECG Edu','Aprendizagem educacional')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING ${userSelect}`, [randomUUID(), name, normalized, role]);
    if (rows[0].role !== role) throw new BadRequestException('E-mail vinculado a outro perfil');
    return rows[0];
  }
  async listUsers() { return (await this.pool.query<UserProfile>(`SELECT ${userSelect} FROM users ORDER BY name, id`)).rows; }
  async metrics() {
    const { rows } = await this.pool.query<{ total: string; published: string; pending: string }>(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'published') AS published,
      COUNT(*) FILTER (WHERE status = 'pending_review') AS pending FROM clinical_cases WHERE archived_at IS NULL`);
    return { totalCases: Number(rows[0].total), publishedCases: Number(rows[0].published), pendingCases: Number(rows[0].pending), liveSessions: 0, activeStudents: 0 };
  }
  async listCases() {
    return (await this.pool.query<ClinicalCase>(`SELECT ${caseSelect} FROM clinical_cases c WHERE c.archived_at IS NULL ORDER BY c.created_at DESC, c.id`)).rows;
  }
  async createCase(payload: Omit<ClinicalCase, 'id'>): Promise<ClinicalCase> {
    uuid(payload.createdBy);
    if (payload.reviewedBy) uuid(payload.reviewedBy);
    const data = { ...payload, ecgImageKind: payload.ecgImageKind ?? 'schematic',
      learningObjectives: payload.learningObjectives ?? [], competencies: payload.competencies?.length ? payload.competencies : ['diagnosis'],
      differentialDiagnoses: payload.differentialDiagnoses ?? [], references: payload.references ?? [],
      status: payload.status === 'published' && payload.references?.length ? 'published' : 'pending_review' };
    const keys = Object.keys(caseColumns) as (keyof typeof caseColumns)[];
    const id = randomUUID();
    const questionId = randomUUID();
    return this.transaction(async (client) => {
      await client.query(`INSERT INTO clinical_cases(id,${keys.map((key) => caseColumns[key]).join(',')})
        VALUES (${[id, ...keys].map((_, i) => `$${i + 1}`).join(',')})`, [id, ...keys.map((key) => storedValue(key, data[key]))]);
      await client.query('INSERT INTO live_questions(id,case_id,prompt,options,correct_answer) VALUES($1,$2,$3,$4,$5)',
        [questionId, id, `Qual o melhor diagnóstico para o caso ${data.title}?`, JSON.stringify([...new Set([data.diagnosis, 'Pericardite aguda', 'Taquicardia sinusal', 'ECG normal'])]), data.diagnosis]);
      return (await client.query<ClinicalCase>(`SELECT ${caseSelect} FROM clinical_cases c WHERE c.id = $1`, [id])).rows[0];
    });
  }
  async updateCase(id: string, payload: Partial<Omit<ClinicalCase, 'id'>>): Promise<ClinicalCase | undefined> {
    uuid(id);
    if (payload.createdBy) uuid(payload.createdBy);
    if (payload.reviewedBy) uuid(payload.reviewedBy);
    return this.transaction(async (client) => {
      await client.query('SELECT id FROM clinical_cases WHERE id = $1 FOR UPDATE', [id]);
      const current = (await client.query<ClinicalCase>(`SELECT ${caseSelect} FROM clinical_cases c WHERE c.id = $1 AND c.archived_at IS NULL`, [id])).rows[0];
      if (!current) return undefined;
      const next = { ...payload };
      if ((next.status ?? current.status) === 'published' && !(next.references ?? current.references)?.length) next.status = 'pending_review';
      const keys = (Object.keys(caseColumns) as (keyof typeof caseColumns)[]).filter((key) => next[key] !== undefined);
      if (keys.length) {
        await client.query(`UPDATE clinical_cases SET ${keys.map((key, i) => `${caseColumns[key]}=$${i + 2}`).join(',')},updated_at=NOW() WHERE id=$1`, [id, ...keys.map((key) => storedValue(key, next[key]))]);
        if (next.diagnosis !== undefined || next.title !== undefined) {
          const diagnosis = next.diagnosis ?? current.diagnosis;
          await client.query('UPDATE live_questions SET prompt=$2,options=$3,correct_answer=$4 WHERE case_id=$1',
            [id, `Qual o melhor diagnóstico para o caso ${next.title ?? current.title}?`, JSON.stringify([...new Set([diagnosis, 'Pericardite aguda', 'Taquicardia sinusal', 'ECG normal'])]), diagnosis]);
        }
      }
      return (await client.query<ClinicalCase>(`SELECT ${caseSelect} FROM clinical_cases c WHERE c.id=$1`, [id])).rows[0];
    });
  }
  async deleteCase(id: string): Promise<boolean> {
    // Logical removal preserves existing questions, attempts and historical learning data.
    const result = await this.pool.query('UPDATE clinical_cases SET archived_at=NOW(),updated_at=NOW() WHERE id=$1 AND archived_at IS NULL', [uuid(id)]);
    return result.rowCount === 1;
  }

  private async engine(client: PoolClient, userId?: string, publishedOnly = false) {
    const cases = (await client.query<ClinicalCase>(`SELECT ${caseSelect} FROM clinical_cases c ${publishedOnly ? "WHERE c.archived_at IS NULL AND c.status='published'" : ''} ORDER BY c.id`)).rows;
    const questions = (await client.query<LiveQuestion>(`SELECT ${questionSelect} FROM live_questions ORDER BY id`)).rows.filter((q) => cases.some((c) => c.id === q.caseId));
    const attempts = userId ? (await client.query<TrainingAttempt & { answeredAt: Date; nextReviewAt: Date }>(
      `SELECT ${attemptSelect} FROM training_attempts WHERE user_id=$1 ORDER BY created_at,id`, [uuid(userId)])).rows.map((a) => ({ ...a,
      answeredAt: new Date(a.answeredAt).toISOString(), nextReviewAt: new Date(a.nextReviewAt).toISOString() })) : [];
    return new LearningEngine(cases, questions, attempts, false);
  }
  async nextTrainingQuestion(index: number, userId?: string) {
    return this.transaction(async (client) => {
      const engine = await this.engine(client, userId, true);
      if (!engine.questions.length) throw new NotFoundException('Nenhuma pergunta publicada disponível');
      // Stable rotation across requests and restarts; no per-request reshuffle.
      engine.questions.sort((a, b) => a.id.localeCompare(b.id));
      return engine.nextTrainingQuestion(index, userId);
    }, true);
  }
  async evaluateTraining(questionId: string, selectedAnswer: string, userId?: string) {
    uuid(questionId);
    return this.transaction(async (client) => {
      if (userId) {
        const user = await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [uuid(userId)]);
        if (!user.rowCount) throw new NotFoundException('Usuário não encontrado');
      }
      // Shared lock keeps content/archival consistent through evaluation and insertion.
      await client.query('SELECT c.id FROM clinical_cases c JOIN live_questions q ON q.case_id=c.id WHERE q.id=$1 FOR SHARE OF c', [questionId]);
      const engine = await this.engine(client, userId, true);
      const result = engine.evaluateTraining(questionId, selectedAnswer, userId);
      if (result && userId) {
        await client.query(`INSERT INTO training_attempts(id,user_id,question_id,case_id,selected_answer,is_correct,competency_codes,created_at,next_review_at,explanation_snapshot)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [result.id, userId, result.questionId, result.caseId, result.selectedAnswer,
          result.isCorrect, result.competencyCodes, result.answeredAt, result.nextReviewAt, result.explanation]);
      }
      return result;
    });
  }
  async learningProgress(userId: string) {
    return this.transaction(async (client) => {
      const progress = (await this.engine(client, userId)).learningProgress(userId);
      // Keep historical scores, but do not schedule unavailable/archived questions for review.
      const { rows } = await client.query<{ count: string }>(`WITH latest AS (
        SELECT DISTINCT ON (question_id) question_id, next_review_at FROM training_attempts
        WHERE user_id=$1 ORDER BY question_id, created_at DESC, id DESC
      ) SELECT COUNT(*) FROM latest a JOIN live_questions q ON q.id=a.question_id
        JOIN clinical_cases c ON c.id=q.case_id
        WHERE c.archived_at IS NULL AND c.status='published' AND a.next_review_at <= NOW()`, [uuid(userId)]);
      return { ...progress, dueReviews: Number(rows[0].count) };
    }, true);
  }
  async reviewErrors(userId: string) { return this.transaction(async (client) => (await this.engine(client, userId)).reviewErrors(userId), true); }
}
