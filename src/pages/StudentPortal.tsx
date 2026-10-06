import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Download, BookOpen, CheckSquare, AlertTriangle, Save, Calendar, 
  ShieldCheck, CheckCircle2, Youtube, Archive, Trash2, History, X, RotateCcw, 
  Timer, ClipboardCheck, ArrowRight, Sparkles, Target, Award, Minus, Plus, Quote,
  RefreshCw, Cloud, Smartphone, LayoutGrid, ListFilter, Check, Share2, Copy, Users, ExternalLink,
  ChevronLeft, ChevronRight, Eye, Grid, Bell, Lightbulb, PlayCircle, Clock, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseVideoUrl, getYoutubeId } from '../lib/videoUtils';
import { getExamCountdownForGrade, GradeExamCountdown } from '../lib/curriculum';
import { getDailyMotivationQuote, getAgeGroupBadge, MotivationQuote } from '../lib/motivationQuotes';
import { 
  saveStudentTasks, 
  getStudentTasks, 
  subscribeStudentTasks, 
  saveStudentArchivedPrograms,
  getStudentById,
  subscribeStudents,
  logoutFirebase
} from '../lib/firestoreService';
import { calculateWeeklyQuestionStats, getTaskQuestionCount, getTaskSolvedCount, WeeklyQuestionStats } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { fetchAiAnalysisSafely } from '../lib/aiAnalysisService';
import { exportAiAnalysisToPdf } from '../lib/pdfExportService';

interface Task {
  id: string;
  type: 'video' | 'question' | 'test' | 'reading' | 'book';
  title: string;
  subject: string;
  amount?: string;
  videoUrl?: string;
  day: string;
  completed: boolean;
  correct?: number;
  incorrect?: number;
  empty?: number;
  net?: number;
  topic?: string;
}

interface TrialData {
  id: string;
  date: string;
  results: {
    [subject: string]: {
      correct: number;
      incorrect: number;
      wrongTopics: { topic: string; count: number }[];
    }
  };
  totalNet: number;
}

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

interface ArchivedProgram {
  id: string;
  endDate: string;
  tasks: Task[];
  completionRate: number;
}

