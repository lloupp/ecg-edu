import { Injectable, NotFoundException } from '@nestjs/common';
import { LearningRepository } from '../../data/repositories/repositories';

@Injectable()
export class TrainingService {
  constructor(private readonly repository: LearningRepository) {}
  next(index: number, userId?: string) {
    return this.repository.nextTrainingQuestion(index, userId);
  }

  async answer(questionId: string, selectedAnswer: string, userId?: string) {
    const result = await this.repository.evaluateTraining(questionId, selectedAnswer, userId);
    if (!result) {
      throw new NotFoundException('Pergunta não encontrada');
    }
    return result;
  }

  progress(userId: string) {
    return this.repository.learningProgress(userId);
  }

  review(userId: string) {
    return this.repository.reviewErrors(userId);
  }
}
