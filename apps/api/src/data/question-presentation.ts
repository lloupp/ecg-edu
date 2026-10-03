import { createHash } from 'crypto';
import { LiveQuestion } from '@ecg-edu/shared';

function rank(seed: string, option: string) {
  return createHash('sha256').update(seed).update('\0').update(option).digest('hex');
}

export function presentQuestion(question: LiveQuestion, seed: string): Omit<LiveQuestion, 'correctAnswer'> {
  const { correctAnswer: _correctAnswer, ...safe } = question;
  const options = [...question.options].sort((left, right) => {
    const byRank = rank(seed, left).localeCompare(rank(seed, right));
    return byRank || left.localeCompare(right);
  });
  return { ...safe, options };
}
