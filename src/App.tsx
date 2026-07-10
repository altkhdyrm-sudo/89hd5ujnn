// GitHub Pages white screen fix verified - 98FFTY
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_QUESTIONS, CATEGORIES } from './data';
import { Question, ExamStats } from './types';

export default function App() {
  // Clean up old keys if version mismatch
  const DATA_SCHEMA_VERSION = "pages-2-to-16-q037-answer-table-v1";
  try {
    const currentVer = localStorage.getItem('madrasati-data-schema-version');
    if (currentVer !== DATA_SCHEMA_VERSION) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('madrasiy') ||
          key.includes('madrasati') ||
          key.includes('exam') ||
          key.includes('quiz') ||
          key.includes('answers') ||
          key.includes('questions') ||
          key.includes('currentQuestion') ||
          key.includes('savedState') ||
          key.includes('student') ||
          key.includes('timer')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
      localStorage.setItem('madrasati-data-schema-version', DATA_SCHEMA_VERSION);
    }
  } catch (e) {
    console.warn('[Madrasati] Error cleaning up localStorage:', e);
  }

  // Load initial data from localStorage or fallback to defaults (using v6 key for verbal nouns dataset)
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('madrasati-arabic-verbal-nouns-grade3-v6');
      if (saved) {
        const parsed = JSON.parse(saved) as any[];
        if (Array.isArray(parsed) && parsed.length === INITIAL_QUESTIONS.length) {
          // Verify that we are loading the right questions (check id prefix)
          if (parsed[0].id && String(parsed[0].id).startsWith('q-')) {
            return INITIAL_QUESTIONS.map(initQ => {
              const savedQ = parsed.find(pq => pq.id === initQ.id);
              return {
                ...initQ,
                userAnswer: savedQ ? (savedQ.userAnswer || '') : '',
                status: savedQ ? (savedQ.status || 'unanswered') : 'unanswered',
                rating: savedQ && savedQ.rating !== undefined ? savedQ.rating : null
              };
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Madrasati] Error loading questions from local storage:', e);
      try {
        localStorage.removeItem('madrasati-arabic-verbal-nouns-grade3-v6');
      } catch (_) {}
    }
    return INITIAL_QUESTIONS.map(q => ({
      ...q,
      userAnswer: '',
      status: 'unanswered',
      rating: null
    }));
  });

  const [currentScreen, setCurrentScreen] = useState<'home' | 'practice'>('home');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(5);
  
  // Theme management
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('madrasati-arabic-verbal-nouns-grade3-v5-theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
    } catch (e) {
      console.warn('[Madrasati] Error loading theme from local storage:', e);
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('madrasati-arabic-verbal-nouns-grade3-v6-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('madrasati-arabic-verbal-nouns-grade3-v6-theme', 'light');
      }
    } catch (e) {
      console.warn('[Madrasati] Error writing theme to local storage:', e);
    }
  }, [darkMode]);

  // Persist questions to localStorage on any state changes
  useEffect(() => {
    try {
      localStorage.setItem('madrasati-arabic-verbal-nouns-grade3-v6', JSON.stringify(questions));
    } catch (e) {
      console.warn('[Madrasati] Error writing questions to local storage:', e);
    }
  }, [questions]);

  // Helper to convert English digits to Arabic numerals for scholastic aesthetic
  const toArabicNumbers = (str: string | number): string => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).replace(/[0-9]/g, (w) => arabicDigits[+w]);
  };

  // Helper to get question sequential number from its ID
  const getQuestionNumber = (q: Question): number => {
    if (!q || !q.id) return 1;
    return parseInt(q.id.replace('q-', ''), 10);
  };

  useEffect(() => {
    console.log("[Madrasati] App rendered");
  }, []);

  // Helper to highlight target words in text while preserving diacritics
  const renderHighlightedText = (text: string, targetWords?: string[]) => {
    if (!text) return null;
    if (!targetWords || targetWords.length === 0) return <span>{text}</span>;

    const normalizeArabic = (str: string): string => {
      return str
        .replace(/[\u064B-\u065F]/g, '') // strip diacritics
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .trim()
        .toLowerCase();
    };

    const normalizedTargets = targetWords
      .map(w => normalizeArabic(w))
      .filter(Boolean);

    if (normalizedTargets.length === 0) return <span>{text}</span>;

    // Build clean mapping
    const originalIndices: number[] = [];
    let normalizedText = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[\u064B-\u065F]/.test(char)) {
        continue;
      }
      normalizedText += char;
      originalIndices.push(i);
    }
    originalIndices.push(text.length);

    // Normalize the text string
    normalizedText = normalizedText
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .toLowerCase();

    // Find matches
    const intervals: [number, number][] = [];
    normalizedTargets.forEach(target => {
      let pos = 0;
      while ((pos = normalizedText.indexOf(target, pos)) !== -1) {
        intervals.push([pos, pos + target.length]);
        pos += target.length;
      }
    });

    if (intervals.length === 0) return <span>{text}</span>;

    // Sort and merge intervals
    intervals.sort((a, b) => a[0] - b[0] || (b[1] - a[1]));
    const merged: [number, number][] = [];
    let current: [number, number] | null = null;
    for (const interval of intervals) {
      if (!current) {
        current = interval;
      } else {
        if (interval[0] < current[1]) {
          if (interval[1] > current[1]) {
            current[1] = interval[1];
          }
        } else {
          merged.push(current);
          current = interval;
        }
      }
    }
    if (current) {
      merged.push(current);
    }

    // Slice the original text based on merged intervals
    const result: React.ReactNode[] = [];
    let lastOriginalIndex = 0;

    merged.forEach((interval, idx) => {
      const startNorm = interval[0];
      const endNorm = interval[1];
      const startOrig = originalIndices[startNorm];
      const endOrig = originalIndices[endNorm];

      // Add prefix
      if (startOrig > lastOriginalIndex) {
        result.push(
          <span key={`text-${idx}`}>
            {text.substring(lastOriginalIndex, startOrig)}
          </span>
        );
      }

      // Add highlighted target
      result.push(
        <span
          key={`highlight-${idx}`}
          id={`highlight-target-${idx}`}
          className="target-word text-[#43007e] dark:text-[#b085f5] font-extrabold underline decoration-purple-500/60 decoration-2 underline-offset-4"
        >
          {text.substring(startOrig, endOrig)}
        </span>
      );

      lastOriginalIndex = endOrig;
    });

    // Add suffix
    if (lastOriginalIndex < text.length) {
      result.push(
        <span key="suffix">
          {text.substring(lastOriginalIndex)}
        </span>
      );
    }

    return <>{result}</>;
  };

  // Get filtered questions based on current selected category
  const filteredQuestions = questions.filter(
    (q) => selectedCategory === 'الكل' || q.category === selectedCategory
  );

  const currentQuestions = filteredQuestions;

  // Diagnostic logs as requested by the user
  useEffect(() => {
    console.log("INITIAL_QUESTIONS.length =", INITIAL_QUESTIONS.length);
    console.log("currentQuestions.length =", currentQuestions.length);
    console.log("selectedCategory =", selectedCategory);
  }, [currentQuestions, selectedCategory]);

  // Safely get the active question from filtered list
  const activeQuestion = filteredQuestions[currentIdx] || filteredQuestions[0] || questions[0];

  // Synchronize range slider value when active question changes
  useEffect(() => {
    if (activeQuestion) {
      setSliderValue(activeQuestion.rating !== null ? activeQuestion.rating : 5);
    }
  }, [activeQuestion.id]);

  const hasStudentAnswer = activeQuestion ? activeQuestion.userAnswer.trim().length > 0 : false;
  const isModelAnswerVisible = hasStudentAnswer && (showModelAnswer || (activeQuestion && activeQuestion.status === 'rated'));

  // Sync index if filtered list shifts or shrinks
  useEffect(() => {
    if (currentIdx >= filteredQuestions.length) {
      setCurrentIdx(Math.max(0, filteredQuestions.length - 1));
    }
    setShowModelAnswer(false);
  }, [selectedCategory, filteredQuestions.length]);

  // Handle typing inside answer textarea
  const handleAnswerChange = (text: string) => {
    if (text.trim().length > 0) {
      setShowWarning(false);
    }
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === activeQuestion.id) {
          const newStatus = text.trim() === '' ? 'unanswered' : 'answered';
          return {
            ...q,
            userAnswer: text,
            status: q.status === 'rated' ? 'rated' : newStatus, // maintain rated status if already rated
          };
        }
        return q;
      })
    );
  };

  // Handle rating/evaluating the question
  const handleRate = (ratingValue: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === activeQuestion.id) {
          return {
            ...q,
            rating: ratingValue,
            status: 'rated' as const,
          };
        }
        return q;
      })
    );
  };

  // Navigate to another question
  const handleNavigateQuestion = (direction: 'next' | 'prev') => {
    setShowModelAnswer(false);
    setShowWarning(false);
    if (direction === 'next') {
      if (currentIdx < filteredQuestions.length - 1) {
        setCurrentIdx(currentIdx + 1);
      }
    } else {
      if (currentIdx > 0) {
        setCurrentIdx(currentIdx - 1);
      }
    }
  };

  // Skip directly to a question by its index in the filtered list
  const jumpToQuestion = (index: number) => {
    setShowModelAnswer(false);
    setShowWarning(false);
    setCurrentIdx(index);
  };

  // Calculate stats for current dashboard and display
  const totalQuestionsCount = questions.length;
  const answeredQuestionsCount = questions.filter((q) => q.userAnswer.trim() !== '').length;
  const ratedCount = questions.filter((q) => q.status === 'rated').length;
  const masteredCount = questions.filter((q) => typeof q.rating === 'number' && q.rating >= 8).length;
  const mediumCount = questions.filter((q) => typeof q.rating === 'number' && q.rating >= 5 && q.rating < 8).length;
  const weakCount = questions.filter((q) => typeof q.rating === 'number' && q.rating !== null && q.rating < 5).length;

  // Custom navigation trigger
  const navigateToScreen = (screen: 'home' | 'practice') => {
    setCurrentScreen(screen);
    setShowModelAnswer(false);
  };

  return (
    <div className="bg-[#F5F3FF] dark:bg-[#0f172a] text-[#141b2a] dark:text-gray-100 min-h-screen font-sans transition-colors duration-300">
      
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-[#1e293b] shadow-[0_4px_12px_rgba(91,37,150,0.06)] sticky top-0 z-50 transition-colors duration-300">
        <div className="flex justify-between items-center w-full px-4 md:px-8 max-w-[900px] mx-auto h-16">
          <div 
            onClick={() => navigateToScreen('home')}
            className="text-2xl font-extrabold text-[#43007e] dark:text-[#b085f5] cursor-pointer tracking-tight"
          >
            تطبيق مدرسي
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex gap-6 items-center">
            <button 
              onClick={() => navigateToScreen('home')}
              className={`pb-1 text-sm font-semibold transition-colors ${
                currentScreen === 'home' 
                  ? 'text-[#43007e] dark:text-[#b085f5] border-b-2 border-[#43007e] dark:border-[#b085f5]' 
                  : 'text-gray-500 hover:text-[#43007e] dark:hover:text-[#b085f5]'
              }`}
            >
              الرئيسية
            </button>
            <button 
              onClick={() => navigateToScreen('practice')}
              className={`pb-1 text-sm font-semibold transition-colors ${
                currentScreen === 'practice' 
                  ? 'text-[#43007e] dark:text-[#b085f5] border-b-2 border-[#43007e] dark:border-[#b085f5]' 
                  : 'text-gray-500 hover:text-[#43007e] dark:hover:text-[#b085f5]'
              }`}
            >
              الامتحان
            </button>
          </div>

          <button 
            className="material-symbols-outlined text-[#43007e] dark:text-[#b085f5] text-2xl active:opacity-80 transition-all p-2 rounded-full hover:bg-purple-100 dark:hover:bg-slate-700"
            onClick={() => setDarkMode(!darkMode)}
            title="تغيير المظهر"
          >
            {darkMode ? 'light_mode' : 'dark_mode'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[900px] mx-auto px-4 py-6 pb-24 min-h-[calc(100vh-140px)]">
        <AnimatePresence mode="wait">
          
          {/* HOME SCREEN */}
          {currentScreen === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center pt-8"
            >
              <div className="w-full max-w-[650px] bg-white dark:bg-[#1e293b] rounded-2xl border-r-[12px] border-[#43007e] dark:border-[#b085f5] shadow-[0_10px_30px_rgba(91,37,150,0.08)] overflow-hidden transition-colors duration-300">
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  
                  {/* Question Count Label */}
                  <div className="flex justify-start">
                    <span className="bg-[#E9E6FA] dark:bg-purple-900/40 text-[#43007e] dark:text-[#d8b9ff] px-4 py-1.5 rounded-full text-xs font-bold">
                      {toArabicNumbers(totalQuestionsCount)} سؤالاً
                    </span>
                  </div>

                  {/* Titles */}
                  <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold text-[#43007e] dark:text-[#d8b9ff]">الأسئلة الوزارية الخاصة بمادة: اللغة العربية</h1>
                    <h2 className="text-xl font-bold text-[#7742b5] dark:text-[#ca9dff]">مصادر الأفعال الثلاثية وغير الثلاثية - الثالث المتوسط</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-body-main text-sm md:text-base leading-relaxed">
                      الأسئلة الوزارية الشاملة لموضوع مصادر الأفعال الثلاثية وغير الثلاثية من سنة ٢٠١١ إلى سنة ٢٠٢٦ مع الأجوبة النموذجية الرسمية لمركز الفحص.
                    </p>
                  </div>

                  {/* Info Bar */}
                  <div className="flex justify-between items-center bg-[#F1F3FF] dark:bg-slate-800/80 px-6 py-3 rounded-xl border border-[#D9D3F0] dark:border-slate-700">
                    <span className="font-bold text-gray-700 dark:text-gray-300">عدد الأسئلة الكلي للدرس:</span>
                    <span className="font-extrabold text-[#43007e] dark:text-[#b085f5] text-lg">{toArabicNumbers(totalQuestionsCount)}</span>
                  </div>

                  {/* Collapsible Instructions */}
                  <details className="group border border-[#D9D3F0] dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-300">
                    <summary className="flex justify-between items-center p-4 cursor-pointer bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="font-bold text-[#43007e] dark:text-[#b085f5] flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-lg">info</span>
                        تعليمات الامتحان والمراجعة
                      </span>
                      <span className="material-symbols-outlined text-gray-400 transition-transform group-open:rotate-180">
                        expand_more
                      </span>
                    </summary>
                    <div className="p-4 text-xs md:text-sm text-[#4b4451] dark:text-gray-300 leading-relaxed bg-[#FDFDFF] dark:bg-slate-800/50 border-t border-[#D9D3F0] dark:border-slate-700 space-y-2">
                      <ul className="list-disc list-inside space-y-1">
                        <li>يرجى قراءة السؤال الوزاري بتمعن ثم كتابة إجابتك في الحقل المخصص.</li>
                        <li>اضغط على زر <strong className="text-[#43007e] dark:text-[#b085f5]">عرض الجواب النموذجي</strong> لمقارنة صياغتك مع الأجوبة الرسمية المعتمدة في مركز الفحص.</li>
                        <li>قيم إجابتك لكل سؤال من ٠ إلى ١٠ لمتابعة تقدمك ونقاط ضعفك.</li>
                        <li>يتم حفظ إجاباتك وتقييماتك تلقائياً وبشكل كامل على جهازك.</li>
                      </ul>
                    </div>
                  </details>

                  {/* Start Button */}
                  <button 
                    onClick={() => navigateToScreen('practice')}
                    className="mt-2 bg-[#43007e] hover:bg-[#5b2596] text-white font-bold text-lg h-14 md:h-16 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>ابدأ الامتحان والمراجعة</span>
                    <span className="material-symbols-outlined">west</span>
                  </button>

                </div>
              </div>
            </motion.div>
          )}

          {/* PRACTICE SCREEN */}
          {currentScreen === 'practice' && (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Filter Tabs / Topic pills */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-[#1e293b] rounded-xl border border-[#D9D3F0] dark:border-slate-700 overflow-x-auto">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 px-3">تصنيف الأسئلة:</span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentIdx(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#43007e] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Practice Header / Progress Banner */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-[#D9D3F0] dark:border-slate-700 shadow-sm transition-colors duration-300">
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => navigateToScreen('home')}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-300 cursor-pointer"
                    title="العودة للرئيسية"
                  >
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                  <div>
                    <h2 className="font-bold text-[#43007e] dark:text-[#b085f5] text-base md:text-lg">{activeQuestion.category}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الأسئلة الوزارية الشاملة لطلبة الثالث المتوسط</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                    <span className="text-xs font-bold text-[#43007e] dark:text-[#b085f5]">
                      السؤال {toArabicNumbers(currentIdx + 1)} من {toArabicNumbers(filteredQuestions.length)}
                    </span>
                    <div className="w-32 md:w-48 h-2 bg-[#cdc3d3]/40 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#43007e] dark:bg-[#b085f5] transition-all duration-300" 
                        style={{ width: `${((currentIdx + 1) / filteredQuestions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigateToScreen('home')}
                    className="px-4 py-2 rounded-full bg-[#E9E6FA] dark:bg-purple-900/40 text-[#43007e] dark:text-[#d8b9ff] text-xs font-bold hover:bg-[#D9D3F0] dark:hover:bg-purple-900/60 cursor-pointer transition-all shrink-0"
                  >
                    حفظ وخروج
                  </button>
                </div>

              </div>

              {/* Interactive Grid Quick Jump Navigator */}
              <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-[#D9D3F0] dark:border-slate-700 shadow-sm transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-300">مستعرض ومحدد الأسئلة السريع:</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">انقر للذهاب مباشرة إلى السؤال</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {filteredQuestions.map((q, idx) => {
                    // Decide background color according to state
                    let bgClass = 'bg-[#F3F4F6] dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700';
                    let labelIcon = '';

                    if (idx === currentIdx) {
                      bgClass = 'bg-[#43007e] text-white border-[#43007e] scale-105 shadow-md';
                    } else if (q.status === 'rated') {
                      const r = typeof q.rating === 'number' ? q.rating : 0;
                      if (r >= 8) {
                        bgClass = 'bg-[#DCFCE7] dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-[#10B981]';
                      } else if (r >= 5) {
                        bgClass = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-500';
                      } else {
                        bgClass = 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-500';
                      }
                    } else if (q.status === 'answered') {
                      bgClass = 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-300';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => jumpToQuestion(idx)}
                        className={`w-10 h-10 rounded-xl border text-sm font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${bgClass}`}
                      >
                        <span>{toArabicNumbers(getQuestionNumber(q))}</span>
                        {q.status === 'rated' && typeof q.rating === 'number' && q.rating >= 8 && (
                          <span className="text-[8px] mt-[-2px] block">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Question Card */}
              <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#D9D3F0] dark:border-slate-700 shadow-[0_4px_12px_rgba(91,37,150,0.06)] overflow-hidden transition-colors duration-300">
                
                {/* Card Header Banner */}
                <div className="bg-[#f1f3ff] dark:bg-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-[#D9D3F0] dark:border-slate-700">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="bg-[#43007e] dark:bg-[#b085f5] text-white dark:text-slate-950 text-xs font-bold px-3 py-1 rounded-full">
                      سؤال رقم {toArabicNumbers(getQuestionNumber(activeQuestion))}
                    </span>
                    <span className="bg-[#bd87fe] dark:bg-purple-900 text-white dark:text-[#d8b9ff] text-xs font-bold px-3 py-1 rounded-full">
                      {activeQuestion.year}
                    </span>
                  </div>

                  {/* Status indicator badge */}
                  <div className="flex items-center gap-2">
                    {activeQuestion.status === 'unanswered' && (
                      <span className="flex items-center gap-1 text-[#D97706] bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-900">
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        قيد الحل
                      </span>
                    )}
                    {activeQuestion.status === 'answered' && (
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 rounded-full text-xs font-bold border border-sky-200 dark:border-sky-900">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        تمت الكتابة
                      </span>
                    )}
                    {activeQuestion.status === 'rated' && (
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                        (activeQuestion.rating ?? 0) >= 8 
                          ? 'text-[#10B981] bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                          : (activeQuestion.rating ?? 0) >= 5
                          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                          : 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        تم التقييم: {toArabicNumbers(activeQuestion.rating ?? 0)} / {toArabicNumbers(10)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  
                  {/* Text of Question Section */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl border-r-4 border-[#43007e] dark:border-[#b085f5] transition-all flex flex-col gap-4">
                      
                      {/* أولاً: examLabel */}
                      <div className="text-right text-xs md:text-sm font-extrabold text-[#43007e] dark:text-[#b085f5] opacity-90 border-b border-purple-100 dark:border-slate-700 pb-2 mb-1">
                        {activeQuestion.examLabel}
                      </div>

                      {/* ثانياً: النصوص (آيات، أبيات شعرية، أو نصوص نثرية) */}
                      {activeQuestion.quranText && (
                        <div className="text-center my-3">
                          <p className="quran-text text-2xl md:text-3xl text-slate-900 dark:text-indigo-200 tracking-wide p-2 leading-relaxed font-bold">
                            {renderHighlightedText(activeQuestion.quranText, activeQuestion.targetWords)}
                          </p>
                        </div>
                      )}

                      {activeQuestion.poetryText && (
                        <div className="text-center border-y border-purple-100 dark:border-slate-700 py-4 my-3">
                          <p className="poetry-text text-lg md:text-xl text-slate-800 dark:text-slate-200 italic leading-relaxed whitespace-pre-line font-bold">
                            {renderHighlightedText(activeQuestion.poetryText, activeQuestion.targetWords)}
                          </p>
                        </div>
                      )}

                      {activeQuestion.contextText && (
                        <div className="context-text text-center my-3">
                          <p className="literary-text text-xl md:text-2xl text-slate-900 dark:text-slate-100 tracking-wide p-2 leading-relaxed font-semibold">
                            {renderHighlightedText(activeQuestion.contextText, activeQuestion.targetWords)}
                          </p>
                        </div>
                      )}

                      {/* ثالثاً: التوجيه / السؤال الوزاري */}
                      {activeQuestion.instruction && (
                        <p className="question-instruction text-[#141b2a] dark:text-gray-100 font-bold text-base md:text-lg leading-relaxed mt-2 border-t border-dashed border-purple-100 dark:border-slate-700 pt-3">
                          {activeQuestion.instruction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Student Answer Textarea */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">edit</span>
                      إجابتك المحفوظة تلقائيًا:
                    </label>
                    <textarea 
                      className="w-full min-h-[140px] p-4 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-850 focus:border-[#43007e] dark:focus:border-[#b085f5] focus:ring-1 focus:ring-[#43007e] dark:focus:ring-[#b085f5] transition-all text-sm md:text-base leading-relaxed text-[#141b2a] dark:text-gray-100"
                      value={activeQuestion.userAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="اكتب إجابتك هنا ليتم حفظها..."
                    />
                    
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-semibold text-[#bd87fe] dark:text-[#b085f5]">
                        {hasStudentAnswer 
                          ? `عدد الحروف: ${toArabicNumbers(activeQuestion.userAnswer.length)}`
                          : 'اكتب إجابتك أولًا ليتم تفعيل زر عرض الجواب النموذجي'
                        }
                      </span>
                      
                      <button 
                        className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                          isModelAnswerVisible 
                            ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : !hasStudentAnswer
                            ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-[#43007e] dark:bg-[#b085f5] text-white dark:text-slate-950 hover:bg-[#5b2596] cursor-pointer'
                        }`}
                        onClick={() => {
                          if (hasStudentAnswer) {
                            setShowModelAnswer(true);
                            setShowWarning(false);
                          } else {
                            setShowWarning(true);
                          }
                        }}
                        disabled={isModelAnswerVisible || !hasStudentAnswer}
                      >
                        <span>عرض الجواب النموذجي</span>
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                    </div>

                    {/* Warning Alert if answer is empty */}
                    {!hasStudentAnswer && (
                      <div className="mt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-200/40 dark:border-amber-900/20 animate-pulse">
                        <span className="material-symbols-outlined text-base">warning</span>
                        اكتب إجابتك أولًا قبل عرض الجواب النموذجي.
                      </div>
                    )}
                  </div>

                  {/* Revealed Model Answer & Evaluation Section */}
                  {isModelAnswerVisible && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-6 mt-2 border-t border-gray-100 dark:border-slate-700 pt-6"
                    >
                      {/* Model answer standard card */}
                      <div className="bg-[#10B981]/5 p-5 rounded-xl border border-[#10B981]/20">
                        <h4 className="font-bold text-[#10B981] mb-2 flex items-center gap-1.5 text-sm">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          الجواب النموذجي والتحليل الوزاري
                        </h4>
                        
                        {activeQuestion?.answerFormat === "table" &&
                        activeQuestion?.answerTable &&
                        Array.isArray(activeQuestion.answerTable.headers) &&
                        Array.isArray(activeQuestion.answerTable.rows) ? (
                          <>
                            {/* Desktop/Tablet View */}
                            <div className="answer-table-desktop">
                              <div className="mt-4 answer-table-wrap rounded-lg border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                                <table 
                                  className="answer-table w-full text-right text-sm border-collapse bg-white dark:bg-slate-900"
                                  data-cols={activeQuestion.answerTable.headers.length.toString()}
                                >
                                  <thead>
                                    <tr className="bg-emerald-600 text-white font-bold">
                                      {activeQuestion.answerTable.headers.map((header: string, idx: number) => (
                                        <th key={idx} className="px-4 py-2.5 font-extrabold text-xs sm:text-sm border border-emerald-500 text-right">
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeQuestion.answerTable.rows.map((row: string[], rowIdx: number) => (
                                      <tr 
                                        key={rowIdx} 
                                        className="border-b border-gray-100 dark:border-slate-800 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40 transition-colors"
                                      >
                                        {row.map((cell: string, colIdx: number) => (
                                          <td 
                                            key={colIdx} 
                                            className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700/50 text-xs sm:text-sm text-right align-top"
                                          >
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Mobile View */}
                            <div className="answer-table-mobile">
                              {activeQuestion.answerTable.rows.map((row: string[], rowIdx: number) => (
                                <div className="answer-row-card shadow-sm p-1" key={rowIdx}>
                                  {activeQuestion.answerTable.headers.map((header: string, cellIndex: number) => (
                                    <div className="answer-row-field" key={header + "-" + cellIndex}>
                                      <div className="answer-row-label font-bold text-xs sm:text-sm">{header}</div>
                                      <div className="answer-row-value text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{row[cellIndex] ?? ""}</div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          activeQuestion.modelAnswer && (
                            <p className="text-slate-800 dark:text-slate-200 text-sm md:text-base whitespace-pre-line leading-relaxed font-semibold">
                              {activeQuestion.modelAnswer}
                            </p>
                          )
                        )}
                      </div>

                      {/* Numeric Evaluation Slider from 0 to 10 */}
                      <div className="self-rating-card bg-[#F1F3FF] dark:bg-slate-800/80 border border-[#D9D3F0] dark:border-slate-700/60 shadow-sm">
                        <h3 className="self-rating-title font-bold text-[#43007e] dark:text-[#b085f5]">
                          قيّم مستوى إتقانك وصياغتك للجواب
                        </h3>
                        
                        <div className="w-full max-w-[400px] mx-auto flex flex-col gap-3">
                          <p className="self-rating-help text-slate-700 dark:text-gray-300 font-bold text-xs sm:text-sm">
                            قيّم إجابتك من 0 إلى 10
                          </p>

                          <p className="self-rating-value font-extrabold text-[#43007e] dark:text-[#b085f5] text-xs sm:text-sm">
                            الدرجة المختارة:
                            <span className="score-number"> {toArabicNumbers(sliderValue)} / {toArabicNumbers(10)}</span>
                          </p>

                          <input 
                            type="range" 
                            min="0" 
                            max="10" 
                            step="1"
                            value={sliderValue}
                            onChange={(e) => setSliderValue(Number(e.target.value))}
                            disabled={activeQuestion.status === 'rated'}
                            className="self-rating-slider w-full h-2 bg-purple-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#43007e] dark:accent-[#b085f5] disabled:opacity-70 disabled:cursor-not-allowed"
                          />

                          <div className="self-rating-scale font-bold text-gray-400 dark:text-gray-500 px-1" aria-hidden="true">
                            {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                              <span key={n}>{toArabicNumbers(n)}</span>
                            ))}
                          </div>

                          <button 
                            onClick={() => handleRate(sliderValue)}
                            disabled={activeQuestion.status === 'rated'}
                            className={`w-full mt-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                              activeQuestion.status === 'rated'
                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 cursor-not-allowed'
                                : 'bg-[#43007e] hover:bg-[#5b2596] text-white active:scale-95'
                            }`}
                          >
                            <span className="material-symbols-outlined text-lg">
                              {activeQuestion.status === 'rated' ? 'lock' : 'check'}
                            </span>
                            <span>
                              {activeQuestion.status === 'rated' ? 'تم تثبيت التقييم' : 'تثبيت التقييم'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Bottom Navigation Arrows */}
                <div className="flex justify-between items-center px-4 md:px-6 py-4 bg-gray-50 dark:bg-slate-800/80 border-t border-[#D9D3F0] dark:border-slate-700">
                  
                  <button 
                    onClick={() => handleNavigateQuestion('prev')}
                    disabled={currentIdx === 0}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full font-bold text-xs transition-all ${
                      currentIdx === 0
                        ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">east</span>
                    <span>السؤال السابق</span>
                  </button>

                  <div className="hidden sm:block text-xs font-semibold text-gray-400">
                    يمكنك التنقل بالأسهم أو باستخدام مستعرض الأرقام بالأعلى
                  </div>

                  <button 
                    onClick={() => handleNavigateQuestion('next')}
                    disabled={currentIdx === filteredQuestions.length - 1}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full font-bold transition-all ${
                      currentIdx === filteredQuestions.length - 1
                        ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                        : 'text-[#43007e] dark:text-[#b085f5] hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer active:scale-95'
                    }`}
                  >
                    <span>السؤال التالي</span>
                    <span className="material-symbols-outlined text-base">west</span>
                  </button>

                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile Sticky Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-safe h-20 bg-white dark:bg-[#1e293b] border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(91,37,150,0.06)] rounded-t-xl transition-colors duration-300">
        
        <button 
          onClick={() => navigateToScreen('home')}
          className={`flex flex-col items-center justify-center rounded-xl px-5 py-2 active:scale-95 transition-all cursor-pointer ${
            currentScreen === 'home'
              ? 'bg-[#E9E6FA] dark:bg-purple-950/40 text-[#43007e] dark:text-[#d8b9ff]'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined">home</span>
          <span className="font-bold text-[11px] mt-0.5">الرئيسية</span>
        </button>

        <button 
          onClick={() => navigateToScreen('practice')}
          className={`flex flex-col items-center justify-center rounded-xl px-5 py-2 active:scale-95 transition-all cursor-pointer ${
            currentScreen === 'practice'
              ? 'bg-[#E9E6FA] dark:bg-purple-950/40 text-[#43007e] dark:text-[#d8b9ff]'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined">edit_note</span>
          <span className="font-bold text-[11px] mt-0.5">الامتحان</span>
        </button>

      </nav>

      {/* Footer */}
      <footer className="w-full py-8 px-4 flex flex-col items-center gap-2 text-center bg-white dark:bg-[#1e293b] border-t border-[#D9D3F0] dark:border-slate-700 mt-12 transition-colors duration-300">
        <div className="font-extrabold text-[#43007e] dark:text-[#b085f5]">تطبيق مدرسي</div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          جميع الحقوق محفوظة لـ تطبيق مدرسي © {toArabicNumbers(2026)}
        </p>
      </footer>

    </div>
  );
}
