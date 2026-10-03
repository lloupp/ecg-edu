import { randomUUID } from 'crypto';
import { ClinicalCase, UserProfile } from '@ecg-edu/shared';
import { db } from '../in-memory.db';
import { AuthRepository, CasesRepository, LearningRepository, UsersRepository } from './repositories';

type MemorySession = { userId: string; expiresAt: string; revoked: boolean };

export class MemoryRepository implements AuthRepository, CasesRepository, LearningRepository, UsersRepository {
  private readonly passwordHashes = new Map<string, string>();
  private readonly sessions = new Map<string, MemorySession>();

  async findAuthUserByEmail(email: string) {
    const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    return user ? { user, passwordHash: this.passwordHashes.get(user.id) ?? null } : undefined;
  }

  async createStudentAccount(input: { name: string; email: string; passwordHash: string }): Promise<UserProfile> {
    if (db.users.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) throw new Error('duplicate email');
    const user: UserProfile = {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      role: 'student',
      institution: 'Comunidade ECG Edu',
      specialty: 'Aprendizagem em ECG',
    };
    db.users.push(user);
    this.passwordHashes.set(user.id, input.passwordHash);
    return user;
  }

  async createAuthSession(input: { userId: string; tokenHash: string; expiresAt: string }) {
    this.sessions.set(input.tokenHash, { userId: input.userId, expiresAt: input.expiresAt, revoked: false });
  }

  async resolveAuthSession(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revoked || Date.parse(session.expiresAt) <= Date.now()) return undefined;
    return db.users.find((item) => item.id === session.userId);
  }

  async revokeAuthSession(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (session) session.revoked = true;
  }

  async listUsers() { return db.listUsers(); }
  async metrics() { return db.metrics(); }
  async listCases() { return db.listCases(); }
  async createCase(payload: Omit<ClinicalCase, 'id'>) { return db.createCase(payload); }
  async updateCase(id: string, payload: Partial<Omit<ClinicalCase, 'id'>>) { return db.updateCase(id, payload); }
  async deleteCase(id: string) { return db.deleteCase(id); }
  async nextTrainingQuestion(index: number, userId?: string) { return db.nextTrainingQuestion(index, userId); }
  async evaluateTraining(questionId: string, answer: string, userId?: string) { return db.evaluateTraining(questionId, answer, userId); }
  async learningProgress(userId: string) { return db.learningProgress(userId); }
  async reviewErrors(userId: string) { return db.reviewErrors(userId); }
}
