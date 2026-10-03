import { presentQuestion } from '../../src/data/question-presentation';
import { LiveQuestion } from '@ecg-edu/shared';

const question: LiveQuestion = {
  id: 'question-1',
  caseId: 'case-1',
  prompt: 'Qual opção?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
};

describe('question presentation', () => {
  it('removes the answer key and preserves all options', () => {
    const presented = presentQuestion(question, 'student-1');
    expect('correctAnswer' in presented).toBe(false);
    expect([...presented.options].sort()).toEqual([...question.options].sort());
  });

  it('keeps option order stable for the same presentation seed', () => {
    expect(presentQuestion(question, 'student-1').options)
      .toEqual(presentQuestion(question, 'student-1').options);
  });

  it('does not derive presentation order from which option is correct', () => {
    const alternate = { ...question, correctAnswer: 'D' };
    expect(presentQuestion(question, 'student-1').options)
      .toEqual(presentQuestion(alternate, 'student-1').options);
  });
});
