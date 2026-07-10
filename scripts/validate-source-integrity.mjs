import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();

const QUESTIONS_PATH = path.join(ROOT_DIR, "data", "questions.json");
const SOURCE_PAGES_PATH = path.join(ROOT_DIR, "data", "source-pages.json");
const PAGE_MANIFEST_PATH = path.join(ROOT_DIR, "data", "page-manifest.json");

const FORBIDDEN_PHRASES = [
  "ساد سيرة حسنة",
  "صاح صباحًا",
  "صاح صباحا",
  "العمل الصالح",
  "نموذج الوزاري النهائي",
  "النموذج الوزاري",
  "سؤال شامل",
  "وزاري معتمد",
  "مركز فحص الدراسة المتوسطة",
  "الأجوبة الوزارية المعتمدة",
  "التنمية الاقتصادية الشاملة",
  "الزراعة أساس التنمية",
  "بنجاح باهر"
];

const REQUIRED_Q001_PROMPT_PHRASES = [
  "هاج البحر",
  "صل السيف",
  "غرد الطائر",
  "راوغ الثعلب",
  "صبغت الثوب",
  "نفر الغزال"
];

const REQUIRED_Q001_ANSWER_PHRASES = [
  "هيجان البحر",
  "صليل السيف",
  "تغريد الطائر",
  "مراوغة الثعلب",
  "صباغة الثوب",
  "نفور الغزال"
];

const REQUIRED_Q001_ALL_PHRASES = [
  ...REQUIRED_Q001_PROMPT_PHRASES,
  ...REQUIRED_Q001_ANSWER_PHRASES
];

function normalizeArabicForCheck(text) {
  return String(text || "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeArabicForCheck(text) {
  return normalizeArabicForCheck(text)
    .split(" ")
    .filter(Boolean);
}

function collectStrings(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }

  return out;
}

function fail({
  reason,
  file = "-",
  question = "-",
  expected = "-",
  actual = "-"
}) {
  console.error("SOURCE INTEGRITY ERROR");
  console.error(`Reason: ${reason}`);
  console.error(`File: ${file}`);
  console.error(`Question: ${question}`);
  console.error(`Expected: ${formatValue(expected)}`);
  console.error(`Actual: ${formatValue(actual)}`);
  process.exit(1);
}

function formatValue(value) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail({
      reason: "Required file does not exist.",
      file: filePath,
      expected: "File must exist.",
      actual: "Missing file."
    });
  }

  const raw = fs.readFileSync(filePath, "utf8");

  try {
    return {
      raw,
      data: JSON.parse(raw)
    };
  } catch (error) {
    fail({
      reason: "Invalid JSON file.",
      file: filePath,
      expected: "Valid JSON.",
      actual: error.message
    });
  }
}

function assertEqual({
  actual,
  expected,
  reason,
  file,
  question = "-"
}) {
  if (actual !== expected) {
    fail({
      reason,
      file,
      question,
      expected,
      actual
    });
  }
}

function assertArrayIncludes({
  array,
  value,
  reason,
  file,
  question = "-"
}) {
  if (!Array.isArray(array) || !array.includes(value)) {
    fail({
      reason,
      file,
      question,
      expected: `Array containing: ${value}`,
      actual: array
    });
  }
}

function assertNormalizedTextContains({
  text,
  phrase,
  reason,
  file,
  question = "-"
}) {
  const normalizedText = normalizeArabicForCheck(text);
  const normalizedPhrase = normalizeArabicForCheck(phrase);

  if (!normalizedText.includes(normalizedPhrase)) {
    fail({
      reason,
      file,
      question,
      expected: phrase,
      actual: text
    });
  }
}

function assertTokenCoverage({
  text,
  phrase,
  minCoverage = 1,
  reason,
  file,
  question = "-"
}) {
  const textTokens = new Set(tokenizeArabicForCheck(text));
  const phraseTokens = tokenizeArabicForCheck(phrase);

  if (phraseTokens.length === 0) return;

  const matched = phraseTokens.filter((token) => textTokens.has(token));
  const coverage = matched.length / phraseTokens.length;

  if (coverage < minCoverage) {
    fail({
      reason,
      file,
      question,
      expected: {
        phrase,
        minCoverage,
        phraseTokens,
        matched
      },
      actual: {
        coverage,
        text
      }
    });
  }
}