export function StudentPortal() {
  const [studentName, setStudentName] = useState('Öğrenci');
  const [studentGrade, setStudentGrade] = useState('');
  const [studentId, setStudentId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [archivedPrograms, setArchivedPrograms] = useState<ArchivedProgram[]>([]);
  const [trialHistory, setTrialHistory] = useState<TrialData[]>([]);
  const [selectedTrial, setSelectedTrial] = useState<TrialData | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'weekly'>('today');
  const [weeklyTableStyle, setWeeklyTableStyle] = useState<'grid' | 'table'>('grid');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('today');
  const [displayLayout, setDisplayLayout] = useState<'cards' | 'table'>('cards');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeVideoTask, setActiveVideoTask] = useState<Task | null>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const [videoTabFilter, setVideoTabFilter] = useState<'all' | 'today'>('all');
  const [countdown, setCountdown] = useState<GradeExamCountdown | null>(null);
  const [evaluatingTask, setEvaluatingTask] = useState<Task | null>(null);
  const [evalCorrect, setEvalCorrect] = useState<number>(0);
  const [evalIncorrect, setEvalIncorrect] = useState<number>(0);
  const [evalEmpty, setEvalEmpty] = useState<number>(0);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [weeklyQuestionGoal, setWeeklyQuestionGoal] = useState<number | undefined>(undefined);
  const tasksRef = useRef<HTMLDivElement>(null);

  // Haftalık ve Günlük Soru Hesaplamaları (Öğretmenin verdiği haftalık soru sayısı ve öğrencinin çözdüğü)
  const weeklyQuestionStats = useMemo(() => {
    return calculateWeeklyQuestionStats(tasks, weeklyQuestionGoal);
  }, [tasks, weeklyQuestionGoal]);

  const todayQuestionStats = useMemo(() => {
    return calculateWeeklyQuestionStats(todayTasks);
  }, [todayTasks]);

  // Exam / Trial Entry States
  const [examSubject, setExamSubject] = useState<string>('Genel Deneme');
  const [examTitle, setExamTitle] = useState<string>('');
  const [examCorrect, setExamCorrect] = useState<string>('');
  const [examIncorrect, setExamIncorrect] = useState<string>('');
  const [examEmpty, setExamEmpty] = useState<string>('');
  const [examWrongTopic, setExamWrongTopic] = useState<string>('');
  const [examSaveToast, setExamSaveToast] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showStudentMenu, setShowStudentMenu] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Daily & Incomplete Tasks Reminder Logic (İlk girişte ve 1 saat aralıklarla hatırlatılır)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const [showDailyReminderModal, setShowDailyReminderModal] = useState<boolean>(false);
  const initialReminderCheckedRef = useRef<string | null>(null);

  const handleDismissReminder = (snoozeAllDay = false) => {
    const id = studentId || localStorage.getItem('currentUserId') || '1';
    const now = Date.now();
    localStorage.setItem(`last_daily_reminder_shown_${id}`, now.toString());
    sessionStorage.setItem(`daily_reminder_session_shown_${id}`, 'true');
    if (snoozeAllDay) {
      const todayIso = new Date().toISOString().split('T')[0];
      localStorage.setItem(`daily_reminder_snoozed_date_${id}`, todayIso);
    }
    setShowDailyReminderModal(false);
  };

  const checkAndTriggerReminder = (currentTasks?: Task[]) => {
    const id = studentId || localStorage.getItem('currentUserId') || '1';
    const taskSource = currentTasks || tasks;
    if (!taskSource || taskSource.length === 0) return;

    // Check if user snoozed for the entire day
    const snoozedDate = localStorage.getItem(`daily_reminder_snoozed_date_${id}`);
    const todayIso = new Date().toISOString().split('T')[0];
    if (snoozedDate === todayIso) return;

    // Calculate incomplete tasks
    const dayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayDayName = DAYS_TR[dayIdx];
    const todayIncomplete = taskSource.filter(t => t.day === todayDayName && !t.completed);
    const pastDays = DAYS_TR.slice(0, dayIdx);
    const pastIncomplete = taskSource.filter(t => pastDays.includes(t.day) && !t.completed);

    if (todayIncomplete.length === 0 && pastIncomplete.length === 0) {
      return; // No incomplete tasks, do not disturb
    }

    const lastShownStr = localStorage.getItem(`last_daily_reminder_shown_${id}`);
    const now = Date.now();

    if (!lastShownStr) {
      // First time entering the program
      localStorage.setItem(`last_daily_reminder_shown_${id}`, now.toString());
      sessionStorage.setItem(`daily_reminder_session_shown_${id}`, 'true');
      setShowDailyReminderModal(true);
    } else {
      const lastShown = parseInt(lastShownStr, 10);
      if (isNaN(lastShown) || now - lastShown >= ONE_HOUR_MS) {
        // 1 hour has elapsed!
        localStorage.setItem(`last_daily_reminder_shown_${id}`, now.toString());
        sessionStorage.setItem(`daily_reminder_session_shown_${id}`, 'true');
        setShowDailyReminderModal(true);
      }
    }
  };

  // Student AI Analysis Modal States
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState<boolean>(false);
  const [studentAiAnalysis, setStudentAiAnalysis] = useState<any>(null);
  const [loadingStudentAi, setLoadingStudentAi] = useState<boolean>(false);
  const [studentAiError, setStudentAiError] = useState<string | null>(null);

  const toggleTaskCompletionQuick = async (task: Task) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        const isNowCompleted = !t.completed;
        const qCount = t.amount ? parseInt(t.amount, 10) || 20 : 20;
        return {
          ...t,
          completed: isNowCompleted,
          correct: isNowCompleted ? (t.correct ?? qCount) : undefined,
          incorrect: isNowCompleted ? (t.incorrect ?? 0) : undefined,
          empty: isNowCompleted ? (t.empty ?? 0) : undefined,
          net: isNowCompleted ? (t.net ?? qCount) : undefined
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    await saveStudentTasks(studentId, updatedTasks);

    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));

    setSyncToast(!task.completed ? `"${task.title || task.topic}" tamamlandı olarak işaretlendi! ✅` : `"${task.title || task.topic}" işareti geri alındı.`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const runStudentAiAnalysis = async () => {
    const targetStudentId = studentId || localStorage.getItem('currentUserId') || '1';
    setLoadingStudentAi(true);
    setStudentAiError(null);

    try {
      const savedTrials = localStorage.getItem(`trial_results_${targetStudentId}`);
      const detailedTrials = localStorage.getItem(`trial_results_detailed_${targetStudentId}`);
      const savedErrors = localStorage.getItem(`topic_errors_${targetStudentId}`);

      const data = await fetchAiAnalysisSafely({
        studentName,
        grade: studentGrade,
        tasks,
        trialResults: savedTrials ? JSON.parse(savedTrials) : trialHistory,
        detailedTrials: detailedTrials ? JSON.parse(detailedTrials) : trialHistory,
        topicErrors: savedErrors ? JSON.parse(savedErrors) : []
      });

      setStudentAiAnalysis(data);
      localStorage.setItem(`ai_analysis_${targetStudentId}`, JSON.stringify(data));
      setShowAiAnalysisModal(true);
    } catch (err: any) {
      console.error(err);
      setStudentAiError(err.message || 'Analiz sırasında beklenmedik bir hata oluştu.');
    } finally {
      setLoadingStudentAi(false);
    }
  };

  const scrollToTasks = () => {
    tasksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async (forceCloud = false, targetId?: string) => {
    const params = new URLSearchParams(window.location.search);
    const queryStudentId = params.get('studentId') || params.get('id') || params.get('student');
    
    let id = targetId || queryStudentId || localStorage.getItem('currentUserId');
    if (!id) {
      const email = localStorage.getItem('currentUserEmail');
      const name = localStorage.getItem('currentUserName');
      const savedStudents = localStorage.getItem('students');
      if (savedStudents) {
        try {
          const students = JSON.parse(savedStudents);
          const currentStudent = students.find((s: any) => (email && s.email === email) || (name && s.name === name));
          if (currentStudent) {
            id = currentStudent.id;
          }
        } catch {}
      }
    }

    if (!id) {
      id = '1';
    }

    localStorage.setItem('currentUserId', id);
    setStudentId(id);

    // 1. Fetch student info from Firestore or cache
    try {
      const studentDoc = await getStudentById(id);
      if (studentDoc) {
        setStudentName(studentDoc.name || 'Öğrenci');
        setStudentGrade(studentDoc.grade || '');
        setCountdown(getExamCountdownForGrade(studentDoc.grade || ''));
        if (studentDoc.weeklyQuestionGoal || studentDoc.weeklyTargetQuestions) {
          setWeeklyQuestionGoal(Number(studentDoc.weeklyQuestionGoal || studentDoc.weeklyTargetQuestions));
        }
        if (studentDoc.id && studentDoc.id !== id) {
          id = studentDoc.id;
          setStudentId(studentDoc.id);
          localStorage.setItem('currentUserId', studentDoc.id);
        }
        if (Array.isArray(studentDoc.tasks) && studentDoc.tasks.length > 0) {
          setTasks(studentDoc.tasks);
          const dayIndex = new Date().getDay();
          const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
          setTodayTasks(studentDoc.tasks.filter((t: Task) => t.day === todayName));
        }
      }
    } catch (err) {
      console.warn('Student profile fetch error:', err);
    }

    // 2. Fetch tasks directly from Firestore (and cache)
    try {
      const freshTasks = await getStudentTasks(id);
      if (freshTasks && freshTasks.length > 0) {
        setTasks(freshTasks);
        const dayIndex = new Date().getDay();
        const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
        setTodayTasks(freshTasks.filter((t: Task) => t.day === todayName));
      } else {
        const savedTasks = localStorage.getItem(`tasks_${id}`);
        if (savedTasks) {
          const localTasks = JSON.parse(savedTasks);
          setTasks(localTasks);
          const dayIndex = new Date().getDay();
          const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
          setTodayTasks(localTasks.filter((t: Task) => t.day === todayName));
        }
      }
    } catch (err) {
      console.warn('Error loading student tasks:', err);
    }

    const savedArchives = localStorage.getItem(`archived_programs_${id}`);
    if (savedArchives) {
      try {
        setArchivedPrograms(JSON.parse(savedArchives));
      } catch {}
    }

    const savedTrials = localStorage.getItem(`trial_results_detailed_${id}`);
    if (savedTrials) {
      try {
        setTrialHistory(JSON.parse(savedTrials));
      } catch {}
    }

    const savedAi = localStorage.getItem(`ai_analysis_${id}`);
    if (savedAi) {
      try {
        setStudentAiAnalysis(JSON.parse(savedAi));
      } catch {}
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryStudentId = params.get('studentId') || params.get('id') || params.get('student');
    const initialId = queryStudentId || localStorage.getItem('currentUserId') || '1';
    
    setStudentId(initialId);
    loadData(true, initialId);

    // Subscribe to all students for easy switcher
    const unsubStudents = subscribeStudents((list) => {
      setAllStudents(list);
    });

    const handleStorage = () => loadData(false);
    window.addEventListener('storage', handleStorage);
    return () => {
      unsubStudents();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Real-time Firestore onSnapshot listener for active student tasks
  useEffect(() => {
    if (!studentId) return;

    const unsubscribeTasks = subscribeStudentTasks(studentId, (freshTasks) => {
      if (freshTasks) {
        setTasks(freshTasks);
        const dayIndex = new Date().getDay();
        const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
        setTodayTasks(freshTasks.filter((t: Task) => t.day === todayName));
      }
    });

    return () => unsubscribeTasks();
  }, [studentId]);

  // 1. Program ilk açıldığında hatırlatıcı kontrolü (yalnızca 1 defa ve eksik ödev varsa)
  useEffect(() => {
    if (!studentId || tasks.length === 0) return;

    if (initialReminderCheckedRef.current !== studentId) {
      initialReminderCheckedRef.current = studentId;
      const initialTimer = setTimeout(() => {
        checkAndTriggerReminder();
      }, 1500);
      return () => clearTimeout(initialTimer);
    }
  }, [studentId, tasks]);

  // 2. Program açık kaldığı sürece 1 saat aralıklarla hatırlatma kontrolü
  useEffect(() => {
    if (!studentId) return;

    const intervalTimer = setInterval(() => {
      checkAndTriggerReminder();
    }, 60 * 1000); // 1 dakikada bir kontrol eder, son gösterimden 1 saat geçtiyse açar

    return () => clearInterval(intervalTimer);
  }, [studentId, tasks]);

  const switchStudent = (newId: string) => {
    localStorage.setItem('currentUserId', newId);
    setStudentId(newId);
    setShowStudentMenu(false);
    // Update URL query parameter without full reload
    const newUrl = `${window.location.pathname}?studentId=${newId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    loadData(true, newId);
  };

  const getShareUrl = () => {
    return `${window.location.origin}/portal?studentId=${studentId}`;
  };

  const copyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setSyncToast('Öğrenci program bağlantısı kopyalandı! 📋');
      setTimeout(() => {
        setCopiedLink(false);
        setSyncToast(null);
      }, 3000);
    }).catch(() => {
      // Fallback
      prompt('Öğrenci Program Linki:', url);
    });
  };

  const shareViaWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(
      `Merhaba ${studentName}! Haftalık ders ve ödev programın güncellendi. Aşağıdaki bağlantıdan güncel programını ve ödevlerini doğrudan görüntüleyebilirsin:\n\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const id = studentId || localStorage.getItem('currentUserId') || '1';
      const fresh = await getStudentTasks(id);
      setTasks(fresh);
      const dayIndex = new Date().getDay();
      const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
      setTodayTasks(fresh.filter((t: Task) => t.day === todayName));
      setSyncToast('Ödevler güncellendi! ✨');
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error('Cloud sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, correct: undefined, incorrect: undefined, empty: undefined, net: undefined } : t
    );
    setTasks(updatedTasks);
    await saveStudentTasks(studentId, updatedTasks);
    
    // Update today's tasks view
    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));
  };

  const openVideo = (task: Task) => {
    setActiveVideoTask(task);
    const parsed = parseVideoUrl(task.videoUrl, `${task.subject || ''} ${task.title || ''}`);
    setActiveVideo(parsed.videoId || parsed.embedUrl);
    setShowVideoModal(true);
  };

  const handleTaskClick = (task: Task) => {
    // Video görevine tıklandığında anında video oynatıcı penceresi açılır
    if (task.type === 'video') {
      openVideo(task);
      return;
    }
    // Soru ve Test ödevlerinde tıklandığında anında Doğru/Yanlış/Boş giriş penceresi açılır
    if (task.type === 'question' || task.type === 'test') {
      setEvaluatingTask(task);
      setEvalCorrect(task.correct ?? 0);
      setEvalIncorrect(task.incorrect ?? 0);
      setEvalEmpty(task.empty ?? 0);
      setShowResultModal(true);
    } else {
      toggleTask(task.id);
    }
  };

  const saveTaskEvaluation = async () => {
    if (!evaluatingTask) return;
    const isMiddleSchool = studentGrade.includes('8') || studentGrade.includes('7') || studentGrade.includes('6') || studentGrade.includes('5');
    const penalty = isMiddleSchool ? 3 : 4; // LGS: 3 yanlış 1 doğruyu götürür, Lise/YKS: 4 yanlış 1 doğruyu götürür
    const calculatedNet = Math.max(0, evalCorrect - (evalIncorrect / penalty));

    const updatedTasks = tasks.map(t => {
      if (t.id === evaluatingTask.id) {
        return {
          ...t,
          completed: true,
          correct: Number(evalCorrect),
          incorrect: Number(evalIncorrect),
          empty: Number(evalEmpty),
          net: Number(calculatedNet.toFixed(2))
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    await saveStudentTasks(studentId, updatedTasks);

    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));

    setShowResultModal(false);
    setEvaluatingTask(null);
  };

  const resetTaskEvaluation = async () => {
    if (!evaluatingTask) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === evaluatingTask.id) {
        return {
          ...t,
          completed: false,
          correct: undefined,
          incorrect: undefined,
          empty: undefined,
          net: undefined
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    await saveStudentTasks(studentId, updatedTasks);

    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));

    setShowResultModal(false);
    setEvaluatingTask(null);
  };

  const handleSaveTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    const correct = Number(examCorrect) || 0;
    const incorrect = Number(examIncorrect) || 0;
    const empty = Number(examEmpty) || 0;

    if (correct === 0 && incorrect === 0) {
      setExamSaveToast('Lütfen doğru veya yanlış soru sayısı giriniz!');
      setTimeout(() => setExamSaveToast(null), 3000);
      return;
    }

    const isMiddleSchool = studentGrade.includes('8') || studentGrade.includes('7') || studentGrade.includes('6') || studentGrade.includes('5');
    const penalty = isMiddleSchool ? 3 : 4; // LGS: 3, Lise/YKS: 4
    const net = Math.max(0, correct - (incorrect / penalty));

    const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    const trialId = Math.random().toString(36).substr(2, 9);
    const subjectName = examSubject.trim() || 'Genel Deneme';
    const trialName = examTitle.trim() || `${subjectName} Denemesi`;

    const wrongTopicsList = examWrongTopic.trim() 
      ? [{ topic: examWrongTopic.trim(), count: incorrect || 1 }] 
      : [];

    const newTrial: TrialData = {
      id: trialId,
      date: dateStr,
      results: {
        [subjectName]: {
          correct,
          incorrect,
          wrongTopics: wrongTopicsList
        }
      },
      totalNet: Number(net.toFixed(2))
    };

    const targetStudentId = studentId || localStorage.getItem('currentUserId') || '1';

    // 1. Detailed history
    const updatedHistory = [newTrial, ...trialHistory];
    setTrialHistory(updatedHistory);
    localStorage.setItem(`trial_results_detailed_${targetStudentId}`, JSON.stringify(updatedHistory));

    // 2. Simple trial results for charts
    try {
      const existingTrials = JSON.parse(localStorage.getItem(`trial_results_${targetStudentId}`) || '[]');
      const updatedTrials = [
        ...existingTrials,
        {
          id: trialId,
          date: dateStr,
          score: Number(net.toFixed(2)),
          totalQuestions: correct + incorrect + empty,
          title: trialName
        }
      ];
      localStorage.setItem(`trial_results_${targetStudentId}`, JSON.stringify(updatedTrials));
    } catch {}

    // 3. Error topics
    if (examWrongTopic.trim()) {
      try {
        const existingErrors = JSON.parse(localStorage.getItem(`topic_errors_${targetStudentId}`) || '[]');
        const match = existingErrors.find((err: any) => err.topic.toLowerCase() === examWrongTopic.trim().toLowerCase());
        let updatedErrors;
        if (match) {
          updatedErrors = existingErrors.map((err: any) => err.id === match.id ? { ...err, count: err.count + (incorrect || 1) } : err);
        } else {
          updatedErrors = [...existingErrors, { id: Math.random().toString(36).substr(2, 9), topic: examWrongTopic.trim(), count: incorrect || 1 }];
        }
        localStorage.setItem(`topic_errors_${targetStudentId}`, JSON.stringify(updatedErrors));
      } catch {}
    }

    // 4. Reset form & feedback
    setExamCorrect('');
    setExamIncorrect('');
    setExamEmpty('');
    setExamWrongTopic('');
    setExamTitle('');
    setExamSaveToast(`✅ Deneme sınavı kaydedildi! Toplam Net: ${net.toFixed(2)}`);
    setTimeout(() => setExamSaveToast(null), 4000);
  };

  const deleteTrial = (trialId: string) => {
    const targetStudentId = studentId || localStorage.getItem('currentUserId') || '1';
    const updated = trialHistory.filter(t => t.id !== trialId);
    setTrialHistory(updated);
    localStorage.setItem(`trial_results_detailed_${targetStudentId}`, JSON.stringify(updated));
    try {
      const simple = JSON.parse(localStorage.getItem(`trial_results_${targetStudentId}`) || '[]');
      const updatedSimple = simple.filter((t: any) => t.id !== trialId);
      localStorage.setItem(`trial_results_${targetStudentId}`, JSON.stringify(updatedSimple));
    } catch {}
    if (selectedTrial?.id === trialId) setSelectedTrial(null);
  };

  const finishProgram = async () => {
    if (tasks.length === 0) return;

    const completedCount = tasks.filter(t => t.completed).length;
    const rate = Math.round((completedCount / tasks.length) * 100);

    const newArchive: ArchivedProgram = {
      id: Math.random().toString(36).substr(2, 9),
      endDate: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      tasks: [...tasks],
      completionRate: rate
    };

    const updatedArchives = [newArchive, ...archivedPrograms];
    setArchivedPrograms(updatedArchives);
    await saveStudentArchivedPrograms(studentId, updatedArchives);

    // Clear current tasks in state and Firestore
    setTasks([]);
    setTodayTasks([]);
    await saveStudentTasks(studentId, []);
    setShowFinishConfirm(false);
  };

  const deleteArchive = async (id: string) => {
    const updated = archivedPrograms.filter(a => a.id !== id);
    setArchivedPrograms(updated);
    await saveStudentArchivedPrograms(studentId, updated);
  };

  const restoreArchive = async (archive: ArchivedProgram) => {
    setTasks(archive.tasks);
    await saveStudentTasks(studentId, archive.tasks);
    
    // Remove from archive
    const updatedArchives = archivedPrograms.filter(a => a.id !== archive.id);
    setArchivedPrograms(updatedArchives);
    await saveStudentArchivedPrograms(studentId, updatedArchives);

    // Update today's tasks view
    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(archive.tasks.filter((t: Task) => t.day === todayName));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Helper to extract assigned question count from a task
  const getTaskAssignedQuestions = (task: Task): number => {
    return getTaskQuestionCount(task);
  };

  // Helper to extract solved question count from a completed task
  const getTaskSolvedQuestions = (task: Task): number => {
    return getTaskSolvedCount(task);
  };

  // Weekly questions metrics
  const weeklyAssignedQuestions = tasks.reduce((sum, t) => sum + getTaskAssignedQuestions(t), 0);
  const weeklySolvedQuestions = tasks.filter(t => t.completed).reduce((sum, t) => sum + getTaskSolvedQuestions(t), 0);
  const weeklyRemainingQuestions = Math.max(0, weeklyAssignedQuestions - weeklySolvedQuestions);
  const weeklyQuestionProgressPercent = weeklyAssignedQuestions > 0 
    ? Math.min(100, Math.round((weeklySolvedQuestions / weeklyAssignedQuestions) * 100)) 
    : (tasks.length > 0 ? progressPercent : 0);

  // Question evaluations summary
  const weeklyTotalCorrect = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.correct || 0), 0);
  const weeklyTotalIncorrect = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.incorrect || 0), 0);
  const weeklyTotalEmpty = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.empty || 0), 0);
  const weeklyTotalNet = Number((tasks.filter(t => t.completed && t.net !== undefined).reduce((sum, t) => sum + (t.net || 0), 0)).toFixed(2));

  // Today's questions metrics
  const todayAssignedQuestions = todayTasks.reduce((sum, t) => sum + getTaskAssignedQuestions(t), 0);
  const todaySolvedQuestions = todayTasks.filter(t => t.completed).reduce((sum, t) => sum + getTaskSolvedQuestions(t), 0);

  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const currentTodayName = DAYS_TR[currentDayIndex];
  const todayIncompleteTasks = tasks.filter(t => t.day === currentTodayName && !t.completed);
  const pastWeekDays = DAYS_TR.slice(0, currentDayIndex);
  const pastIncompleteTasks = tasks.filter(t => pastWeekDays.includes(t.day) && !t.completed);

  return (
    <div className="space-y-8 pb-20">
      {/* Top Bar: Cloud Sync, Student Switcher & Direct Sharing Link */}
      <div className="bg-surface-container-low border border-outline-variant/15 p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aktif Öğrenci:</span>
              <span className="text-sm font-extrabold text-on-surface">{studentName}</span>
              {studentGrade && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {studentGrade}
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bulut Senkronize • Canlı Öğretmen Programı</span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Switcher, Copy Link, WhatsApp, Refresh */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {allStudents.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowStudentMenu(!showStudentMenu)}
                className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                Öğrenci Değiştir
              </button>
              {showStudentMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-xl z-50 p-2 space-y-2">
                  <div className="px-2 pt-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Öğrenci Seç / Değiştir</p>
                    <input
                      type="text"
                      placeholder="Öğrenci ara (örn: Rüzgar)..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {allStudents
                      .filter((s) => {
                        if (!studentSearchQuery.trim()) return true;
                        const q = studentSearchQuery.toLowerCase();
                        return (s.name || '').toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q);
                      })
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            switchStudent(s.id);
                            setStudentSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                            s.id === studentId ? 'bg-primary text-white' : 'hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="text-[10px] opacity-75">{s.grade}</span>
                        </button>
                      ))}
                    {allStudents.filter((s) => (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                      <p className="text-xs text-on-surface-variant text-center py-3">Eşleşen öğrenci bulunamadı.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Task Reminder Button */}
          <button
            type="button"
            onClick={() => setShowDailyReminderModal(true)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs relative",
              todayIncompleteTasks.length > 0 || pastIncompleteTasks.length > 0
                ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
            )}
            title="Günlük ödevlerini işaretle ve eksikleri kontrol et"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Günlük Hatırlatma</span>
            {(todayIncompleteTasks.length > 0 || pastIncompleteTasks.length > 0) && (
              <span className="bg-white text-amber-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {todayIncompleteTasks.length + pastIncompleteTasks.length}
              </span>
            )}
          </button>

          {/* AI Analysis Button */}
          <button
            type="button"
            onClick={() => {
              if (!studentAiAnalysis) {
                runStudentAiAnalysis();
              } else {
                setShowAiAnalysisModal(true);
              }
            }}
            disabled={loadingStudentAi}
            className="px-3.5 py-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-primary/20"
            title="Yapay zeka deneme ve haftalık doğru/yanlış analizini görüntüle"
          >
            <Sparkles className={cn("w-3.5 h-3.5", loadingStudentAi && "animate-spin")} />
            <span>{loadingStudentAi ? "Analiz Ediliyor..." : "Yapay Zeka Analizim"}</span>
          </button>

          <button
            onClick={() => window.location.href = '/library'}
            className="px-3.5 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            title="Kütüphaneme Git & Okuduğum Kitaplar"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kütüphanem</span>
          </button>

          <button
            onClick={copyShareLink}
            className="px-3.5 py-2 bg-white hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            title="Öğrencinin şifresiz doğrudan girebileceği program linkini kopyala"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
            {copiedLink ? 'Kopyalandı!' : 'Linki Kopyala'}
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            title="WhatsApp ile Öğrenciye Gönder"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp ile Gönder
          </button>

          <button
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="p-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-xl text-xs font-bold transition-all"
            title="Buluttan Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            onClick={() => {
              logoutFirebase();
              window.location.href = '/login';
            }}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            title="Güvenli Çıkış Yap"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Banner Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 text-white shadow-lg">
          <div className="relative z-10 max-w-lg">
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-4">
              <span className="text-white/70 uppercase tracking-widest text-xs font-bold">Öğrenci Portalı</span>
              {(studentGrade.includes('9') || studentGrade.includes('10')) && (
                <span className="inline-flex items-center gap-1 bg-amber-400/90 text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3 h-3 text-slate-900" /> Maarif Modeli
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight font-manrope">Tekrar hoş geldin,<br />{studentName.split(' ')[0]}.</h1>
            <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 sm:mb-10 font-medium leading-relaxed">
              Bugün yapman gereken <strong className="text-white font-black">{todayTasks.length} görev</strong> {todayQuestionStats.assignedQuestions > 0 ? `(${todayQuestionStats.assignedQuestions} soru)` : ''} var.
              {weeklyQuestionStats.assignedQuestions > 0 ? (
                <span>
                  {' '}Haftalık programında öğretmeninin verdiği toplam <strong className="text-amber-300 font-black underline decoration-amber-400/60 decoration-2 underline-offset-4">{weeklyQuestionStats.assignedQuestions} soru</strong> ödevinden <strong className="text-white font-black">{weeklyQuestionStats.solvedQuestions} tanesini</strong> (%{weeklyQuestionStats.progressPercent}) tamamladın.
                  {weeklyQuestionStats.remainingQuestions > 0 ? (
                    <span className="text-amber-200 font-bold"> ({weeklyQuestionStats.remainingQuestions} soru kaldı)</span>
                  ) : (
                    <span className="text-emerald-200 font-black"> 🎉 Harika! Haftalık tüm soru hedefini tamamladın!</span>
                  )}
                </span>
              ) : (
                tasks.length > todayTasks.length && ` Haftalık programında toplam ${tasks.length} görev bulunuyor.`
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  setViewMode('today');
                  setSelectedDayFilter('today');
                  scrollToTasks();
                }}
                className="bg-white text-primary font-bold px-6 sm:px-8 py-3.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg text-sm sm:text-base flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Bugünkü Görevlerim ({todayTasks.length})
              </button>
              <button 
                onClick={() => {
                  setViewMode('weekly');
                  setSelectedDayFilter('all');
                  scrollToTasks();
                }}
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 sm:px-8 py-3.5 rounded-full backdrop-blur-md transition-all shadow-lg text-sm sm:text-base flex items-center gap-2 border border-white/30 hover:scale-105 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                Haftalık Program Tablosu ({tasks.length})
              </button>
            </div>
          </div>
          
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-10 w-64 h-64 bg-secondary/20 rounded-full blur-2xl" />

          {/* Countdown Badge */}
          {countdown && (
            <div className="mt-6 md:mt-0 md:absolute md:top-8 md:right-8 bg-white/20 backdrop-blur-md border border-white/30 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-3 shadow-xl w-fit">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">{countdown.label} Sayacı</p>
                <p className="text-lg sm:text-xl font-black text-white leading-none">{countdown.days} Gün Kaldı</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Overview */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between shadow-ambient border border-outline-variant/10">
          <div className="flex items-center justify-between mb-6 w-full">
            <h3 className="text-on-surface text-xl font-bold">İlerleme Özeti</h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-full">
              Gerçek Zamanlı
            </span>
          </div>

          {tasks.length === 0 && trialHistory.length === 0 ? (
            <div className="py-8 text-center space-y-3 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-on-surface">Henüz İlerleme Verisi Yok</h4>
              <p className="text-xs text-on-surface-variant font-medium max-w-xs mx-auto leading-relaxed">
                Haftalık görevlerini tamamladığında ve deneme sınavı sonuçlarını girdiğinde ilerleme analizlerin burada gerçek verilerle oluşacaktır.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 w-full my-auto">
              {/* 1. Haftalık Görev Tamamlama */}
              <div className="flex items-center gap-4 p-3 bg-surface-container-low/70 rounded-2xl border border-outline-variant/10">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-surface-container-high" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeWidth="6" />
                    <circle className="text-tertiary" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * progressPercent) / 100} strokeLinecap="round" strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-on-surface">%{progressPercent}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Haftalık Görevler</p>
                  <p className="text-sm font-black text-on-surface">
                    {tasks.length > 0 ? `${completedCount} / ${tasks.length} Görev` : 'Görev bekleniyor'}
                  </p>
                  <p className="text-[10px] text-tertiary font-bold">
                    {tasks.length > 0 && completedCount === tasks.length 
                      ? 'Tüm görevler tamamlandı! 🎯' 
                      : `${tasks.length - completedCount} görev kaldı`}
                  </p>
                </div>
              </div>

              {/* 2. Haftalık Verilen Soru Sayısı ve Çözüm Durumu */}
              <div className="flex items-center gap-4 p-3 bg-primary/[0.06] rounded-2xl border border-primary/20">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-primary/15" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeWidth="6" />
                    <circle className="text-primary" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * weeklyQuestionStats.progressPercent) / 100} strokeLinecap="round" strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-primary">%{weeklyQuestionStats.progressPercent}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-black text-primary uppercase tracking-wider">Haftalık Verilen Soru</p>
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-primary/15 text-primary uppercase">Hedef</span>
                  </div>
                  <p className="text-sm sm:text-base font-black text-on-surface">
                    {weeklyQuestionStats.solvedQuestions} / {weeklyQuestionStats.assignedQuestions} Soru
                  </p>
                  <p className="text-[10px] font-semibold text-on-surface-variant">
                    {weeklyQuestionStats.remainingQuestions > 0 
                      ? `${weeklyQuestionStats.remainingQuestions} soru kaldı` 
                      : (weeklyQuestionStats.assignedQuestions > 0 ? '🎉 Haftalık hedef tamamlandı!' : 'Ödev bekleniyor')}
                  </p>
                </div>
              </div>

              {/* 3. Deneme Sınavı Neti veya Soru Doğruluk Analizi */}
              {trialHistory.length > 0 ? (
                <div className="flex items-center gap-4 p-3 bg-secondary/[0.06] rounded-2xl border border-secondary/20">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex flex-col items-center justify-center text-center p-1 border border-secondary/20 shrink-0">
                    <span className="text-base font-black text-secondary leading-none">
                      {trialHistory[0].totalNet.toFixed(1)}
                    </span>
                    <span className="text-[8px] font-black uppercase text-secondary/80 mt-0.5">Net</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Son Deneme Neti</p>
                    <p className="text-xs font-extrabold text-on-surface truncate max-w-[150px]">{trialHistory[0].date || 'Deneme'}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      {trialHistory.length} deneme sınavı kaydı
                    </p>
                  </div>
                </div>
              ) : (weeklyQuestionStats.correct > 0 || weeklyQuestionStats.incorrect > 0) ? (
                <div className="flex items-center gap-4 p-3 bg-emerald-500/[0.07] rounded-2xl border border-emerald-500/20">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 flex flex-col items-center justify-center text-center p-1 border border-emerald-300/40 shrink-0">
                    <span className="text-base font-black text-emerald-800 leading-none">
                      {weeklyQuestionStats.correct}
                    </span>
                    <span className="text-[8px] font-black uppercase text-emerald-800 mt-0.5">Doğru</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">Soru Başarısı</p>
                    <p className="text-xs font-black text-emerald-800">
                      {weeklyQuestionStats.correct} D • {weeklyQuestionStats.incorrect} Y {weeklyQuestionStats.empty > 0 ? `• ${weeklyQuestionStats.empty} B` : ''}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700">
                      Net: {weeklyQuestionStats.net}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-surface-container-low rounded-2xl text-center text-xs text-on-surface-variant font-medium">
                  💡 Görevlerinize tıklayarak doğru/yanlış sonuçlarınızı girebilirsiniz.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Main Ödev Akışı and Learning Content */}
        <div className="lg:col-span-8 flex flex-col gap-8" ref={tasksRef}>
          {/* Ödev Akışı Card */}
          <div className="bg-surface-container-low rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-7 md:p-10 border border-outline-variant/10 shadow-sm relative overflow-hidden">
            {/* Sync Feedback Toast */}
            <AnimatePresence>
              {syncToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-4 z-20 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{syncToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Daily Incomplete / Undone Homework Reminder Banner */}
            {(todayIncompleteTasks.length > 0 || pastIncompleteTasks.length > 0) && (
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 border border-amber-300/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Ödev & Görev Hatırlatıcısı
                      </span>
                      {todayIncompleteTasks.length > 0 && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          Bugün {todayIncompleteTasks.length} ödev bekliyor
                        </span>
                      )}
                      {pastIncompleteTasks.length > 0 && (
                        <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
                          Geçmişten {pastIncompleteTasks.length} eksik var
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-on-surface leading-relaxed">
                      {todayIncompleteTasks.length > 0 
                        ? `Bugünün programında yapman ve işaretlemen gereken ${todayIncompleteTasks.length} adet ödev bulunuyor.` 
                        : 'Bugünkü ödevlerin tamamlandı!'}
                      {pastIncompleteTasks.length > 0 && ` Ayrıca önceki günlerden kalan ${pastIncompleteTasks.length} adet eksik ödevini de tamamlayıp doğru/yanlış sayılarını girmelisin.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowDailyReminderModal(true)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Hemen İşaretle & Sonuç Gir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('today');
                      setSelectedDayFilter('today');
                      scrollToTasks();
                    }}
                    className="px-3.5 py-2.5 bg-white hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold rounded-xl transition-all"
                  >
                    Bugünün Ödevleri
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-primary font-black text-[10px] uppercase tracking-widest">Ders & Görev Takibi</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Canlı Senkronize
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-manrope text-on-surface">
                  {viewMode === 'weekly' ? 'Haftalık Program Tablosu' : 'Ödev Akışı'}
                </h3>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSyncCloud()}
                  disabled={isSyncing}
                  title="Öğretmenin güncel ödevlerini buluttan yenile"
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/15 rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all shadow-xs active:scale-95"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isSyncing && "animate-spin")} />
                  <span>{isSyncing ? "Yenileniyor..." : "Yenile"}</span>
                </button>
                {tasks.length > 0 && (
                  <button 
                    onClick={() => setShowFinishConfirm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-xs"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Programı Bitir
                  </button>
                )}
                <span className="text-primary font-bold text-xs bg-white border border-outline-variant/10 px-3 py-2 rounded-xl shadow-xs whitespace-nowrap">
                  Bugün: {DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
                </span>
              </div>
            </div>

            {/* Quick Stats on Mobile & Desktop: Haftalık Verilen Soru ve Ödev İstatistikleri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5 p-3 sm:p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-2xs">
              <div className="p-2 sm:p-2.5 text-center bg-primary/[0.05] rounded-xl border border-primary/15 space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] font-black text-primary uppercase tracking-tight">Haftalık Verilen Soru</p>
                </div>
                <p className="text-base sm:text-xl font-black text-on-surface">{weeklyQuestionStats.assignedQuestions} Soru</p>
                <p className="text-[9px] font-bold text-primary/80">Öğretmen Hedefi</p>
              </div>

              <div className="p-2 sm:p-2.5 text-center bg-tertiary/[0.05] rounded-xl border border-tertiary/15 space-y-0.5">
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-tight">Çözülen Soru</p>
                <p className="text-base sm:text-xl font-black text-tertiary">{weeklyQuestionStats.solvedQuestions} Soru</p>
                <p className="text-[9px] font-bold text-tertiary/80">%{weeklyQuestionStats.progressPercent} Tamamlandı</p>
              </div>

              <div className="p-2 sm:p-2.5 text-center bg-amber-500/[0.05] rounded-xl border border-amber-500/15 space-y-0.5">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Kalan Soru</p>
                <p className="text-base sm:text-xl font-black text-amber-800">{weeklyQuestionStats.remainingQuestions} Soru</p>
                <p className="text-[9px] font-bold text-amber-700/80">Haftalık Kalan</p>
              </div>

              <div className="p-2 sm:p-2.5 text-center bg-surface-container-low rounded-xl border border-outline-variant/10 space-y-0.5">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Toplam Ödev</p>
                <p className="text-base sm:text-xl font-black text-on-surface">{completedCount} / {tasks.length}</p>
                <p className="text-[9px] font-bold text-on-surface-variant">Görev Tamamlandı</p>
              </div>
            </div>

            {/* Soru Başarısı Detayı (Eğer öğrenci sonuç girdiyse) */}
            {(weeklyQuestionStats.correct > 0 || weeklyQuestionStats.incorrect > 0 || weeklyQuestionStats.empty > 0) && (
              <div className="mb-4 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span className="font-extrabold text-emerald-950">Haftalık Soru Çözüm Sonuçların:</span>
                </div>
                <div className="flex items-center gap-3 font-bold text-emerald-800">
                  <span className="text-emerald-700">{weeklyQuestionStats.correct} Doğru</span>
                  <span>•</span>
                  <span className="text-rose-700">{weeklyQuestionStats.incorrect} Yanlış</span>
                  {weeklyQuestionStats.empty > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700">{weeklyQuestionStats.empty} Boş</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md font-black text-[11px]">
                    Net: {weeklyQuestionStats.net}
                  </span>
                </div>
              </div>
            )}

            {/* Primary View Mode Switcher: Günlük Akış (Bugün) vs Haftalık Program Tablosu */}
            <div className="bg-surface-container-highest/60 p-1 rounded-2xl mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('today');
                    setSelectedDayFilter('today');
                  }}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
                    viewMode === 'today'
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span>Günlük Görevler</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-black",
                    viewMode === 'today' ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
                  )}>
                    {todayTasks.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('weekly');
                    setSelectedDayFilter('all');
                  }}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2",
                    viewMode === 'weekly'
                      ? "bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary/20"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Haftalık Tablo Programı</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-black",
                    viewMode === 'weekly' ? "bg-white/20 text-white" : "bg-outline-variant/20 text-on-surface-variant"
                  )}>
                    {tasks.length}
                  </span>
                </button>
              </div>

              {/* Sub-style Switcher for Weekly: Grid vs Table */}
              {viewMode === 'weekly' && (
                <div className="hidden sm:flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setWeeklyTableStyle('grid')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      weeklyTableStyle === 'grid' ? "bg-white text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <Grid className="w-3.5 h-3.5 text-primary" />
                    <span>7 Günlük Çizelge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyTableStyle('table')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      weeklyTableStyle === 'table' ? "bg-white text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                    <span>Liste Tablosu</span>
                  </button>
                </div>
              )}
            </div>

            {/* Günlük Modda Bugünün Soru Özeti Barı */}
            {viewMode === 'today' && (
              <div className="mb-4 p-3.5 bg-gradient-to-r from-primary/10 via-primary/5 to-surface-container-low border border-primary/20 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-extrabold text-on-surface">Bugünün Soru Planı:</span>
                  <span className="font-black text-primary bg-white px-2 py-0.5 rounded-md border border-primary/20 shadow-2xs">
                    {todayQuestionStats.assignedQuestions} Soru Hedefi
                  </span>
                </div>
                <div className="flex items-center gap-3 font-bold text-on-surface-variant flex-wrap">
                  <span>Çözülen: <strong className="text-emerald-700">{todayQuestionStats.solvedQuestions} Soru</strong></span>
                  <span>•</span>
                  <span>Kalan: <strong className="text-amber-700">{todayQuestionStats.remainingQuestions} Soru</strong></span>
                  <span>•</span>
                  <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-black border border-primary/15">
                    Haftalık Toplam Verilen: {weeklyQuestionStats.assignedQuestions} Soru
                  </span>
                </div>
              </div>
            )}

            {/* Day Filter Chips (Horizontal Touch Scroll on Phone) */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full sm:w-auto scroll-smooth no-scrollbar">
                {viewMode === 'weekly' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayFilter('all');
                      setSelectedVideoIndex(0);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0",
                      selectedDayFilter === 'all'
                        ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                        : "bg-surface-container-highest/60 text-on-surface-variant hover:bg-surface-container-highest"
                    )}
                  >
                    <span>Tüm Hafta</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-black",
                      selectedDayFilter === 'all' ? "bg-white/20 text-white" : "bg-outline-variant/15 text-on-surface-variant"
                    )}>
                      {tasks.length}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayFilter('today');
                    setSelectedVideoIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0",
                    selectedDayFilter === 'today'
                      ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                      : "bg-surface-container-highest/60 text-on-surface-variant hover:bg-surface-container-highest"
                  )}
                >
                  <span>Bugün</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-black",
                    selectedDayFilter === 'today' ? "bg-white/20 text-white" : "bg-outline-variant/15 text-on-surface-variant"
                  )}>
                    {todayTasks.length}
                  </span>
                </button>
                {DAYS_TR.map(day => {
                  const count = tasks.filter(t => t.day === day).length;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDayFilter(day);
                        setSelectedVideoIndex(0);
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0",
                        selectedDayFilter === day
                          ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                          : "bg-surface-container-highest/60 text-on-surface-variant hover:bg-surface-container-highest"
                      )}
                    >
                      <span>{day.slice(0, 3)}</span>
                      {count > 0 && (
                        <span className={cn(
                          "text-[9px] px-1 rounded font-black",
                          selectedDayFilter === day ? "bg-white/20 text-white" : "bg-outline-variant/15 text-on-surface-variant"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Layout Switcher (Cards vs Table) for daily view mode */}
              {viewMode === 'today' && (
                <div className="flex items-center gap-1 bg-surface-container-highest/50 p-1 rounded-xl self-end">
                  <button
                    type="button"
                    onClick={() => setDisplayLayout('cards')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      displayLayout === 'cards' ? "bg-white text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kartlar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayLayout('table')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      displayLayout === 'table' ? "bg-white text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Tablo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tasks Rendering based on ViewMode & Selection */}
            {(() => {
              // --- 1. WEEKLY VIEW MODE (TABLE / TIMETABLE) ---
              if (viewMode === 'weekly') {
                if (tasks.length === 0) {
                  return (
                    <div className="text-center p-8 bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                        <ClipboardCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-manrope font-bold text-base text-on-surface">Haftalık Program Boş</h4>
                        <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                          Öğretmeniniz henüz bu hafta için görev atamamış olabilir. Buluttan yenileyerek kontrol edebilirsiniz.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleSyncCloud()}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                      >
                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                        Buluttan Şimdi Yenile
                      </button>
                    </div>
                  );
                }

                // Sub-mode: 7-Day Timetable Grid
                if (weeklyTableStyle === 'grid') {
                  const daysToDisplay = selectedDayFilter === 'all' 
                    ? DAYS_TR 
                    : selectedDayFilter === 'today'
                    ? [DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]]
                    : [selectedDayFilter];

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant px-1">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Calendar className="w-4 h-4" />
                          Haftalık 7 Günlük Çalışma Tablosu ({tasks.length} Görev {weeklyQuestionStats.assignedQuestions > 0 ? `• ${weeklyQuestionStats.assignedQuestions} Soru Hedefi` : ''})
                        </span>
                        <span className="text-[11px] text-on-surface-variant/70 italic hidden sm:inline">
                          Herhangi bir göreve tıklayarak sonucunu girebilir veya videoyu izleyebilirsiniz.
                        </span>
                      </div>

                      <div className="overflow-x-auto pb-3 custom-scrollbar">
                        <div className="min-w-[850px] grid grid-cols-7 gap-3 items-start">
                          {daysToDisplay.map((day) => {
                            const dayTasks = tasks.filter(t => t.day === day);
                            const isCurrentDay = day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                            const dayCompletedCount = dayTasks.filter(t => t.completed).length;
                            const dayQStats = calculateWeeklyQuestionStats(dayTasks);

                            return (
                              <div 
                                key={day} 
                                className={cn(
                                  "flex flex-col rounded-2xl border p-2.5 min-h-[380px] transition-all",
                                  isCurrentDay 
                                    ? "bg-primary/[0.04] border-primary/40 ring-2 ring-primary/20 shadow-sm" 
                                    : "bg-surface-container-lowest border-outline-variant/15 hover:border-primary/30"
                                )}
                              >
                                {/* Column Day Header */}
                                <div className={cn(
                                  "p-2.5 rounded-xl mb-2 text-center transition-all",
                                  isCurrentDay ? "bg-primary text-white shadow-xs" : "bg-surface-container-high/70 text-on-surface"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider">{day}</span>
                                    {isCurrentDay && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-white/20 text-white">
                                        Bugün
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-bold opacity-90 mt-1 flex justify-between items-center">
                                    <span>{dayTasks.length} Görev</span>
                                    <span>{dayQStats.assignedQuestions > 0 ? `${dayQStats.assignedQuestions} Soru` : `${dayCompletedCount}/${dayTasks.length} Tamam`}</span>
                                  </div>
                                  {dayQStats.assignedQuestions > 0 && (
                                    <div className="text-[9px] font-semibold opacity-85 mt-0.5 pt-0.5 border-t border-current/15 flex justify-between items-center">
                                      <span>Çözülen: {dayQStats.solvedQuestions}</span>
                                      <span>Kalan: {dayQStats.remainingQuestions}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Task Cards in this Day Column */}
                                <div className="space-y-2 flex-grow">
                                  {dayTasks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-16 px-1 text-on-surface-variant/40">
                                      <span className="text-[11px] font-bold italic">Planlanmış görev yok</span>
                                    </div>
                                  ) : (
                                    dayTasks.map((task) => (
                                      <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        className={cn(
                                          "p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer relative group flex flex-col justify-between gap-1.5",
                                          task.completed 
                                            ? "bg-tertiary/[0.05] border-tertiary/25 text-on-surface/50" 
                                            : "bg-surface-container-low border-outline-variant/15 hover:border-primary hover:shadow-xs"
                                        )}
                                      >
                                        <div>
                                          {/* Subject & Type Badges */}
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[85px]">
                                              {task.subject || 'Ders'}
                                            </span>
                                            <span className={cn(
                                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0",
                                              task.type === 'video' ? "bg-red-50 text-red-600" :
                                              task.type === 'test' ? "bg-indigo-50 text-indigo-700" :
                                              task.type === 'question' ? "bg-amber-50 text-amber-700" :
                                              task.type === 'book' ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                                            )}>
                                              {task.type === 'video' ? 'Video' : 
                                               task.type === 'test' ? 'Test' :
                                               task.type === 'question' ? 'Soru' : 
                                               task.type === 'book' ? 'Kitap' : 'Okuma'}
                                            </span>
                                          </div>

                                          {/* Task Title */}
                                          <p className={cn(
                                            "font-bold leading-tight line-clamp-2 text-xs",
                                            task.completed ? "line-through text-on-surface/40" : "text-on-surface"
                                          )}>
                                            {task.title}
                                          </p>

                                          {task.amount && (
                                            <p className="text-[10px] font-semibold text-on-surface-variant mt-1">
                                              Hedef: {task.amount}
                                            </p>
                                          )}
                                        </div>

                                        {/* Footer Actions: Checkbox & Result / Video Button */}
                                        <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/10 mt-1">
                                          {task.type === 'video' ? (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openVideo(task);
                                              }}
                                              className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 hover:text-red-700"
                                            >
                                              <Play className="w-3 h-3 fill-current" />
                                              <span>Videoyu İzle</span>
                                            </button>
                                          ) : (task.completed && (task.type === 'question' || task.type === 'test')) ? (
                                            <div className="inline-flex items-center flex-wrap gap-1">
                                              <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                {task.correct ?? 0}D
                                              </span>
                                              <span className="text-[9px] font-black text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                                                {task.incorrect ?? 0}Y
                                              </span>
                                              {task.empty !== undefined && task.empty > 0 && (
                                                <span className="text-[9px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                  {task.empty}B
                                                </span>
                                              )}
                                              <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                {task.net !== undefined ? task.net : Math.max(0, (task.correct || 0) - ((task.incorrect || 0) / 4)).toFixed(2)} Net
                                              </span>
                                            </div>
                                          ) : (!task.completed && (task.type === 'question' || task.type === 'test')) ? (
                                            <span className="text-[9px] font-bold text-primary hover:underline">
                                              Sonuç Gir
                                            </span>
                                          ) : (
                                            <span />
                                          )}

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleTask(task.id);
                                            }}
                                            className={cn(
                                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 active:scale-95",
                                              task.completed 
                                                ? "bg-tertiary border-tertiary text-white shadow-2xs" 
                                                : "border-outline-variant/60 hover:border-primary text-transparent"
                                            )}
                                            aria-label="Tamamla"
                                          >
                                            <Check className="w-3 h-3 text-white" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Sub-mode: Structured List Table
                const filteredListTasks = selectedDayFilter === 'all' 
                  ? [...tasks].sort((a, b) => DAYS_TR.indexOf(a.day) - DAYS_TR.indexOf(b.day))
                  : selectedDayFilter === 'today'
                  ? tasks.filter(t => t.day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1])
                  : tasks.filter(t => t.day === selectedDayFilter);

                return (
                  <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 shadow-sm bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-surface-container-high/40 text-on-surface-variant font-black text-[10px] uppercase tracking-widest border-b border-outline-variant/10">
                          <th className="px-5 py-3.5">Gün</th>
                          <th className="px-5 py-3.5">Ders</th>
                          <th className="px-5 py-3.5">Görev / Ödev Detayı</th>
                          <th className="px-5 py-3.5">Tip / Miktar</th>
                          <th className="px-5 py-3.5 text-center">Durum / İzle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredListTasks.map((task) => (
                          <tr 
                            key={task.id} 
                            onClick={() => handleTaskClick(task)}
                            className={cn(
                              "hover:bg-primary/[0.03] transition-colors cursor-pointer",
                              task.completed ? "bg-tertiary/[0.02]" : ""
                            )}
                          >
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                                task.day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-surface-container-high text-on-surface-variant"
                              )}>
                                {task.day}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs sm:text-sm text-on-surface">
                              {task.subject || 'Ders'}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="space-y-1">
                                <p className={cn(
                                  "font-semibold text-xs sm:text-sm max-w-sm",
                                  task.completed ? "text-on-surface/60 line-through" : "text-on-surface"
                                )}>
                                  {task.title}
                                </p>
                                {task.completed && (task.type === 'question' || task.type === 'test') && (
                                  <div className="inline-flex items-center flex-wrap gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 rounded-lg text-[10px] font-black">
                                    <span className="text-emerald-700">🎯 {task.correct ?? 0} Doğru</span>
                                    <span className="text-rose-700">• {task.incorrect ?? 0} Yanlış</span>
                                    <span className="text-slate-600">• {task.empty ?? 0} Boş</span>
                                    <span className="text-primary font-black bg-white px-1.5 py-0.5 rounded shadow-2xs border border-primary/20">
                                      {task.net !== undefined ? task.net : Math.max(0, (task.correct || 0) - ((task.incorrect || 0) / 4)).toFixed(2)} Net
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1",
                                task.type === 'video' ? "bg-red-50 text-red-600" : 
                                task.type === 'test' ? "bg-indigo-50 text-indigo-700" :
                                task.type === 'question' ? "bg-amber-50 text-amber-700" : 
                                task.type === 'book' ? "bg-emerald-50 text-emerald-700" :
                                "bg-tertiary/10 text-tertiary"
                              )}>
                                {task.type === 'test' && <ClipboardCheck className="w-3 h-3" />}
                                {task.type === 'book' && <BookOpen className="w-3 h-3" />}
                                {task.type === 'question' && <Target className="w-3 h-3" />}
                                {task.type === 'video' ? 'Video' : 
                                 task.type === 'test' ? `Test: ${task.amount || 'Ödev'}` :
                                 task.type === 'question' ? `${task.amount || 'Soru'}` : 
                                 task.type === 'book' ? `Kitap: ${task.amount || 'Okuma'}` :
                                 'Okuma'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {task.type === 'video' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVideo(task);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>İzle</span>
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                    task.completed ? "bg-tertiary border-tertiary text-white shadow-xs" : "border-outline hover:border-primary"
                                  )}>
                                    {task.completed && <CheckSquare className="w-4 h-4" />}
                                  </div>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // --- 2. DAILY VIEW MODE (GÜNLÜK AKIŞ) ---
              const currentFilteredTasks = (() => {
                const dayIndex = new Date().getDay();
                const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
                if (selectedDayFilter === 'today' || selectedDayFilter === 'all') {
                  return tasks.filter(t => t.day === todayName);
                }
                return tasks.filter(t => t.day === selectedDayFilter);
              })();

              if (currentFilteredTasks.length === 0) {
                if (selectedDayFilter === 'today' && tasks.length > 0) {
                  return (
                    <div className="text-center p-6 sm:p-8 bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-primary/20 shadow-sm space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-manrope font-bold text-base text-on-surface">Bugün İçin Planlanmış Ödev Yok</h4>
                        <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                          Bugün için atanmış bir ödevin bulunmuyor. Ancak bu hafta öğretmeninin senin için tanımladığı <strong className="text-primary font-bold">{tasks.length} adet ödev</strong> var.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setViewMode('weekly');
                          setSelectedDayFilter('all');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                      >
                        <Calendar className="w-4 h-4" />
                        Haftalık Programı Tablo Olarak Gör ({tasks.length})
                      </button>
                    </div>
                  );
                }

                if (selectedDayFilter !== 'all' && tasks.length > 0) {
                  return (
                    <div className="text-center p-6 sm:p-8 bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-manrope font-bold text-sm text-on-surface">{selectedDayFilter} günü için ödev bulunmuyor</h4>
                        <p className="text-xs text-on-surface-variant mt-1">Haftalık programındaki diğer günleri kontrol edebilirsin.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setViewMode('weekly');
                          setSelectedDayFilter('all');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-all"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Haftalık Tabloyu Aç ({tasks.length})
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="text-center p-8 bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-manrope font-bold text-base text-on-surface">Atanmış Ödev Bulunamadı</h4>
                      <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                        Öğretmenin henüz sana bir ödev atamamış olabilir veya yeni verilen ödevler aktarılıyor olabilir.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleSyncCloud()}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                    >
                      <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                      Buluttan Şimdi Yenile
                    </button>
                  </div>
                );
              }

              // Daily view - Table Layout
              if (displayLayout === 'table') {
                return (
                  <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 shadow-sm bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="bg-surface-container-high/40 text-on-surface-variant font-black text-[10px] uppercase tracking-widest border-b border-outline-variant/10">
                          <th className="px-5 py-3.5">Gün</th>
                          <th className="px-5 py-3.5">Ders</th>
                          <th className="px-5 py-3.5">Görev / Ödev Detayı</th>
                          <th className="px-5 py-3.5">Tip / Miktar</th>
                          <th className="px-5 py-3.5 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {currentFilteredTasks.map((task) => (
                          <tr 
                            key={task.id} 
                            onClick={() => handleTaskClick(task)}
                            className={cn(
                              "hover:bg-primary/[0.03] transition-colors cursor-pointer",
                              task.completed ? "bg-tertiary/[0.02]" : ""
                            )}
                          >
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                                task.day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-surface-container-high text-on-surface-variant"
                              )}>
                                {task.day}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs sm:text-sm text-on-surface">{task.subject || 'Ders'}</td>
                            <td className="px-5 py-3.5">
                              <div className="space-y-1">
                                <p className={cn(
                                  "font-semibold text-xs sm:text-sm max-w-xs",
                                  task.completed ? "text-on-surface/60 line-through" : "text-on-surface"
                                )}>
                                  {task.title}
                                </p>
                                {task.completed && (task.type === 'question' || task.type === 'test') && (
                                  <div className="inline-flex items-center flex-wrap gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 rounded-lg text-[10px] font-black">
                                    <span className="text-emerald-700">🎯 {task.correct ?? 0} Doğru</span>
                                    <span className="text-rose-700">• {task.incorrect ?? 0} Yanlış</span>
                                    <span className="text-slate-600">• {task.empty ?? 0} Boş</span>
                                    <span className="text-primary font-black bg-white px-1.5 py-0.5 rounded shadow-2xs border border-primary/20">
                                      {task.net !== undefined ? task.net : Math.max(0, (task.correct || 0) - ((task.incorrect || 0) / 4)).toFixed(2)} Net
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1",
                                task.type === 'video' ? "bg-red-50 text-red-600" : 
                                task.type === 'test' ? "bg-indigo-50 text-indigo-700" :
                                task.type === 'question' ? "bg-amber-50 text-amber-700" : 
                                task.type === 'book' ? "bg-emerald-50 text-emerald-700" :
                                "bg-tertiary/10 text-tertiary"
                              )}>
                                {task.type === 'test' && <ClipboardCheck className="w-3 h-3" />}
                                {task.type === 'book' && <BookOpen className="w-3 h-3" />}
                                {task.type === 'question' && <Target className="w-3 h-3" />}
                                {task.type === 'video' ? 'Video' : 
                                 task.type === 'test' ? `Test: ${task.amount || 'Ödev'}` :
                                 task.type === 'question' ? `${task.amount || 'Soru'}` : 
                                 task.type === 'book' ? `Kitap: ${task.amount || 'Okuma'}` :
                                 'Okuma'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {task.type === 'video' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVideo(task);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>İzle</span>
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                    task.completed ? "bg-tertiary border-tertiary text-white shadow-xs" : "border-outline hover:border-primary"
                                  )}>
                                    {task.completed && <CheckSquare className="w-4 h-4" />}
                                  </div>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Daily view - Card Layout
              return (
                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentFilteredTasks.map((task) => (
                    <div 
                      key={task.id} 
                      onClick={() => handleTaskClick(task)}
                      className={cn(
                        "flex items-start sm:items-center p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative gap-3 sm:gap-4 group",
                        task.completed 
                          ? "bg-tertiary/[0.04] border-tertiary/25" 
                          : "bg-surface-container-lowest border-outline-variant/15 hover:border-primary/40 shadow-xs"
                      )}
                    >
                      {/* Checkbox Touch Target */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(task.id);
                        }}
                        aria-label="Görevi tamamla"
                        className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 sm:mt-0 active:scale-95",
                          task.completed 
                            ? "bg-tertiary border-tertiary text-white shadow-xs" 
                            : "border-outline-variant/60 hover:border-primary text-transparent"
                        )}
                      >
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </button>

                      {/* Content Area */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                          {selectedDayFilter === 'all' && (
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                              task.day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
                                ? "bg-primary text-white shadow-xs"
                                : "bg-surface-container-high text-on-surface-variant"
                            )}>
                              {task.day}
                            </span>
                          )}
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            {task.subject || 'Ders'}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-md uppercase inline-flex items-center gap-1",
                            task.type === 'video' ? "bg-red-50 text-red-600" : 
                            task.type === 'test' ? "bg-indigo-50 text-indigo-700" :
                            task.type === 'question' ? "bg-amber-50 text-amber-700" : 
                            task.type === 'book' ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                          )}>
                            {task.type === 'video' ? 'Video' : 
                             task.type === 'test' ? `Test • ${task.amount || 'Çözüm'}` :
                             task.type === 'question' ? `${task.amount || 'Soru'}` : 
                             task.type === 'book' ? `Kitap • ${task.amount || 'Okuma'}` : 
                             'Okuma'}
                          </span>
                        </div>

                        <p className={cn(
                          "font-bold text-xs sm:text-sm leading-snug break-words",
                          task.completed ? "text-on-surface/50 line-through" : "text-on-surface"
                        )}>
                          {task.title}
                        </p>

                        {/* Completed Stats Tag */}
                        {task.completed && (task.type === 'question' || task.type === 'test') && (
                          <div className="mt-1.5 inline-flex items-center flex-wrap gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/70 rounded-xl text-[10px] font-black">
                            <span className="text-emerald-700">🎯 {task.correct ?? 0} Doğru</span>
                            <span className="text-rose-700">• {task.incorrect ?? 0} Yanlış</span>
                            <span className="text-slate-600">• {task.empty ?? 0} Boş</span>
                            <span className="text-primary font-black bg-white px-2 py-0.5 rounded-md shadow-2xs border border-primary/20">
                              {task.net !== undefined ? task.net : Math.max(0, (task.correct || 0) - ((task.incorrect || 0) / 4)).toFixed(2)} Net
                            </span>
                          </div>
                        )}

                        {/* Prompt to Enter D/Y Score */}
                        {!task.completed && (task.type === 'question' || task.type === 'test') && (
                          <div className="mt-1.5">
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1 hover:bg-primary/20 transition-colors">
                              <Target className="w-3 h-3" />
                              Sonuç Gir (D / Y)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Video Button */}
                      {task.type === 'video' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVideo(task);
                          }}
                          className="shrink-0 self-center p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5 text-xs font-bold active:scale-95"
                          title="Videoyu Aç ve İzle"
                        >
                          <Youtube className="w-5 h-5 text-red-600" />
                          <span>İzle</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Video Hub Section (Günün Videoları ve Tüm Hafta Desteği) */}
          {(() => {
            const dayIndex = new Date().getDay();
            const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
            const isDailyMode = viewMode === 'today';

            const activeDay = (selectedDayFilter && selectedDayFilter !== 'all' && selectedDayFilter !== 'today') 
              ? selectedDayFilter 
              : todayName;

            // Tüm atanan videolar (öğrencinin haftalık programındaki tüm video görevleri)
            const allAssignedVideos = tasks.filter(t => t.type === 'video');
            if (allAssignedVideos.length === 0) return null;

            // O güne (seçili güne / bugüne) ait videolar
            const targetDayVideos = tasks.filter(t => t.day === activeDay && t.type === 'video');

            // Kullanıcı kuralı: Öğrenci günlük görünümü seçmişse o gün verilen videoları görsün, geçmiş videoların görünmesine gerek yok!
            if (isDailyMode && targetDayVideos.length === 0) {
              // O gün için atanmış video yoksa, günlük görünümde video hub'ı gizlenir (geçmiş videolar çıkmaz)
              return null;
            }

            // Görüntülenecek video listesi
            let displayVideos: Task[] = [];
            if (isDailyMode) {
              // Günlük görünüm: Kesinlikle SADECE o gün verilen tüm videolar (birden fazla varsa hepsi)
              displayVideos = targetDayVideos;
            } else {
              // Haftalık mod: Öğrenci haftalık program tablosunu inceliyor
              if (selectedDayFilter === 'all') {
                const currentDayVideos = tasks.filter(t => t.day === todayName && t.type === 'video');
                const activeTab = (videoTabFilter === 'today' && currentDayVideos.length > 0) ? 'today' : 'all';
                displayVideos = activeTab === 'today' ? currentDayVideos : allAssignedVideos;
              } else {
                displayVideos = targetDayVideos.length > 0 ? targetDayVideos : allAssignedVideos;
              }
            }

            if (displayVideos.length === 0) return null;

            const safeIndex = selectedVideoIndex < displayVideos.length ? selectedVideoIndex : 0;
            const currentVideo = displayVideos[safeIndex] || displayVideos[0];
            const completedCount = displayVideos.filter(v => v.completed).length;
            const currentParsed = parseVideoUrl(currentVideo.videoUrl, `${currentVideo.subject || ''} ${currentVideo.title || ''}`);

            return (
              <div className="bg-surface-container-lowest rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-ambient border border-outline-variant/15 p-6 sm:p-8 space-y-6">
                {/* Video Hub Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10 pb-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-tertiary font-black text-xs uppercase tracking-widest bg-tertiary/10 px-3.5 py-1 rounded-full flex items-center gap-1.5">
                        <Youtube className="w-3.5 h-3.5 text-red-600" />
                        {isDailyMode ? (activeDay === todayName ? 'Günün Video Dersleri' : `${activeDay} Videoları`) : 'Video Dersleri'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
                        {displayVideos.length} Video {isDailyMode ? (activeDay === todayName ? 'Bugün Verildi' : 'Bu Gün İçin') : 'Programda'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" />
                        {completedCount} / {displayVideos.length} İzlendi
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black font-manrope text-on-surface">
                        {currentVideo.title}
                      </h2>
                      <p className="text-xs font-bold text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                        <span className="text-primary font-black uppercase">{currentVideo.subject || 'Ders'}</span>
                        <span>• {currentVideo.day}</span>
                        {currentVideo.day === todayName && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-md">Bugün</span>
                        )}
                        {currentVideo.amount && <span>• {currentVideo.amount}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Switcher & Navigation Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {/* Weekly Mode Filter Tabs (only in weekly mode) */}
                    {!isDailyMode && (
                      <div className="flex items-center p-1 bg-surface-container-high rounded-xl text-xs font-black">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoTabFilter('all');
                            setSelectedVideoIndex(0);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                            videoTabFilter === 'all'
                              ? "bg-white text-on-surface shadow-xs"
                              : "text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          <span>Tüm Videolar</span>
                          <span className="text-[10px] bg-surface-container-highest px-1.5 py-0.2 rounded-full">{allAssignedVideos.length}</span>
                        </button>

                        {tasks.filter(t => t.day === todayName && t.type === 'video').length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setVideoTabFilter('today');
                              setSelectedVideoIndex(0);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                              videoTabFilter === 'today'
                                ? "bg-white text-on-surface shadow-xs"
                                : "text-on-surface-variant hover:text-on-surface"
                            )}
                          >
                            <span>Bugün</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                              {tasks.filter(t => t.day === todayName && t.type === 'video').length}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Previous / Next Controls if multiple videos given */}
                    {displayVideos.length > 1 && (
                      <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setSelectedVideoIndex(prev => Math.max(0, prev - 1))}
                          disabled={safeIndex === 0}
                          className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-on-surface transition-all"
                          title="Önceki Video"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-on-surface px-1.5">
                          {safeIndex + 1}/{displayVideos.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedVideoIndex(prev => Math.min(displayVideos.length - 1, prev + 1))}
                          disabled={safeIndex === displayVideos.length - 1}
                          className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-on-surface transition-all"
                          title="Sonraki Video"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Video Player Preview */}
                <div 
                  onClick={() => openVideo(currentVideo)}
                  className="aspect-video w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black relative group shadow-lg cursor-pointer"
                >
                  <img 
                    src={currentParsed.thumbnailUrl} 
                    alt={currentVideo.title} 
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center ring-4 ring-white/60 shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                    </div>
                  </div>
                  
                  {/* Floating Video Info Bar */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between text-white">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 uppercase">
                        <span>{currentVideo.subject}</span>
                        <span>• {currentVideo.day}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black truncate block">
                        {currentVideo.title}
                      </span>
                    </div>
                    <span className="text-xs font-black bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1 shadow-md">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Şimdi İzle</span>
                    </span>
                  </div>
                </div>

                {/* Primary Actions for the active video */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openVideo(currentVideo)}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-red-600/20 active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Tam Ekran Oynat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTask(currentVideo.id)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95",
                        currentVideo.completed
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                      )}
                    >
                      <Check className="w-4 h-4" />
                      <span>{currentVideo.completed ? 'İzlendi (Geri Al)' : 'İzlendi Olarak İşaretle'}</span>
                    </button>
                    {currentParsed.directUrl && (
                      <a
                        href={currentParsed.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>YouTube'da Aç</span>
                      </a>
                    )}
                  </div>

                  {displayVideos.length > 1 && (
                    <span className="text-xs font-bold text-on-surface-variant">
                      Seçili: {safeIndex + 1} / {displayVideos.length} Video
                    </span>
                  )}
                </div>

                {/* Playlist & Video Gallery: Shows ONLY that day's videos in Daily Mode, and weekly in Weekly Mode */}
                <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      <span>
                        {isDailyMode 
                          ? `${activeDay === todayName ? 'Bugünün' : activeDay + ' Günü'} Video Dersleri (${displayVideos.length} Video)`
                          : `Ders Videoları Listesi (${displayVideos.length} Video)`}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-on-surface-variant">
                      {isDailyMode 
                        ? 'Öğretmeninizin bugün için verdiği tüm videolar aşağıdadır. İstediğinize tıklayıp izleyebilirsiniz.' 
                        : 'Herhangi bir videoya tıklayarak doğrudan izleyebilirsiniz.'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {displayVideos.map((vid, idx) => {
                      const isSelected = vid.id === currentVideo.id;
                      const parsed = parseVideoUrl(vid.videoUrl, `${vid.subject || ''} ${vid.title || ''}`);
                      const isToday = vid.day === todayName;

                      return (
                        <div
                          key={vid.id}
                          onClick={() => {
                            setSelectedVideoIndex(idx);
                            openVideo(vid);
                          }}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-left group active:scale-98",
                            isSelected
                              ? "bg-primary/5 border-primary shadow-sm ring-2 ring-primary/20"
                              : "bg-surface-container-low border-outline-variant/15 hover:border-primary/50 hover:bg-surface-container-high"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Mini Thumbnail */}
                            <div className="w-24 h-16 rounded-xl overflow-hidden bg-black shrink-0 relative shadow-xs">
                              <img
                                src={parsed.thumbnailUrl}
                                alt={vid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                                onError={(e: any) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/35 group-hover:bg-black/15 transition-all">
                                <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center">
                                  <Play className="w-3.5 h-3.5 text-white fill-current translate-x-0.2" />
                                </div>
                              </div>
                            </div>

                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {isToday ? (
                                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                    Bugün
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase bg-surface-container-high text-on-surface-variant px-1.5 py-0.2 rounded">
                                    {vid.day}
                                  </span>
                                )}
                                <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-1.5 py-0.2 rounded truncate max-w-[85px]">
                                  {vid.subject || 'Ders'}
                                </span>
                              </div>
                              <p className="font-extrabold text-xs text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {vid.title}
                              </p>
                              {vid.amount && (
                                <span className="text-[10px] text-on-surface-variant/80 font-medium block mt-0.5">
                                  {vid.amount}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/10 text-[11px]">
                            <span className={cn(
                              "font-black flex items-center gap-1 text-[10px]",
                              vid.completed ? "text-emerald-700" : "text-on-surface-variant"
                            )}>
                              {vid.completed ? '✅ İzlendi' : '⭕ İzlenmedi'}
                            </span>
                            <span className="font-black text-red-600 group-hover:underline flex items-center gap-1">
                              <span>İzle</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Motivation Card - Yaş Grubuna ve Sınıf Seviyesine Özel Günlük Değişen Motivasyon */}
          {(() => {
            const dailyQuote = getDailyMotivationQuote(studentGrade);
            const badge = getAgeGroupBadge(studentGrade);
            const todayFormatted = new Date().toLocaleDateString('tr-TR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            });

            return (
              <div className="bg-gradient-to-br from-surface-container-low via-surface to-secondary-container/20 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group border border-outline-variant/15 shadow-sm">
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                      <span className="text-secondary font-black text-xs uppercase tracking-widest">
                        Günün Motivasyonu
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        • {todayFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {dailyQuote.theme && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                          #{dailyQuote.theme}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.color}`}>
                        {badge.label} ({badge.ageRange})
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <blockquote className="text-2xl sm:text-3xl font-black text-on-surface leading-snug font-manrope">
                      "{dailyQuote.quote}"
                    </blockquote>
                    <div className="mt-5 flex items-center justify-between">
                      <p className="text-sm font-black text-primary flex items-center gap-1.5">
                        <span className="inline-block w-4 h-0.5 bg-primary/40 rounded-full" />
                        {dailyQuote.author}
                      </p>
                      <span className="text-[11px] font-bold text-on-surface-variant/70 italic">
                        Her gün otomatik yenilenir
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <BookOpen className="w-64 h-64 text-secondary" />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column - Secondary Actions, Results & History */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Exam Entry (İşlevsel Deneme & Sınav Sonucu Gir) */}
          <div className="bg-surface-container-highest rounded-[2.5rem] p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black font-manrope text-on-surface">Deneme Sınavı Gir</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">Sonucunu gir, netin ve hata analizin anında oluşsun.</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>

            {examSaveToast && (
              <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{examSaveToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveTrial} className="space-y-4">
              {/* Deneme Adı */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1 block">
                  Deneme Adı / Yayın (İsteğe Bağlı)
                </label>
                <input 
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Örn: Özdebir TYT 1 veya Mart Denemesi"
                  className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-2xl text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary py-3 px-4 outline-none transition-all"
                />
              </div>

              {/* Ders Seçimi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1 block">
                  Sınav Türü / Ders
                </label>
                <select 
                  value={examSubject}
                  onChange={(e) => setExamSubject(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-2xl text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary py-3 px-4 outline-none transition-all"
                >
                  <option value="Genel Deneme">Genel Deneme Sınavı (Tüm Dersler / TYT-AYT-LGS)</option>
                  <option value="Matematik">Matematik Branş Denemesi</option>
                  <option value="Türkçe">Türkçe / Edebiyat Branş Denemesi</option>
                  <option value="Fen Bilimleri">Fen Bilimleri Branş Denemesi</option>
                  <option value="Fizik">Fizik</option>
                  <option value="Kimya">Kimya</option>
                  <option value="Biyoloji">Biyoloji</option>
                  <option value="Sosyal Bilgiler">Sosyal Bilgiler / Tarih</option>
                  <option value="Coğrafya">Coğrafya</option>
                  <option value="İngilizce">İngilizce (YDT)</option>
                </select>
              </div>

              {/* Doğru, Yanlış, Boş Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1 block">
                    Doğru (D)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="200"
                    required
                    value={examCorrect}
                    onChange={(e) => setExamCorrect(e.target.value)}
                    placeholder="0" 
                    className="w-full bg-surface-container-lowest border border-emerald-200 text-center rounded-2xl text-base font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 py-3 px-2 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest ml-1 block">
                    Yanlış (Y)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="200"
                    value={examIncorrect}
                    onChange={(e) => setExamIncorrect(e.target.value)}
                    placeholder="0" 
                    className="w-full bg-surface-container-lowest border border-rose-200 text-center rounded-2xl text-base font-black text-rose-800 focus:ring-2 focus:ring-rose-500 py-3 px-2 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1 block">
                    Boş (B)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max="200"
                    value={examEmpty}
                    onChange={(e) => setExamEmpty(e.target.value)}
                    placeholder="0" 
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 text-center rounded-2xl text-base font-black text-on-surface focus:ring-2 focus:ring-primary py-3 px-2 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Canlı Net Önizleme */}
              {Boolean(examCorrect || examIncorrect) && (
                <div className="p-3 bg-primary/10 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Hesaplanan Tahmini Net:</span>
                  <span className="text-base font-black text-primary">
                    {Math.max(0, (Number(examCorrect) || 0) - ((Number(examIncorrect) || 0) / (studentGrade.includes('8') ? 3 : 4))).toFixed(2)} Net
                  </span>
                </div>
              )}

              {/* Hatalı Konu Girişi (İsteğe Bağlı) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1 block">
                  Yanlış Yapılan Konu (İsteğe Bağlı)
                </label>
                <input 
                  type="text"
                  value={examWrongTopic}
                  onChange={(e) => setExamWrongTopic(e.target.value)}
                  placeholder="Örn: Türev, Noktalama İşaretleri, Optik"
                  className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-2xl text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary py-3 px-4 outline-none transition-all"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-5 h-5" />
                <span>Deneme Sonucunu Kaydet</span>
              </button>
            </form>
          </div>

          {/* Trial History (Deneme Geçmişi) */}
          {trialHistory.length > 0 && (
            <div className="bg-surface-container-lowest rounded-[2.5rem] p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-5 h-5 text-secondary" />
                  <h3 className="text-xl font-bold font-manrope text-on-surface">Deneme Geçmişi</h3>
                </div>
                <span className="text-xs font-black text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                  {trialHistory.length} Sınav
                </span>
              </div>

              <div className="space-y-3">
                {trialHistory.map((trial) => {
                  const subjectKey = Object.keys(trial.results)[0] || 'Genel Deneme';
                  const subjectData = trial.results[subjectKey];

                  return (
                    <div 
                      key={trial.id} 
                      className="p-5 bg-surface-container-low hover:bg-surface-container-high/60 rounded-3xl border border-outline-variant/10 transition-all text-left space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-outline-variant/10">
                              {trial.date}
                            </span>
                            <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                              {subjectKey}
                            </span>
                          </div>
                          {subjectData && (
                            <p className="text-xs font-semibold text-on-surface-variant">
                              {subjectData.correct} Doğru • {subjectData.incorrect} Yanlış
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Net</p>
                          <p className="text-xl font-black text-secondary leading-none">
                            {trial.totalNet.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedTrial(trial)}
                          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                        >
                          <span>Detayları Gör</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Bu deneme sonucunu silmek istediğinizden emin misiniz?')) {
                              deleteTrial(trial.id);
                            }
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                          title="Denemeyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Archived Programs */}
          {archivedPrograms.length > 0 && (
            <div className="bg-surface-container-lowest rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <History className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold font-manrope">Geçmiş Programlar</h3>
              </div>
              <div className="space-y-4">
                {archivedPrograms.map((archive) => (
                  <div key={archive.id} className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/5 group">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{archive.endDate}</p>
                        <h4 className="font-bold text-on-surface">Haftalık Program Arşivi</h4>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => restoreArchive(archive)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Geri Yükle"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteArchive(archive.id)}
                          className="p-2 text-outline hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-tertiary" 
                          style={{ width: `${archive.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-tertiary">%{archive.completionRate}</span>
                    </div>
                    <p className="text-[10px] font-bold text-on-surface-variant mt-2">
                      {archive.tasks.length} görevden {archive.tasks.filter(t => t.completed).length} tanesi tamamlandı.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trial Detail Modal */}
      <AnimatePresence>
        {selectedTrial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{selectedTrial.date} Tarihli Deneme</p>
                  <h3 className="text-2xl font-black text-on-surface">Hata Analizi</h3>
                </div>
                <button 
                  onClick={() => setSelectedTrial(null)}
                  className="p-3 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {Object.entries(selectedTrial.results).map(([subject, data]: [string, any]) => (
                  <div key={subject} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                        {subject}
                      </h4>
                      <div className="flex gap-4">
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{data.correct} Doğru</span>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">{data.incorrect} Yanlış</span>
                      </div>
                    </div>

                    {data.wrongTopics.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {data.wrongTopics.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                            <span className="text-sm font-bold text-on-surface">{item.topic}</span>
                            <span className="text-xs font-black text-secondary bg-secondary/10 px-3 py-1 rounded-lg">
                              {item.count} Hata
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-on-surface-variant italic ml-4">Bu derste yanlış yapılan konu işaretlenmemiş.</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-8 bg-surface-container-lowest border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Genel Başarı</p>
                    <p className="text-xl font-black text-on-surface">%{((selectedTrial.totalNet / 100) * 100).toFixed(1)} Başarı Oranı</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Toplam Net</p>
                  <p className="text-3xl font-black text-secondary">{selectedTrial.totalNet.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Archive className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-on-surface">Programı Bitir?</h3>
                <p className="text-on-surface-variant font-medium">
                  Bu haftaki programı bitirip arşive taşımak istediğinden emin misin? Bu işlem mevcut programını temizleyecektir.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest transition-all"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={finishProgram}
                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Evet, Bitir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal - Gelişmiş Video Oynatıcı & Canlı Firestore Senkronizasyon */}
      <AnimatePresence>
        {showVideoModal && activeVideoTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-surface-container-lowest flex flex-col"
            >
              {(() => {
                const parsed = parseVideoUrl(activeVideoTask.videoUrl, `${activeVideoTask.subject || ''} ${activeVideoTask.title || ''}`);

                return (
                  <>
                    <div className="p-4 sm:p-5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                          <Youtube className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-extrabold text-on-surface line-clamp-1">
                            {activeVideoTask.title || 'Ders Videosu'}
                          </h4>
                          <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                            <span className="text-primary font-black uppercase">{activeVideoTask.subject || 'Ders'}</span>
                            {activeVideoTask.day && <span>• {activeVideoTask.day}</span>}
                            {activeVideoTask.amount && <span>• Süre: {activeVideoTask.amount}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {parsed.directUrl && (
                          <a
                            href={parsed.directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>YouTube'da Aç</span>
                          </a>
                        )}
                        <button 
                          onClick={() => setShowVideoModal(false)}
                          className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
                          title="Kapat"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="aspect-video w-full bg-black">
                      <iframe 
                        src={parsed.embedUrl}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>

                    <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-on-surface-variant">
                        {activeVideoTask.completed ? '✅ Bu video izlendi olarak işaretlendi.' : 'Videoyu izledikten sonra tek tıkla tamamlandı olarak işaretleyebilirsiniz.'}
                      </span>
                      <div className="flex items-center gap-2">
                        {parsed.directUrl && (
                          <a
                            href={parsed.directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sm:hidden inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Yeni Sekmede Aç</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            toggleTask(activeVideoTask.id);
                            setActiveVideoTask(prev => prev ? { ...prev, completed: !prev.completed } : null);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 active:scale-95",
                            activeVideoTask.completed
                              ? "bg-tertiary/10 text-tertiary hover:bg-tertiary/20"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          <span>{activeVideoTask.completed ? 'İzlendi (Geri Al)' : 'Videoyu İzlendi Olarak İşaretle'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test / Soru Ödevi Sonuç Girişi Modalı */}
      <AnimatePresence>
        {showResultModal && evaluatingTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    evaluatingTask.type === 'test' ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/10 text-primary'
                  }`}>
                    {evaluatingTask.type === 'test' ? <ClipboardCheck className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {evaluatingTask.type === 'test' ? 'Test Sonuç Bildirimi' : 'Soru Çözüm Sonucu'}
                    </span>
                    <h3 className="text-xl font-black text-on-surface mt-1 leading-snug">
                      {evaluatingTask.title}
                    </h3>
                    <p className="text-xs font-semibold text-on-surface-variant">
                      {evaluatingTask.subject} {evaluatingTask.amount ? `• Hedef: ${evaluatingTask.amount}` : ''} • {evaluatingTask.day}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowResultModal(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Net Score Calculation Banner */}
              {(() => {
                const isMiddleSchool = studentGrade.includes('8') || studentGrade.includes('7') || studentGrade.includes('6') || studentGrade.includes('5');
                const penalty = isMiddleSchool ? 3 : 4;
                const net = Math.max(0, evalCorrect - (evalIncorrect / penalty));
                const totalQuestions = Number(evalCorrect) + Number(evalIncorrect) + Number(evalEmpty);
                const accuracy = totalQuestions > 0 ? Math.round((evalCorrect / (evalCorrect + evalIncorrect || 1)) * 100) : 0;

                return (
                  <div className="bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Hesaplanan Net
                      </span>
                      <div className="text-3xl font-black text-emerald-700 mt-0.5">
                        {net.toFixed(2)} <span className="text-sm font-bold text-emerald-600/80">Net</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                        {isMiddleSchool ? 'LGS kuralı: 3 yanlış 1 doğruyu götürür' : 'Lise / YKS kuralı: 4 yanlış 1 doğruyu götürür'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-on-surface">Toplam Soru: {totalQuestions}</div>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">Başarı: %{accuracy}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Doğru / Yanlış / Boş Giriş Alanları */}
              <div className="grid grid-cols-3 gap-3">
                {/* Doğru */}
                <div className="bg-emerald-50/70 border border-emerald-500/20 rounded-2xl p-3.5 text-center space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">Doğru</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setEvalCorrect(prev => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number" 
                      min="0"
                      value={evalCorrect}
                      onChange={(e) => setEvalCorrect(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center py-1.5 bg-white rounded-lg font-black text-lg text-emerald-800 outline-none border border-emerald-500/20 focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      type="button"
                      onClick={() => setEvalCorrect(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Yanlış */}
                <div className="bg-rose-50/70 border border-rose-500/20 rounded-2xl p-3.5 text-center space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">Yanlış</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setEvalIncorrect(prev => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-100 text-rose-800 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number" 
                      min="0"
                      value={evalIncorrect}
                      onChange={(e) => setEvalIncorrect(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center py-1.5 bg-white rounded-lg font-black text-lg text-rose-800 outline-none border border-rose-500/20 focus:ring-2 focus:ring-rose-500"
                    />
                    <button 
                      type="button"
                      onClick={() => setEvalIncorrect(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-100 text-rose-800 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Boş */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">Boş</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setEvalEmpty(prev => Math.max(0, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number" 
                      min="0"
                      value={evalEmpty}
                      onChange={(e) => setEvalEmpty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center py-1.5 bg-white rounded-lg font-black text-lg text-slate-700 outline-none border border-slate-300 focus:ring-2 focus:ring-slate-400"
                    />
                    <button 
                      type="button"
                      onClick={() => setEvalEmpty(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hızlı Yanlış Şablonları */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant">Hızlı Yanlış Ayarı:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEvalIncorrect(0)}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-all"
                  >
                    ⭐ 0 Yanlış (Full Doğru)
                  </button>
                  {[1, 2, 3, 4, 5].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setEvalIncorrect(cnt)}
                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-bold transition-all"
                    >
                      {cnt} Yanlış
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                <button 
                  onClick={saveTaskEvaluation}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Sonucu Kaydet ve Tamamla
                </button>

                {evaluatingTask.completed && (
                  <button 
                    onClick={resetTaskEvaluation}
                    type="button"
                    className="w-full py-3 bg-surface-container-high hover:bg-rose-50 hover:text-rose-700 text-on-surface-variant font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Görevi Tamamlanmadı Olarak İşaretle (Sıfırla)
                  </button>
                )}

                <button 
                  onClick={() => setShowResultModal(false)}
                  type="button"
                  className="w-full py-2.5 text-on-surface-variant/70 hover:text-on-surface text-xs font-semibold"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Günlük Ödev & Görev Hatırlatma Modalı */}
      <AnimatePresence>
        {showDailyReminderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleDismissReminder(false)}
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-on-surface">Günün Görevlerini İşaretle & Eksikleri Tamamla</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-on-surface-variant font-medium">
                        Bugün: <span className="font-bold text-primary">{currentTodayName}</span> • Ödevlerini tamamladıkça işaretle!
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300/40 shrink-0">
                        <Clock className="w-3 h-3 text-amber-700" /> 1 saat aralıklarla hatırlatılır
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissReminder(false)}
                  className="p-2 hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors shrink-0"
                  title="Kapat (1 saat sonra tekrar hatırlatır)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-300/30 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-amber-900">
                    {todayIncompleteTasks.length === 0 
                      ? "🎉 Tebrikler! Bugünün tüm ödevlerini tamamladın." 
                      : `Bugün henüz tamamlanmamış ${todayIncompleteTasks.length} adet ödevin bulunuyor.`}
                  </p>
                  {pastIncompleteTasks.length > 0 && (
                    <p className="text-[11px] font-semibold text-rose-700 mt-0.5">
                      ⚠️ Ayrıca önceki günlerden {pastIncompleteTasks.length} adet eksik ödevin kaldı.
                    </p>
                  )}
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white shadow-xs text-amber-700 whitespace-nowrap">
                  %{progressPercent} Tamamlandı
                </span>
              </div>

              {/* Today's Tasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    Bugünün Görevleri ({currentTodayName})
                  </h4>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    {tasks.filter(t => t.day === currentTodayName).length} Ödev
                  </span>
                </div>

                {tasks.filter(t => t.day === currentTodayName).length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-6 bg-surface-container-low rounded-2xl">
                    Bugün için planlanmış herhangi bir ödev bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {tasks.filter(t => t.day === currentTodayName).map((task) => (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          task.completed 
                            ? 'bg-emerald-50/50 border-emerald-300/40 text-emerald-950' 
                            : 'bg-white border-outline-variant/15 text-on-surface shadow-xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                              task.completed ? 'bg-emerald-200/60 text-emerald-800' : 'bg-primary/10 text-primary'
                            }`}>
                              {task.subject}
                            </span>
                            {task.amount && (
                              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                                {task.amount}
                              </span>
                            )}
                            {task.completed && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                {task.correct !== undefined ? (
                                  <span>{task.correct} Doğru • {task.incorrect || 0} Yanlış • {task.empty || 0} Boş {task.net !== undefined ? `• ${task.net} Net` : ''}</span>
                                ) : (
                                  <span>Tamamlandı</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className={`text-xs font-bold ${task.completed ? 'line-through text-emerald-900/60' : 'text-on-surface'}`}>
                            {task.title || task.topic}
                          </p>
                        </div>

                        {/* Action Buttons for this task */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleTaskCompletionQuick(task)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              task.completed 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs' 
                                : 'bg-surface-container-high hover:bg-emerald-50 hover:text-emerald-700 text-on-surface'
                            }`}
                            title={task.completed ? "Görevi tamamlanmadı yap" : "Görevi hızlı tamamla"}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{task.completed ? "Tamamlandı" : (task.type === 'book' ? "Okudum" : "Hızlı İşaretle")}</span>
                          </button>

                          {(task.type === 'question' || task.type === 'test') && (
                            <button
                              type="button"
                              onClick={() => {
                                handleDismissReminder(false);
                                setEvaluatingTask(task);
                                setEvalCorrect(task.correct || (task.amount ? parseInt(task.amount, 10) || 20 : 20));
                                setEvalIncorrect(task.incorrect || 0);
                                setEvalEmpty(task.empty || 0);
                                setShowResultModal(true);
                              }}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              title="Doğru, yanlış ve boş sayılarını gir"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>Doğru/Yanlış Gir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Incomplete Tasks List */}
              {pastIncompleteTasks.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-outline-variant/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Geçmiş Günlerden Eksik Kalan Ödevler ({pastIncompleteTasks.length})
                    </h4>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
                      Telafi Gerekli
                    </span>
                  </div>

                  <div className="space-y-2">
                    {pastIncompleteTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/50 text-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase">
                              {task.day}
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {task.subject}
                            </span>
                            {task.amount && (
                              <span className="text-[10px] font-bold text-on-surface-variant bg-white px-2 py-0.5 rounded-md">
                                {task.amount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-rose-950">
                            {task.title || task.topic}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleTaskCompletionQuick(task)}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-on-surface border border-outline-variant/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Tamamla</span>
                          </button>
                          {(task.type === 'question' || task.type === 'test') && (
                            <button
                              type="button"
                              onClick={() => {
                                handleDismissReminder(false);
                                setEvaluatingTask(task);
                                setEvalCorrect(task.correct || (task.amount ? parseInt(task.amount, 10) || 20 : 20));
                                setEvalIncorrect(task.incorrect || 0);
                                setEvalEmpty(task.empty || 0);
                                setShowResultModal(true);
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>Sonuç Gir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => handleDismissReminder(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-on-surface-variant hover:text-on-surface text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-colors"
                >
                  Bugünlük Tekrar Hatırlatma (Kapat)
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      handleDismissReminder(false);
                      setViewMode('today');
                      setSelectedDayFilter('today');
                      scrollToTasks();
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Programda Göster</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Öğrenci Yapay Zeka Başarı ve Hata Analiz Modalı */}
      <AnimatePresence>
        {showAiAnalysisModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-on-surface">Yapay Zeka Başarı & Hata Analiz Raporu</h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      {studentName} ({studentGrade || 'Seviye Belirtilmemiş'}) • Deneme ve haftalık doğru/yanlış verileri
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {studentAiAnalysis && (
                    <button
                      type="button"
                      onClick={() => exportAiAnalysisToPdf(studentAiAnalysis, studentName, studentGrade)}
                      className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Analizi PDF formatında indir veya yazdır"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF İndir</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={runStudentAiAnalysis}
                    disabled={loadingStudentAi}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Analizi yeniden oluştur"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", loadingStudentAi && "animate-spin")} />
                    <span>Yenile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiAnalysisModal(false)}
                    className="p-2 hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loadingStudentAi && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm font-bold text-on-surface">Yapay Zeka Çalışma Verilerini İnceliyor...</p>
                  <p className="text-xs text-on-surface-variant">Denemeler, haftalık doğru-yanlışlar ve konu hataları analiz ediliyor.</p>
                </div>
              )}

              {/* Error State */}
              {!loadingStudentAi && studentAiError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2">
                  <p className="font-bold">{studentAiError}</p>
                  <button
                    type="button"
                    onClick={runStudentAiAnalysis}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {/* Analysis Content */}
              {!loadingStudentAi && studentAiAnalysis && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent border border-primary/20 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Genel Değerlendirme
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-on-surface leading-relaxed italic">
                      "{studentAiAnalysis.summary}"
                    </p>
                  </div>

                  {/* Weekly Performance Stats: Verilen Soru, Çözülen Soru, Doğru, Yanlış, Boş, Doğruluk %, Son Deneme */}
                  {studentAiAnalysis.weeklyPerformanceStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      <div className="p-3 bg-primary/10 rounded-xl text-center space-y-0.5 border border-primary/20">
                        <p className="text-[10px] font-bold text-primary uppercase">Verilen Soru</p>
                        <p className="text-lg font-black text-on-surface">
                          {studentAiAnalysis.weeklyPerformanceStats.assignedQuestions || weeklyQuestionStats.assignedQuestions}
                        </p>
                        <p className="text-[9px] font-bold text-primary/80">Hedef</p>
                      </div>
                      <div className="p-3 bg-surface-container-low rounded-xl text-center space-y-0.5 border border-outline-variant/10">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Çözülen Soru</p>
                        <p className="text-lg font-black text-on-surface">
                          {studentAiAnalysis.weeklyPerformanceStats.solvedQuestions || weeklyQuestionStats.solvedQuestions}
                        </p>
                        <p className="text-[9px] font-bold text-tertiary">
                          %{studentAiAnalysis.weeklyPerformanceStats.questionCompletionRate || weeklyQuestionStats.progressPercent} Başarı
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50/70 rounded-xl text-center space-y-0.5 border border-emerald-200/50">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase">Doğru</p>
                        <p className="text-lg font-black text-emerald-700">{studentAiAnalysis.weeklyPerformanceStats.totalCorrect || 0}</p>
                      </div>
                      <div className="p-3 bg-rose-50/70 rounded-xl text-center space-y-0.5 border border-rose-200/50">
                        <p className="text-[10px] font-bold text-rose-800 uppercase">Yanlış</p>
                        <p className="text-lg font-black text-rose-700">{studentAiAnalysis.weeklyPerformanceStats.totalIncorrect || 0}</p>
                      </div>
                      <div className="p-3 bg-amber-50/70 rounded-xl text-center space-y-0.5 border border-amber-200/50">
                        <p className="text-[10px] font-bold text-amber-800 uppercase">Boş</p>
                        <p className="text-lg font-black text-amber-700">{studentAiAnalysis.weeklyPerformanceStats.totalEmpty || 0}</p>
                      </div>
                      <div className="p-3 bg-indigo-50/70 rounded-xl text-center space-y-0.5 border border-indigo-200/50">
                        <p className="text-[10px] font-bold text-indigo-800 uppercase">Doğruluk</p>
                        <p className="text-lg font-black text-indigo-700">%{studentAiAnalysis.weeklyPerformanceStats.successRate || 0}</p>
                      </div>
                      <div className="p-3 bg-secondary/10 rounded-xl text-center space-y-0.5 border border-secondary/20 col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-bold text-secondary uppercase">Son Deneme</p>
                        <p className="text-lg font-black text-secondary">{studentAiAnalysis.weeklyPerformanceStats.latestTrialNet || 0} Net</p>
                      </div>
                    </div>
                  )}

                  {/* Separate Deneme Sınavları & Haftalık Program Highlight Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deneme Sınavları Ayrı Analiz Kartı */}
                    <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-secondary flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-secondary" />
                          Deneme Sınavı Analizi
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                          {studentAiAnalysis.trialAnalysis?.trendLabel || 'Net Takibi'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {studentAiAnalysis.trialAnalysis?.summary || `Son deneme neti ${studentAiAnalysis.weeklyPerformanceStats?.latestTrialNet || 0} olarak kaydedildi.`}
                      </p>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-secondary/10">
                        <span className="text-on-surface-variant font-medium">Hedef Net:</span>
                        <span className="font-black text-secondary">
                          {studentAiAnalysis.trialAnalysis?.targetNet || (Number(studentAiAnalysis.weeklyPerformanceStats?.latestTrialNet || 80) + 3).toFixed(1)} Net
                        </span>
                      </div>
                    </div>

                    {/* Haftalık Program Ayrı Analiz Kartı */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                          Haftalık Program Analizi
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          %{studentAiAnalysis.weeklyPerformanceStats?.successRate || 0} Doğruluk
                        </span>
                      </div>
                      <p className="text-xs text-indigo-950/80 leading-relaxed font-medium">
                        {studentAiAnalysis.weeklyProgramAnalysis?.summary || `Haftalık ödev tamamlama oranı %${studentAiAnalysis.weeklyPerformanceStats?.completionRate || 0} olarak hesaplandı.`}
                      </p>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-100">
                        <span className="text-on-surface-variant font-medium">Çözülen Soru:</span>
                        <span className="font-black text-indigo-700">
                          {studentAiAnalysis.weeklyPerformanceStats?.totalCorrect || 0} Doğru / {studentAiAnalysis.weeklyPerformanceStats?.totalIncorrect || 0} Yanlış
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* %80 Başarı Eşiğinin Altındaki Kritik Konular Callout */}
                  {studentAiAnalysis.under80Topics && studentAiAnalysis.under80Topics.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <h4 className="font-black text-xs uppercase tracking-wider text-rose-950">
                            %80 Başarı Eşiğinin Altındaki Kritik Konular (&lt;%80)
                          </h4>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-full">
                          {studentAiAnalysis.under80Topics.length} Konu
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {studentAiAnalysis.under80Topics.map((topicItem: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-rose-100 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-bold text-xs text-on-surface">
                                {topicItem.subject} - {topicItem.topic}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                %{topicItem.accuracy} Başarı ({topicItem.correct}D / {topicItem.incorrect}Y)
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">
                              {topicItem.diagnosis}
                            </p>
                            <p className="text-[11px] text-primary font-semibold">
                              💡 Tavsiye: {topicItem.recommendation}
                            </p>
                            {topicItem.video && (
                              <a
                                href={topicItem.video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[10px] text-primary font-bold hover:underline pt-1"
                              >
                                <PlayCircle className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{topicItem.video.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Analysis Callout */}
                  {studentAiAnalysis.errorAnalysis && !studentAiAnalysis.under80Topics?.length && (
                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/60 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-950">Yanlış Yapılan Konuların Analizi</h4>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed font-medium">
                        {studentAiAnalysis.errorAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Weekly Plan Recommendations */}
                  {studentAiAnalysis.weeklyPlanRecommendations && studentAiAnalysis.weeklyPlanRecommendations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-primary" />
                        Senin İçin Önerilen Çalışma Hedefleri
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {studentAiAnalysis.weeklyPlanRecommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-1.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              rec.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {rec.subject}
                            </span>
                            <p className="text-xs font-bold text-on-surface">{rec.topic}</p>
                            <p className="text-xs font-semibold text-primary">{rec.suggestedAmount}</p>
                            <p className="text-[10px] text-on-surface-variant font-medium">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject Analysis Grid */}
                  {studentAiAnalysis.subjects && studentAiAnalysis.subjects.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Ders Bazlı Yetkinlik & Önerilen Ders Videoları
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {studentAiAnalysis.subjects.map((sub: any, idx: number) => (
                          <div key={idx} className="p-4 bg-white rounded-2xl border border-outline-variant/10 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm text-on-surface">{sub.name}</span>
                              <span className="text-xs font-black text-primary">%{sub.accuracy}</span>
                            </div>
                            <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  sub.status === 'danger' ? 'bg-rose-500' : sub.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${sub.accuracy}%` }}
                              />
                            </div>
                            {sub.deficiencies && sub.deficiencies.length > 0 && (
                              <div className="space-y-2 pt-1">
                                {sub.deficiencies.map((def: any, dIdx: number) => (
                                  <div key={dIdx} className="space-y-1">
                                    <p className="text-[11px] font-bold text-on-surface">{def.topic}</p>
                                    {def.recommendations?.map((rec: any, rIdx: number) => (
                                      <a
                                        key={rIdx}
                                        href={rec.youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-[10px] text-primary font-bold hover:underline"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{rec.title}</span>
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDF İndir & Paylaşım Çubuğu */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-surface-container-high rounded-2xl border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-black text-on-surface flex items-center justify-center sm:justify-start gap-1.5">
                        <Download className="w-4 h-4 text-primary" />
                        Pedagojik Gelişim Raporunu PDF Olarak İndir
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-medium">
                        Haftalık soru verileri, deneme netleri ve tespit edilen eksik konuları içeren resmi A4 raporu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportAiAnalysisToPdf(studentAiAnalysis, studentName, studentGrade)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white text-xs font-bold rounded-xl shadow-md hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF Raporunu İndir / Yazdır</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
