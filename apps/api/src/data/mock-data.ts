import { ClinicalCase, LiveQuestion, UserProfile } from '@ecg-edu/shared';

export const usersSeed: UserProfile[] = [
  {
    id: 'u-teacher-1',
    name: 'Dra. Marina Costa',
    email: 'marina@ecgedu.com',
    role: 'teacher',
    institution: 'Instituto do Coração',
    specialty: 'Cardiologia Clínica',
  },
  {
    id: 'u-student-1',
    name: 'Lucas Almeida',
    email: 'lucas@ecgedu.com',
    role: 'student',
    institution: 'Residência HU',
    specialty: 'Clínica Médica',
  },
  {
    id: 'u-student-2',
    name: 'Ana Ribeiro',
    email: 'ana@ecgedu.com',
    role: 'student',
    institution: 'Liga de Cardiologia',
    specialty: 'Internato',
  },
];

export const casesSeed: ClinicalCase[] = [
  {
    id: 'case-af',
    title: 'FA com resposta ventricular rápida',
    ecgImageUrl: '/ecgs/ecg-af.svg',
    clinicalDescription: 'Paciente de 72 anos com palpitações súbitas, dispneia leve e histórico de hipertensão arterial.',
    diagnosis: 'Fibrilação atrial com resposta ventricular rápida',
    explanation: 'Ausência de ondas P organizadas, irregularidade RR marcada e frequência ventricular elevada sugerem fibrilação atrial.',
    level: 'basic',
    tags: ['arritmia', 'fibrilacao atrial', 'urgencia'],
    createdBy: 'u-teacher-1',
    status: 'published',
  },
  {
    id: 'case-stemi',
    title: 'IAM com supra de parede inferior',
    ecgImageUrl: '/ecgs/ecg-stemi.svg',
    clinicalDescription: 'Homem de 58 anos com dor torácica opressiva há 40 minutos, sudorese e náuseas.',
    diagnosis: 'Infarto agudo do miocárdio com supra de ST em parede inferior',
    explanation: 'Supradesnivelamento de ST em derivações inferiores com quadro clínico compatível exige reperfusão imediata.',
    level: 'intermediate',
    tags: ['isquemia', 'iam', 'stemi'],
    createdBy: 'u-teacher-1',
    status: 'published',
  },
  {
    id: 'case-brugada',
    title: 'Padrão de Brugada tipo 1',
    ecgImageUrl: '/ecgs/ecg-brugada.svg',
    clinicalDescription: 'Paciente de 34 anos com síncope noturna e antecedente familiar de morte súbita.',
    diagnosis: 'Padrão de Brugada tipo 1',
    explanation: 'Elevação convexa do ST em V1-V2 com morfologia em coved e contexto clínico compatível sugerem síndrome de Brugada.',
    level: 'advanced',
    tags: ['canalopatia', 'morte subita', 'brugada'],
    createdBy: 'u-student-1',
    status: 'pending_review',
  },
];

export const questionsSeed: LiveQuestion[] = [
  {
    id: 'q-af',
    caseId: 'case-af',
    prompt: 'Qual o diagnóstico mais provável deste ECG?',
    options: ['Flutter atrial', 'Fibrilação atrial', 'TPSV', 'Taquicardia ventricular'],
    correctAnswer: 'Fibrilação atrial',
  },
  {
    id: 'q-stemi',
    caseId: 'case-stemi',
    prompt: 'Qual a principal conduta inicial após reconhecer este padrão?',
    options: ['Alta com antiácido', 'Aguardar troponina', 'Estratificação ambulatorial', 'Ativar protocolo de reperfusão'],
    correctAnswer: 'Ativar protocolo de reperfusão',
  },
  {
    id: 'q-brugada',
    caseId: 'case-brugada',
    prompt: 'Qual achado reforça o risco clínico deste padrão?',
    options: ['Dor pleurítica', 'Hipertensão isolada', 'Síncope inexplicada', 'Bloqueio AV de primeiro grau'],
    correctAnswer: 'Síncope inexplicada',
  },
];
