export interface AnswerRow {
  no?: number;
  verb?: string;
  source?: string;
  reason?: string;
  meaning?: string;
  [key: string]: any;
}

export interface Question {
  id: string;
  sourcePage: number;
  sourceOrder: number;
  year: string;
  round: string;
  examLabel: string;
  subject: string;
  grade: string;
  topic: string;
  category: string;
  questionType: string;
  requiredCount: number;
  instruction: string;
  contextText?: string | null;
  quranText?: string | null;
  poetryText?: string | null;
  targetWords?: string[];
  answerColumns?: string[];
  answerTable?: any;
  answerFormat?: string;
  modelAnswer?: string;
  notes?: string;
  userAnswer?: string;
  status?: 'unanswered' | 'answered' | 'rated';
  rating?: number | null;
  sourceTrace?: {
    page: number;
    visualOrder: number;
    sourceExamLabel: string;
    sourceQuestionStart: string;
    sourceQuestionEnd: string;
  };
}

export interface ExamStats {
  score: number;
  completed: boolean;
}
