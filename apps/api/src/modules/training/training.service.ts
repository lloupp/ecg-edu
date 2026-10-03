import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../data/in-memory.db';

@Injectable()
export class TrainingService {
  next(index: number, userId?: string) {
    return db.nextTrainingQuestion(index, userId);
  }

  answer(questionId: string, selectedAnswer: string, userId?: string) {
    const result = db.evaluateTraining(questionId, selectedAnswer, userId);
    if (!result) {
      throw new NotFoundException('Pergunta não encontrada');
    }
    return result;
  }

  progress(userId: string) {
    return db.learningProgress(userId);
  }

  review(userId: string) {
    return db.reviewErrors(userId);
  }
}
