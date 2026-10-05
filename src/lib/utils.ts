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
}

/**
 * Determines whether a task is a question-based task.
 * Book reading (kitap okuma), topic reading (konu okuma), video watching, 
 * or tasks with page/minute amounts must NEVER be counted as questions.
 * Only explicit question tasks ('question') or question-based tests are counted.
 */
export function isQuestionTask(task: any): boolean {
  if (!task) return false;

  const type = String(task.type || '').toLowerCase().trim();

  // Explicit non-question task types:
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
    const hasEval = (Number(task.correct) || 0) + (Number(task.incorrect) || 0) + (Number(task.empty) || 0) > 0;
    if (amountStr.includes('soru') || typeof task.questionCount === 'number' || hasEval) {
      return true;
    }
    return false;
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
  if (!task || !task.completed || !isQuestionTask(task)) return 0;
  const evalCount = (Number(task.correct) || 0) + (Number(task.incorrect) || 0) + (Number(task.empty) || 0);
  if (evalCount > 0) return evalCount;
  return getTaskQuestionCount(task);
}

/**
 * Calculates overall weekly question statistics from a list of tasks.
 */
export function calculateWeeklyQuestionStats(tasks: any[], customWeeklyTarget?: number): WeeklyQuestionStats {
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
      net: 0
    };
  }

  let assignedFromTasks = 0;
  let solved = 0;
  let correct = 0;
  let incorrect = 0;
  let empty = 0;
  let net = 0;

  for (const t of tasks) {
    const qCount = getTaskQuestionCount(t);
    assignedFromTasks += qCount;

    if (t.completed) {
      solved += getTaskSolvedCount(t);
      const c = Number(t.correct) || 0;
      const inc = Number(t.incorrect) || 0;
      const emp = Number(t.empty) || 0;
      const n = typeof t.net === 'number' ? t.net : Math.max(0, c - inc / 4);

      correct += c;
      incorrect += inc;
      empty += emp;
      net += n;
    }
  }

  const assigned = customWeeklyTarget && customWeeklyTarget > assignedFromTasks 
    ? customWeeklyTarget 
    : assignedFromTasks;

  const remaining = Math.max(0, assigned - solved);
  const progressPercent = assigned > 0 ? Math.min(100, Math.round((solved / assigned) * 100)) : 0;

  return {
    assignedQuestions: assigned,
    solvedQuestions: solved,
    remainingQuestions: remaining,
    progressPercent,
    correct,
    incorrect,
    empty,
    net: Number(net.toFixed(2))
  };
}

