import { ClinicalCase, UserProfile } from '@ecg-edu/shared';
import { ConflictException } from '@nestjs/common';
import { db } from '../in-memory.db';
import { AuthRepository, CasesRepository, LearningRepository, UsersRepository } from './repositories';

// Adapter preserves the demonstration mode and existing deterministic unit tests.
export class MemoryRepository implements AuthRepository, CasesRepository, LearningRepository, UsersRepository {
  private credentials = new Map<string, string>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  async createAccount(user: UserProfile, passwordHash: string) {
    if (db.users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) throw new ConflictException('E-mail indisponível para cadastro');
    db.users.push(user); this.credentials.set(user.id, passwordHash); return user;
  }
  async findCredential(email: string) {
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    const passwordHash = user && this.credentials.get(user.id);
    return user && passwordHash ? { user, passwordHash } : undefined;
  }
  async createSession(tokenHash: string, userId: string, expiresAt: Date) {
    for (const [key, session] of this.sessions) if (session.expiresAt.getTime() <= Date.now()) this.sessions.delete(key);
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async sessionUser(tokenHash: string) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt.getTime() <= Date.now()) { this.sessions.delete(tokenHash); return undefined; }
    return db.users.find((u) => u.id === session.userId);
  }
  async revokeSession(tokenHash: string) { this.sessions.delete(tokenHash); }
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
