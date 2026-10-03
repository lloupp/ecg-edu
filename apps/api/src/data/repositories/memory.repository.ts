import { ClinicalCase, UserRole } from '@ecg-edu/shared';
import { db } from '../in-memory.db';
import { CasesRepository, LearningRepository, UsersRepository } from './repositories';

// Adapter preserves the demonstration mode and existing deterministic unit tests.
export class MemoryRepository implements CasesRepository, LearningRepository, UsersRepository {
  async login(email: string, role: UserRole) { return db.login(email, role); }
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
