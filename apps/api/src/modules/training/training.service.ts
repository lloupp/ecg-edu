import { randomInt } from 'node:crypto';
import { casePreview } from '../auth/case-preview';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CasesRepository, LearningRepository } from '../../data/repositories/repositories';

@Injectable()
export class TrainingService {
  constructor(private readonly repository: LearningRepository, private readonly cases: CasesRepository) {}
  async next(index: number, userId?: string) {
    const result = await this.repository.nextTrainingQuestion(index, userId);
    const { correctAnswer, ...question } = result.question;
    const options = [...question.options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); [options[i], options[j]] = [options[j], options[i]];
    }
    return { question: { ...question, prompt: 'Qual o diagnóstico mais provável deste padrão didático?', options }, caseData: casePreview(result.caseData) };
  }

  async answer(questionId: string, selectedAnswer: string, userId?: string) {
    const result = await this.repository.evaluateTraining(questionId, selectedAnswer, userId);
    if (!result) {
      throw new NotFoundException('Pergunta não encontrada');
    }
    return { ...result, caseData: (await this.cases.listCases()).find((c) => c.id === result.caseId) };
  }

  progress(userId: string) {
    return this.repository.learningProgress(userId);
  }

  review(userId: string) {
    return this.repository.reviewErrors(userId);
  }
}
