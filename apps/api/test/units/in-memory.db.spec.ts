import { InMemoryDatabase } from '../../src/data/in-memory.db';

describe('InMemoryDatabase', () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    db = new InMemoryDatabase();
  });

  describe('createCase (F1)', () => {
    it('retorna liveQuestionId que aponta para a pergunta gerada do caso', () => {
      const created = db.createCase({
        title: 'Caso de teste',
        ecgImageUrl: '/ecgs/ecg-af.svg',
        clinicalDescription: 'descricao',
        diagnosis: 'DX',
        explanation: 'explicacao',
        level: 'basic',
        tags: ['teste'],
        createdBy: 'u-teacher-1',
        status: 'published',
      });

      expect(created.liveQuestionId).toBeDefined();
      const questions = (db as unknown as { questions: { id: string; caseId: string }[] }).questions;
      const question = questions.find((q) => q.id === created.liveQuestionId);
      expect(question).toBeDefined();
      expect(question?.caseId).toBe(created.id);
    });
  });

  describe('training (F3)', () => {
    it('não repete a pergunta imediatamente entre índices consecutivos', () => {
      const seen = new Set<string>();
      let previous: string | null = null;
      for (let i = 0; i < 12; i += 1) {
        const { question } = db.nextTrainingQuestion(i);
        expect(question.id).not.toBe(previous);
        previous = question.id;
        seen.add(question.id);
      }
      expect(seen.size).toBe(3);
    });

    it('avalia resposta ignorando caixa e espaços', () => {
      const { question } = db.nextTrainingQuestion(0);
      const correct = db.evaluateTraining(question.id, `  ${question.correctAnswer.toUpperCase()}  `);
      expect(correct?.isCorrect).toBe(true);
      const wrong = db.evaluateTraining(question.id, 'resposta incorreta');
      expect(wrong?.isCorrect).toBe(false);
    });
  });

  describe('metrics (F4)', () => {
    it('conta alunos ativos apenas de sessões não finalizadas', () => {
      const active = db.startSession('u-teacher-1', 'Aula ativa', ['q-af']);
      db.joinSession(active.code, 'Aluno1');
      db.joinSession(active.code, 'Aluno2');

      const finished = db.startSession('u-teacher-1', 'Aula finalizada', ['q-af']);
      db.joinSession(finished.code, 'Aluno3');
      db.activateSession(finished.code);
      db.advanceSession(finished.code);

      expect(db.findSessionByCode(finished.code)?.status).toBe('finished');

      const metrics = db.metrics();
      expect(metrics.activeStudents).toBe(2);
    });
  });
});