function checkForbiddenPhrasesInRawText(rawText, filePath) {
  const normalizedRawText = normalizeArabicForCheck(rawText);

  for (const phrase of FORBIDDEN_PHRASES) {
    const normalizedPhrase = normalizeArabicForCheck(phrase);

    const foundRaw = rawText.includes(phrase);
    const foundNormalized = normalizedRawText.includes(normalizedPhrase);

    if (foundRaw || foundNormalized) {
      fail({
        reason: "Forbidden phrase found.",
        file: filePath,
        expected: "No forbidden phrases.",
        actual: phrase
      });
    }
  }
}

function checkQ001Basics(q001) {
  assertEqual({
    actual: q001?.source?.pdfPageNumber,
    expected: 2,
    reason: "q-001 must point to PDF page 2.",
    file: QUESTIONS_PATH,
    question: "q-001"
  });

  assertEqual({
    actual: q001?.year,
    expected: 2011,
    reason: "q-001 year mismatch.",
    file: QUESTIONS_PATH,
    question: "q-001"
  });

  assertEqual({
    actual: q001?.round,
    expected: "د1",
    reason: "q-001 round mismatch.",
    file: QUESTIONS_PATH,
    question: "q-001"
  });

  assertEqual({
    actual: q001?.isGenerated,
    expected: false,
    reason: "q-001 must not be generated.",
    file: QUESTIONS_PATH,
    question: "q-001"
  });

  assertEqual({
    actual: q001?.isRequiredFromSource,
    expected: true,
    reason: "q-001 must be marked as required from source.",
    file: QUESTIONS_PATH,
    question: "q-001"
  });
}

function checkQ001RequiredPhrases(q001) {
  const q001Text = collectStrings(q001).join("\n");

  for (const phrase of REQUIRED_Q001_ALL_PHRASES) {
    assertTokenCoverage({
      text: q001Text,
      phrase,
      minCoverage: 1,
      reason: "q-001 is missing a required source phrase.",
      file: QUESTIONS_PATH,
      question: "q-001"
    });
  }
}

