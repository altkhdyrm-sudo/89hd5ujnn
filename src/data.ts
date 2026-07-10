import { Question } from './types';
import { ADAPTED_QUESTIONS } from './data/verified-data.adapter';

export const CATEGORIES = ["الكل", "آيات قرآنية", "أبيات شعرية", "نصوص نثريّة", "أفعال منفردة"];

// Combining all parts into a single array containing all 26 verified questions.
export const INITIAL_QUESTIONS: Question[] = ADAPTED_QUESTIONS;

// Page audit verification array dynamically computed for pages 1 to 31
interface PageAuditEntry {
  pageNumber: number;
  expectedCount: number;
  actualCount: number;
  isVerified: boolean;
}

// Expected counts map for pages 1 to 31 based on the verified page-manifest files (pages 2 to 31)
const EXPECTED_PAGE_COUNTS: Record<number, number> = {
  1: 0, // Cover/intro page
  2: 4, 3: 3, 4: 3, 5: 2, 6: 2, 7: 3, 8: 2, 9: 2, 10: 3, 11: 2,
  12: 2, 13: 2, 14: 2, 15: 2, 16: 3,
  17: 2, 18: 3, 19: 3, 20: 3, 21: 4,
  22: 4, 23: 3, 24: 4, 25: 3, 26: 3, 27: 2, 28: 2, 29: 3, 30: 2, 31: 2
};

export const pageAudit: PageAuditEntry[] = Array.from({ length: 31 }, (_, i) => {
  const pageNumber = i + 1;
  const expectedCount = EXPECTED_PAGE_COUNTS[pageNumber] || 0;
  const actualCount = INITIAL_QUESTIONS.filter(q => q.sourcePage === pageNumber).length;
  return {
    pageNumber,
    expectedCount,
    actualCount,
    isVerified: actualCount === expectedCount
  };
});

const totalQuestionsExpected = 80;
const totalQuestionsActual = INITIAL_QUESTIONS.length;

if (totalQuestionsActual !== totalQuestionsExpected) {
  console.warn(`[Audit Warning] Total questions mismatch! Expected: ${totalQuestionsExpected}, Actual: ${totalQuestionsActual}`);
} else {
  console.log(`[Audit Success] All ${totalQuestionsExpected} questions loaded and verified page-by-page!`);
}
