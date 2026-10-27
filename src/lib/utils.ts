import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface WeeklyQuestionStats {
  assignedQuestions: number;
  solvedQuestions: number;
  remainingQuestions: number;
  progressPercent: number;
  correct: number;
  incorrect: number;
  empty: number;
  net: number;
  evaluatedQuestions: number;
  unevaluatedQuestions: number;
  accuracyRate: number;
  videoTasksCount: number;
  completedVideoTasksCount: number;
  readingTasksCount: number;
  completedReadingTasksCount: number;
  questionTasksCount: number;
  completedQuestionTasksCount: number;
}

/**
 * Determines whether a task is a question-based task.
 * Book reading (kitap okuma), topic reading (konu okuma), video watching, 
 * or tasks with page/minute amounts must NEVER be counted as questions.
 * Only explicit question tasks ('question') or question-based tests are counted.
 */
export function isQuestionTask(task: any): boolean {
  if (!task) return false;

  // If the task has entered correct or incorrect scores, it is definitely a question-based evaluation!
  const hasScores = (task.correct !== undefined && task.correct !== null) || 
                    (task.incorrect !== undefined && task.incorrect !== null) ||
                    ((Number(task.correct) || 0) + (Number(task.incorrect) || 0) + (Number(task.empty) || 0) > 0);
  if (hasScores) {
    return true;
  }

  const type = String(task.type || '').toLowerCase().trim();

  // Explicit non-question task types (unless scores were explicitly entered above):
  if (type === 'book' || type === 'reading' || type === 'video') {
    return false;
  }

  const amountStr = String(task.amount || '').toLowerCase().trim();
  const titleStr = String(task.title || task.topic || '').toLowerCase().trim();

  // If amount or title indicates reading, pages, duration, or video: NEVER questions!
  if (
    amountStr.includes('sayfa') || 
    amountStr.includes('syf') || 
    amountStr.includes('dakika') || 
    amountStr.includes('dk') || 
    amountStr.includes('saat') || 
    amountStr.includes('kitap') ||
    amountStr.includes('video') ||
    amountStr.includes('bölüm') ||
    titleStr.includes('kitap okuma') ||
    titleStr.includes('sayfa okuma') ||
    titleStr.includes('serbest okuma')
  ) {
    return false;
  }

  // Explicit question type selected by the teacher:
  if (type === 'question') {
    return true;
  }

  // Test tasks: count if they explicitly specify questions (e.g. "20 Soru") or have eval scores
  if (type === 'test') {
    return true;
  }

  // Fallback for legacy tasks where type wasn't set: ONLY if amount specifically contains "soru"
  if (amountStr.includes('soru')) {
    return true;
  }

  return false;
}

/**
 * Parses how many questions are assigned in a single task.
 * Returns 0 for book reading, reading, video, or non-question tasks.
 */
export function getTaskQuestionCount(task: any): number {
  if (!task || !isQuestionTask(task)) return 0;

  const evalCount = (Number(task.correct) || 0) + (Number(task.incorrect) || 0) + (Number(task.empty) || 0);

  if (typeof task.questionCount === 'number' && task.questionCount > 0) {
    return Math.max(task.questionCount, evalCount);
  }
  if (typeof task.totalQuestions === 'number' && task.totalQuestions > 0) {
    return Math.max(task.totalQuestions, evalCount);
  }

  if (task.amount) {
    const match = String(task.amount).match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      return Math.max(parsed, evalCount);
    }
  }

  if (evalCount > 0) return evalCount;

  // Defaults for question / test types if text had no digits (e.g. "Paragraf Soru Çözümü")
  if (task.type === 'question') return 25;
  if (task.type === 'test') return 20;
  return 0;
}

/**
 * Returns how many questions were solved for a single task.
 */
export function getTaskSolvedCount(task: any): number {
  if (!task || !isQuestionTask(task)) return 0;
  const evalCount = (Number(task.correct) || 0) + (Number(task.incorrect) || 0) + (Number(task.empty) || 0);
  if (evalCount > 0) return evalCount;
  if (task.completed) {
    return getTaskQuestionCount(task);
  }
  return 0;
}

/**
 * Calculates net score based on correct, incorrect, and student grade level (LGS vs YKS penalty).
 */
export function calculateNetScore(correct: number, incorrect: number, grade?: string): number {
  const g = String(grade || '').toLowerCase();
  const isMiddleSchool = g.includes('8') || g.includes('7') || g.includes('6') || g.includes('5') || g.includes('lgs') || g.includes('ortaokul');
  const penalty = isMiddleSchool ? 3 : 4;
  const c = Math.max(0, Number(correct) || 0);
  const inc = Math.max(0, Number(incorrect) || 0);
  const net = Math.max(0, c - (inc / penalty));
  return Number(net.toFixed(2));
}

/**
 * Calculates overall weekly question statistics from a list of tasks.
 */
