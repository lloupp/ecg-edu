import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../data/in-memory.db';

@Injectable()
export class TrainingService {
  next(index: number) {
    return db.nextTrainingQuestion(index);
  }

  answer(questionId: string, selectedAnswer: string) {
    const result = db.evaluateTraining(questionId, selectedAnswer);
    if (!result) {
      throw new NotFoundException('Pergunta não encontrada');
    }
    return result;
  }
}
