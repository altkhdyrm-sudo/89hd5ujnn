import { Question } from '../types';
import { VERIFIED_QUESTIONS } from './verified-data.generated';

// Dynamic category detector based on text indicators
function getCategory(q: any): string {
  const text = (q.prompt || "") + " " + (q.instruction || "") + " " + (q.answer || "");
  const normalized = text.toLowerCase();
  
  if (
    normalized.includes("تعالى") || 
    normalized.includes("قرآن") || 
    normalized.includes("الْقُرْآن") || 
    normalized.includes("القرآن") || 
    normalized.includes("آية") || 
    normalized.includes("سورة")
  ) {
    return "آيات قرآنية";
  }
  
  if (
    normalized.includes("الشاعر") || 
    normalized.includes("البيت") || 
    normalized.includes("بيت شعر") || 
    normalized.includes("الشطر") || 
    normalized.includes("قصيدة") || 
    normalized.includes("شعرية")
  ) {
    return "أبيات شعرية";
  }
  
  const hasParenthesis = q.prompt && (q.prompt.includes("(") || q.prompt.includes("﴿") || q.prompt.includes("["));
  const promptLength = (q.prompt || "").length;
  
  if (promptLength < 40 && !hasParenthesis) {
    return "أفعال منفردة";
  }
  
  return "نصوص نثريّة";
}

// Convert verified questions to the exact Question interface consumed by the React app
export const ADAPTED_QUESTIONS: Question[] = VERIFIED_QUESTIONS.map((q: any) => {
  const category = getCategory(q);
  
  // Dynamic per-page sequential order
  const pageQuestions = VERIFIED_QUESTIONS.filter(x => x.source.pdfPageNumber === q.source.pdfPageNumber);
  const sourceOrder = pageQuestions.findIndex(x => x.id === q.id) + 1;
  
  // Mapping API-style question types to educational Arabic descriptions
  const typeMap: Record<string, string> = {
    "replace_past_verb_with_masdar": "استبدال الفعل بالصيغة المصدرية",
    "extract_masdar_from_text": "استخراج المصادر من النص",
    "masdar_of_verb_with_reason": "صياغة المصادر مع بيان السبب الصرفي",
    "sentence_representation": "تمثيل في جمل مفيدة",
    "masdar_of_underlined_verbs": "مصادر الأفعال التي تحتها خط",
    "masdar_of_verbs": "مصادر الأفعال الماضية",
    "masdar_of_verbs_with_reason": "صياغة المصادر مع بيان السبب الصرفي"
  };
  const questionType = typeMap[q.type] || "سؤال وزاري";
  
  return {
    id: q.id,
    sourcePage: q.source.pdfPageNumber,
    sourceOrder: sourceOrder,
    year: String(q.year),
    round: q.round,
    examLabel: `${q.year} - ${q.round}`,
    subject: "اللغة العربية",
    grade: "الثالث المتوسط",
    topic: "مصادر الأفعال الثلاثية وغير الثلاثية",
    category: category,
    questionType: questionType,
    requiredCount: q.choiceLimit || 1,
    instruction: q.instruction,
    // Distribute prompt content into correct visual containers
    quranText: category === "آيات قرآنية" ? q.prompt : null,
    poetryText: category === "أبيات شعرية" ? q.prompt : null,
    contextText: (category !== "آيات قرآنية" && category !== "أبيات شعرية") ? q.prompt : null,
    targetWords: q.underlinedTargets || [],
    modelAnswer: q.answer,
    answerFormat: q.answerFormat,
    answerTable: q.answerFormat === "table" ? q.answerTable : undefined,
    sourceTrace: {
      page: q.source.pdfPageNumber,
      visualOrder: sourceOrder,
      sourceExamLabel: `${q.year} ${q.round}`,
      sourceQuestionStart: q.instruction.substring(0, 30),
      sourceQuestionEnd: q.instruction.substring(q.instruction.length - 30)
    }
  };
});