export function calculateWeeklyQuestionStats(tasks: any[], customWeeklyTarget?: number, grade?: string): WeeklyQuestionStats {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    const target = customWeeklyTarget && customWeeklyTarget > 0 ? customWeeklyTarget : 0;
    return {
      assignedQuestions: target,
      solvedQuestions: 0,
      remainingQuestions: target,
      progressPercent: 0,
      correct: 0,
      incorrect: 0,
      empty: 0,
      net: 0,
      evaluatedQuestions: 0,
      unevaluatedQuestions: 0,
      accuracyRate: 0,
      videoTasksCount: 0,
      completedVideoTasksCount: 0,
      readingTasksCount: 0,
      completedReadingTasksCount: 0,
      questionTasksCount: 0,
      completedQuestionTasksCount: 0
    };
  }

  let assignedFromTasks = 0;
  let solved = 0;
  let correct = 0;
  let incorrect = 0;
  let empty = 0;
  let net = 0;
  let evaluatedQuestions = 0;
  let videoTasksCount = 0;
  let completedVideoTasksCount = 0;
  let readingTasksCount = 0;
  let completedReadingTasksCount = 0;
  let questionTasksCount = 0;
  let completedQuestionTasksCount = 0;

  for (const t of tasks) {
    if (!t) continue;
    const isQ = isQuestionTask(t);
    const type = String(t.type || '').toLowerCase().trim();
    const amountStr = String(t.amount || '').toLowerCase().trim();
    const titleStr = String(t.title || t.topic || '').toLowerCase().trim();

    const isVideo = type === 'video' || amountStr.includes('video');
    const isReading = type === 'book' || type === 'reading' || 
                      amountStr.includes('sayfa') || amountStr.includes('syf') || 
                      titleStr.includes('kitap') || titleStr.includes('okuma');

    if (isVideo) {
      videoTasksCount++;
      if (t.completed) completedVideoTasksCount++;
    } else if (isReading) {
      readingTasksCount++;
      if (t.completed) completedReadingTasksCount++;
    }

    if (isQ) {
      questionTasksCount++;
      if (t.completed) completedQuestionTasksCount++;

      const qCount = getTaskQuestionCount(t);
      assignedFromTasks += qCount;

      const hasScore = (t.correct !== undefined && t.correct !== null) || (t.incorrect !== undefined && t.incorrect !== null);
      if (hasScore) {
        const c = Math.max(0, Number(t.correct) || 0);
        const inc = Math.max(0, Number(t.incorrect) || 0);
        const emp = Math.max(0, Number(t.empty) || 0);
        const n = typeof t.net === 'number' && !isNaN(t.net) ? t.net : calculateNetScore(c, inc, grade);

        correct += c;
        incorrect += inc;
        empty += emp;
        net += n;
        evaluatedQuestions += (c + inc + emp);
        solved += getTaskSolvedCount(t);
      } else if (t.completed) {
        solved += getTaskSolvedCount(t);
      }
    }
  }

  const assigned = customWeeklyTarget && customWeeklyTarget > assignedFromTasks 
    ? customWeeklyTarget 
    : assignedFromTasks;

  const remaining = Math.max(0, assigned - solved);
  const progressPercent = assigned > 0 ? Math.min(100, Math.round((solved / assigned) * 100)) : 0;
  const unevaluatedQuestions = Math.max(0, solved - evaluatedQuestions);
  const evaluatedTotalWithEmpty = correct + incorrect + empty;
  const accuracyRate = evaluatedTotalWithEmpty > 0 ? Math.round((correct / evaluatedTotalWithEmpty) * 100) : 0;

  return {
    assignedQuestions: assigned,
    solvedQuestions: solved,
    remainingQuestions: remaining,
    progressPercent,
    correct,
    incorrect,
    empty,
    net: Number(net.toFixed(2)),
    evaluatedQuestions,
    unevaluatedQuestions,
    accuracyRate,
    videoTasksCount,
    completedVideoTasksCount,
    readingTasksCount,
    completedReadingTasksCount,
    questionTasksCount,
    completedQuestionTasksCount
  };
}

/**
 * Safely extracts a user-readable error message from any error value.
 * Guarantees that neither '[object Object]' nor raw objects are ever displayed to the user.
 */
export function extractErrorMessage(
  error: any,
  fallbackMessage: string = 'Bir hata oluştu, lütfen tekrar deneyin.'
): string {
  if (!error) return fallbackMessage;

  // 1. If error is a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === '{}' || trimmed === 'null' || trimmed === 'undefined') {
      return fallbackMessage;
    }
    return trimmed;
  }

  // 2. If error is an Object or Error instance
  if (typeof error === 'object') {
    // Check standard Error.message
    if (typeof error.message === 'string' && error.message.trim()) {
      const msg = error.message.trim();
      if (msg !== '[object Object]' && msg !== '{}') {
        return msg;
      }
    }

    // Check nested error properties (common in Gemini API & Google Cloud responses)
    if (error.error) {
      if (typeof error.error === 'string' && error.error.trim()) {
        const msg = error.error.trim();
        if (msg !== '[object Object]') return msg;
      }
      if (typeof error.error === 'object') {
        if (typeof error.error.message === 'string' && error.error.message.trim()) {
          const msg = error.error.message.trim();
          if (msg !== '[object Object]') return msg;
        }
      }
    }

    // Check Axios/Fetch response data
    if (error.response?.data) {
      const d = error.response.data;
      if (typeof d === 'string' && d.trim() && d !== '[object Object]') return d.trim();
      if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
      if (typeof d.error?.message === 'string' && d.error.message.trim()) return d.error.message.trim();
      if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
    }

    // Check other common properties
    if (typeof error.statusText === 'string' && error.statusText.trim()) return error.statusText.trim();
    if (typeof error.reason === 'string' && error.reason.trim()) return error.reason.trim();
    if (typeof error.details === 'string' && error.details.trim()) return error.details.trim();
  }

  return fallbackMessage;
}


