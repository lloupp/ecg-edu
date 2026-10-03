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


  describe('clinical content governance', () => {
    it('mantém caso sem referência em revisão mesmo se publicação for solicitada', () => {
      const created = db.createCase({
        title: 'Caso sem fonte',
        ecgImageUrl: '/ecgs/ecg-af.svg',
        clinicalDescription: 'descricao',
        diagnosis: 'DX',
        explanation: 'explicacao',
        level: 'basic',
        tags: ['teste'],
        createdBy: 'u-teacher-1',
        status: 'published',
        references: [],
      });

      expect(created.status).toBe('pending_review');
    });

    it('permite publicar caso com referência clínica registrada', () => {
      const created = db.createCase({
        title: 'Caso com fonte',
        ecgImageUrl: '/ecgs/ecg-af.svg',
        clinicalDescription: 'descricao',
        diagnosis: 'DX',
        explanation: 'explicacao',
        level: 'basic',
        tags: ['teste'],
        createdBy: 'u-teacher-1',
        status: 'published',
        references: [{ title: 'Diretriz', organization: 'Sociedade médica', url: 'https://example.org/guideline' }],
      });

      expect(created.status).toBe('published');
    });
  });

  describe('learning progress', () => {
    it('registra tentativa por usuário, atualiza domínio e inclui erro na revisão', () => {
      const attempt = db.evaluateTraining('q-af', 'resposta incorreta', 'u-student-1');
      const progress = db.learningProgress('u-student-1');
      const review = db.reviewErrors('u-student-1');

      expect(attempt?.isCorrect).toBe(false);
      expect(progress.totalAttempts).toBe(1);
      expect(progress.accuracy).toBe(0);
      expect(progress.competencies.find((item) => item.code === 'rhythm')?.attempts).toBe(1);
      expect(review).toHaveLength(1);
      expect(review[0].caseData.id).toBe('case-af');
    });

    it('remove o caso da revisão de erros quando a tentativa mais recente é correta', () => {
      db.evaluateTraining('q-af', 'errada', 'u-student-1');
      db.evaluateTraining('q-af', 'Fibrilação atrial', 'u-student-1');

      expect(db.reviewErrors('u-student-1')).toHaveLength(0);
      expect(db.learningProgress('u-student-1').accuracy).toBe(50);
    });
  });
});
