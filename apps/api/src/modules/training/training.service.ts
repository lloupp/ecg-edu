import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalCase, LiveQuestion } from '@ecg-edu/shared';
import { CasesRepository, LearningRepository } from '../../data/repositories/repositories';

function safeQuestion(question: LiveQuestion) {
  const { correctAnswer: _correctAnswer, ...safe } = question;
  return safe;
}

function safeCase(caseData: ClinicalCase) {
  const {
    diagnosis: _diagnosis,
    explanation: _explanation,
    interpretation: _interpretation,
    differentialDiagnoses: _differentialDiagnoses,
    references: _references,
    reviewedBy: _reviewedBy,
    lastReviewedAt: _lastReviewedAt,
    ...safe
  } = caseData;
  return safe;
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly casesRepository: CasesRepository,
  ) {}

  async next(index: number, userId: string) {
    const { question, caseData } = await this.repository.nextTrainingQuestion(index, userId);
    return { question: safeQuestion(question), caseData: safeCase(caseData) };
  }

  async answer(questionId: string, selectedAnswer: string, userId: string) {
    const attempt = await this.repository.evaluateTraining(questionId, selectedAnswer, userId);
    if (!attempt) throw new NotFoundException('Pergunta não encontrada');
    const caseData = (await this.casesRepository.listCases()).find((item) => item.id === attempt.caseId);
    if (!caseData) throw new NotFoundException('Caso não encontrado');
    return {
      attempt,
      feedback: {
        diagnosis: caseData.diagnosis,
        explanation: attempt.explanation,
        interpretation: caseData.interpretation,
        differentialDiagnoses: caseData.differentialDiagnoses ?? [],
        references: caseData.references ?? [],
      },
    };
  }

  progress(userId: string) { return this.repository.learningProgress(userId); }
  review(userId: string) { return this.repository.reviewErrors(userId); }
}