function main() {
  const { raw: rawQuestionsJson, data: questionsData } = readJsonFile(QUESTIONS_PATH);
  const { raw: rawSourcePagesJson, data: sourcePagesData } = readJsonFile(SOURCE_PAGES_PATH);
  const { raw: rawPageManifestJson, data: pageManifestData } = readJsonFile(PAGE_MANIFEST_PATH);

  checkForbiddenPhrasesInRawText(rawQuestionsJson, QUESTIONS_PATH);
  checkForbiddenPhrasesInRawText(rawSourcePagesJson, SOURCE_PAGES_PATH);
  checkForbiddenPhrasesInRawText(rawPageManifestJson, PAGE_MANIFEST_PATH);

  // 1. Verify general questions data structure
  const questions = Array.isArray(questionsData.questions) ? questionsData.questions : null;
  if (!questions) {
    fail({
      reason: "questions.json must contain a questions array.",
      file: QUESTIONS_PATH
    });
  }

  // 2. Exact count of questions is 80
  assertEqual({
    actual: questions.length,
    expected: 80,
    reason: "Expanded mode requires exactly 80 questions (q-001 to q-080).",
    file: QUESTIONS_PATH
  });

  // 3. First ID is q-001, last is q-080
  assertEqual({
    actual: questions[0]?.id,
    expected: "q-001",
    reason: "First question ID must be q-001.",
    file: QUESTIONS_PATH
  });

  assertEqual({
    actual: questions[questions.length - 1]?.id,
    expected: "q-080",
    reason: "Last question ID must be q-080.",
    file: QUESTIONS_PATH
  });

  // Check unique IDs and sequential order
  const seenIds = new Set();
  let prevPageNum = 0;

  for (const [index, q] of questions.entries()) {
    const qId = q?.id;
    const expectedId = `q-${String(index + 1).padStart(3, "0")}`;

    assertEqual({
      actual: qId,
      expected: expectedId,
      reason: "Question IDs must be strictly sequential (q-001, q-002, ...).",
      file: QUESTIONS_PATH,
      question: qId || `index-${index}`
    });

    if (seenIds.has(qId)) {
      fail({
        reason: "Duplicate question ID.",
        file: QUESTIONS_PATH,
        question: qId
      });
    }
    seenIds.add(qId);

    // General field validations
    assertEqual({
      actual: q?.isGenerated,
      expected: false,
      reason: "isGenerated must be false for all questions.",
      file: QUESTIONS_PATH,
      question: qId
    });

    assertEqual({
      actual: q?.isRequiredFromSource,
      expected: true,
      reason: "isRequiredFromSource must be true.",
      file: QUESTIONS_PATH,
      question: qId
    });

    const expectedStatus = index < 26 ? "pages-2-to-11-batch" : (index < 37 ? "pages-12-to-16-batch" : (index < 52 ? "pages-17-to-21-batch" : "pages-22-to-31-final-batch"));
    assertEqual({
      actual: q?.status,
      expected: expectedStatus,
      reason: `status must be ${expectedStatus}.`,
      file: QUESTIONS_PATH,
      question: qId
    });

    // Enforce that q-001 to q-026 are not changed to table format
    const qNum = index + 1;
    if (qNum < 27) {
      if (q?.answerFormat === "table") {
        fail({
          reason: "Questions q-001 to q-026 must not have table format.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }
    }

    // Table validation for q-027 to q-080
    if (qNum >= 27 && qNum <= 80) {
      assertEqual({
        actual: q?.answerFormat,
        expected: "table",
        reason: "answerFormat must be 'table' for q-027 to q-080.",
        file: QUESTIONS_PATH,
        question: qId
      });

      const table = q?.answerTable;
      if (!table || typeof table !== "object") {
        fail({
          reason: "Missing answerTable for q-027 to q-080.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }

      const headers = table?.headers;
      if (!Array.isArray(headers) || headers.length === 0) {
        fail({
          reason: "answerTable.headers must be a non-empty array.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }

      const rows = table?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        fail({
          reason: "answerTable.rows must be a non-empty array.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }

      for (const row of rows) {
        if (!Array.isArray(row) || row.length !== headers.length) {
          fail({
            reason: "Each row in answerTable.rows must have length equal to headers.length.",
            file: QUESTIONS_PATH,
            question: qId,
            actual: row ? row.length : 0,
            expected: headers.length
          });
        }
      }
    }

    // Check source fields
    const pageId = q?.source?.pageId;
    const pdfPageNum = q?.source?.pdfPageNumber;
    const visibleLabel = q?.source?.visiblePageLabel;

    if (!pageId || typeof pageId !== "string") {
      fail({
        reason: "Missing source.pageId.",
        file: QUESTIONS_PATH,
        question: qId
      });
    }

    if (typeof pdfPageNum !== "number" || pdfPageNum < 2 || pdfPageNum > 31) {
      fail({
        reason: "pdfPageNumber must be a number between 2 and 31.",
        file: QUESTIONS_PATH,
        question: qId,
        actual: pdfPageNum
      });
    }

    if (!visibleLabel || typeof visibleLabel !== "string") {
      fail({
        reason: "Missing source.visiblePageLabel.",
        file: QUESTIONS_PATH,
        question: qId
      });
    }

    // Verify ordering by page number
    if (pdfPageNum < prevPageNum) {
      fail({
        reason: "Questions are not ordered by pdfPageNumber.",
        file: QUESTIONS_PATH,
        question: qId,
        expected: `>= ${prevPageNum}`,
        actual: pdfPageNum
      });
    }
    prevPageNum = pdfPageNum;

    // Check non-empty evidence
    const evidence = q?.source?.sourceEvidence;
    if (!Array.isArray(evidence) || evidence.length === 0) {
      fail({
        reason: "sourceEvidence must be a non-empty array of strings.",
        file: QUESTIONS_PATH,
        question: qId
      });
    }

    // Check evidence exists in source pages
    const sources = sourcePagesData?.sources || [];
    const matchedSourcePage = sources.find((s) => s?.pageId === pageId && s?.pdfPageNumber === pdfPageNum);

    if (!matchedSourcePage) {
      fail({
        reason: "Source page matching pageId and pdfPageNumber was not found in source-pages.json.",
        file: SOURCE_PAGES_PATH,
        question: qId,
        expected: `pageId=${pageId}, pdfPageNumber=${pdfPageNum}`
      });
    }

    const sourceText = matchedSourcePage.text || "";
    for (const evidenceText of evidence) {
      assertNormalizedTextContains({
        text: sourceText,
        phrase: evidenceText,
        reason: "Evidence phrase is missing from the source page text.",
        file: SOURCE_PAGES_PATH,
        question: qId
      });
    }

    // Check underlinedTargets constraints
    const textStr = (q?.instruction || "") + " " + (q?.prompt || "");
    const needsUnderline = textStr.includes("تحتها خط") || textStr.includes("تحته خط") || textStr.includes("المشار إليها");

    if (needsUnderline) {
      const targets = q?.underlinedTargets;
      if (!Array.isArray(targets) || targets.length === 0) {
        fail({
          reason: "Question requires underlinedTargets because prompt or instruction mentions underlined/indicated terms.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }

      const checkScopeText = collectStrings(q.answer).join(" ") + " " + collectStrings(q.answerTable).join(" ") + " " + collectStrings(q.source?.sourceEvidence).join(" ");
      for (const target of targets) {
        assertNormalizedTextContains({
          text: checkScopeText,
          phrase: target,
          reason: "Each item in underlinedTargets must appear in the answer or sourceEvidence.",
          file: QUESTIONS_PATH,
          question: qId
        });
      }
    }
  }

  // 4. Validate Specific q-001 Checks
  const q001 = questions[0];
  checkQ001Basics(q001);
  checkQ001RequiredPhrases(q001);

  // 5. Validate page-manifest.json integrity
  const pages = Array.isArray(pageManifestData?.pages) ? pageManifestData.pages : [];
  assertEqual({
    actual: pages.length,
    expected: 30,
    reason: "page-manifest.json must contain exactly 30 pages (pdf-p002 to pdf-p031).",
    file: PAGE_MANIFEST_PATH
  });

  for (let pageNum = 2; pageNum <= 31; pageNum++) {
    const pId = `pdf-p${String(pageNum).padStart(3, "0")}`;
    const pManifest = pages.find((p) => p?.pageId === pId);

    if (!pManifest) {
      fail({
        reason: `Missing page ${pId} in page-manifest.json.`,
        file: PAGE_MANIFEST_PATH,
        expected: `pageId=${pId}`
      });
    }

    assertEqual({
      actual: pManifest?.pdfPageNumber,
      expected: pageNum,
      reason: `pdfPageNumber mismatch for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    const expectedPageStatus = pageNum <= 11 ? "pages-2-to-11-batch" : (pageNum <= 16 ? "pages-12-to-16-batch" : (pageNum <= 21 ? "pages-17-to-21-batch" : "pages-22-to-31-final-batch"));
    assertEqual({
      actual: pManifest?.status,
      expected: expectedPageStatus,
      reason: `status mismatch for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    assertEqual({
      actual: pManifest?.includedInSourcePages,
      expected: true,
      reason: `includedInSourcePages must be true for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    // Find actual questions in this page
    const actualQuestions = questions.filter((q) => q?.source?.pageId === pId);
    const actualCount = actualQuestions.length;
    const actualIds = actualQuestions.map((q) => q?.id);

    assertEqual({
      actual: pManifest?.expectedQuestionsOnPage,
      expected: actualCount,
      reason: `expectedQuestionsOnPage mismatch for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    assertEqual({
      actual: pManifest?.seededQuestionsCount,
      expected: actualCount,
      reason: `seededQuestionsCount mismatch for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    // Check array equality of ids
    const seededIds = Array.isArray(pManifest?.seededQuestionIds) ? pManifest.seededQuestionIds : [];
    assertEqual({
      actual: seededIds.length,
      expected: actualCount,
      reason: `seededQuestionIds length mismatch for page ${pId}.`,
      file: PAGE_MANIFEST_PATH
    });

    for (const id of actualIds) {
      assertArrayIncludes({
        array: seededIds,
        value: id,
        reason: `seededQuestionIds of page ${pId} must include ${id}.`,
        file: PAGE_MANIFEST_PATH
      });
    }
  }

  console.log("SOURCE INTEGRITY OK");
  console.log("Checked questions: 80");
  console.log("Mode: pages-2-to-31-final-batch");
  console.log("Checked pages: pdf-p002 to pdf-p031");
  console.log("q-001: OK");
}

main();
