import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Download, BookOpen, CheckSquare, AlertTriangle, Save, Calendar, 
  ShieldCheck, CheckCircle2, Youtube, Archive, Trash2, History, X, RotateCcw, 
  Timer, ClipboardCheck, ArrowRight, Sparkles, Target, Award, Minus, Plus, Quote,
  RefreshCw, Cloud, Smartphone, LayoutGrid, ListFilter, Check, Share2, Copy, Users, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getExamCountdownForGrade, GradeExamCountdown } from '../lib/curriculum';
import { getDailyMotivationQuote, getAgeGroupBadge, MotivationQuote } from '../lib/motivationQuotes';
import { 
  saveStudentTasks, 
  getStudentTasks, 
  subscribeStudentTasks, 
  saveStudentArchivedPrograms,
  getStudentById,
  subscribeStudents
} from '../lib/firestoreService';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  const [viewMode, setViewMode] = useState<'today' | 'weekly' | 'all'>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [displayLayout, setDisplayLayout] = useState<'cards' | 'table'>('cards');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<GradeExamCountdown | null>(null);
  const [evaluatingTask, setEvaluatingTask] = useState<Task | null>(null);
  const [evalCorrect, setEvalCorrect] = useState<number>(0);
  const [evalIncorrect, setEvalIncorrect] = useState<number>(0);
  const [evalEmpty, setEvalEmpty] = useState<number>(0);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const tasksRef = useRef<HTMLDivElement>(null);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showStudentMenu, setShowStudentMenu] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

  const handleTaskClick = (task: Task) => {
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

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                  <p className="text-[10px] font-bold text-on-surface-variant px-3 py-1 uppercase">Öğrenci Seçin</p>
                  {allStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => switchStudent(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        s.id === studentId ? 'bg-primary text-white' : 'hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-[10px] opacity-75">{s.grade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
            <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 sm:mb-10 font-medium">
              Bugün yapman gereken {todayTasks.length} görev var. {tasks.length > todayTasks.length && `Haftalık programında toplam ${tasks.length} görev bulunuyor.`} Haftalık programının %{progressPercent} kısmını tamamladın!
            </p>
            <button 
              onClick={() => {
                setViewMode('today');
                scrollToTasks();
              }}
              className="bg-white text-primary font-bold px-6 sm:px-10 py-3.5 sm:py-4 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg text-sm sm:text-base"
            >
              Öğrenmeye Devam Et
            </button>
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
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-[2.5rem] p-10 flex flex-col items-center justify-between shadow-ambient border border-outline-variant/10">
          <h3 className="text-on-surface text-xl font-bold mb-8 w-full">İlerleme Özeti</h3>
          <div className="flex flex-col gap-10 w-full">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-surface-container-high" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                  <circle className="text-tertiary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.3" strokeDashoffset={251.3 - (251.3 * progressPercent) / 100} strokeLinecap="round" strokeWidth="8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-on-surface">{progressPercent}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Haftalık İlerleme</p>
                <p className="text-xs text-on-surface-variant font-medium">Programındaki görevlerin tamamlanma oranı.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-surface-container-high" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                  <circle className="text-primary" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.3" strokeDashoffset="140" strokeLinecap="round" strokeWidth="8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-on-surface">45%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Genel Hedef</p>
                <p className="text-xs text-on-surface-variant font-medium">Dönem sonu başarısı için iyi bir tempo.</p>
              </div>
            </div>
          </div>
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-primary font-black text-[10px] uppercase tracking-widest">Ders & Görev Takibi</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Canlı Senkronize
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-manrope text-on-surface">
                  Ödev Akışı
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

            {/* Quick Stats on Mobile & Desktop */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5 p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 text-center">
              <div className="p-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Toplam</p>
                <p className="text-sm sm:text-lg font-extrabold text-on-surface">{tasks.length} Ödev</p>
              </div>
              <div className="p-1 border-x border-outline-variant/10">
                <p className="text-[10px] font-bold text-tertiary uppercase">Tamamlanan</p>
                <p className="text-sm sm:text-lg font-extrabold text-tertiary">{completedCount}</p>
              </div>
              <div className="p-1">
                <p className="text-[10px] font-bold text-primary uppercase">Kalan</p>
                <p className="text-sm sm:text-lg font-extrabold text-primary">{tasks.length - completedCount}</p>
              </div>
            </div>

            {/* Day Filter Chips (Horizontal Touch Scroll on Phone) */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full sm:w-auto scroll-smooth no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('all')}
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
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('today')}
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
                      onClick={() => setSelectedDayFilter(day)}
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

              {/* Layout Switcher (Cards vs Table) */}
              <div className="hidden sm:flex items-center gap-1 bg-surface-container-highest/50 p-1 rounded-xl self-end">
                <button
                  type="button"
                  onClick={() => setDisplayLayout('cards')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                    displayLayout === 'cards' ? "bg-white text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kartlar
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
                  Tablo
                </button>
              </div>
            </div>

            {/* Tasks Rendering */}
            {(() => {
              const currentFilteredTasks = (() => {
                if (selectedDayFilter === 'all') {
                  return [...tasks].sort((a, b) => DAYS_TR.indexOf(a.day) - DAYS_TR.indexOf(b.day));
                }
                if (selectedDayFilter === 'today') {
                  const dayIndex = new Date().getDay();
                  const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
                  return tasks.filter(t => t.day === todayName);
                }
                return tasks.filter(t => t.day === selectedDayFilter);
              })();

              if (currentFilteredTasks.length === 0) {
                // Empty state logic
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
                        onClick={() => setSelectedDayFilter('all')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                      >
                        <BookOpen className="w-4 h-4" />
                        Tüm Haftalık Ödevlerimi Gör ({tasks.length})
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
                        onClick={() => setSelectedDayFilter('all')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-all"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Tüm Haftayı Göster ({tasks.length})
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

              // When tasks exist:
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
                            <td className="px-5 py-3.5 whitespace-nowrap font-bold text-xs sm:text-sm text-on-surface">{task.subject}</td>
                            <td className="px-5 py-3.5">
                              <div className="space-y-1">
                                <p className={cn(
                                  "font-semibold text-xs sm:text-sm max-w-xs",
                                  task.completed ? "text-on-surface/60 line-through" : "text-on-surface"
                                )}>
                                  {task.title}
                                </p>
                                {task.completed && (task.type === 'question' || task.type === 'test') && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black">
                                    <span>🎯 {task.correct ?? 0} D • {task.incorrect ?? 0} Y</span>
                                    {task.net !== undefined && <span className="text-primary font-black">• {task.net} Net</span>}
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Card Layout (Optimized for Mobile Phone & Touch Screen)
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
                            {task.subject}
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
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100/90 text-emerald-800 rounded-lg text-[10px] font-black">
                            <span>🎯 {task.correct ?? 0} D • {task.incorrect ?? 0} Y {task.empty ? `• ${task.empty} B` : ''}</span>
                            {task.net !== undefined && <span className="text-primary font-black">• {task.net} Net</span>}
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
                      {task.type === 'video' && task.videoUrl && (
                        <div className="shrink-0 self-center">
                          <Youtube className="w-6 h-6 text-red-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Video Lesson Card */}
          {todayTasks.find(t => t.type === 'video') && (
            <div className="bg-surface-container-lowest rounded-[2.5rem] overflow-hidden shadow-ambient border border-outline-variant/10">
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-tertiary font-bold text-xs uppercase tracking-widest bg-tertiary/10 px-4 py-1.5 rounded-full">Bugünün Videosu</span>
                    <h2 className="text-3xl font-bold mt-4 font-manrope">{todayTasks.find(t => t.type === 'video')?.title}</h2>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
                
                <div 
                  onClick={() => {
                    const videoUrl = todayTasks.find(t => t.type === 'video')?.videoUrl;
                    if (videoUrl) {
                      setActiveVideo(getYoutubeId(videoUrl));
                      setShowVideoModal(true);
                    }
                  }}
                  className="aspect-video w-full rounded-3xl overflow-hidden bg-black relative group shadow-lg cursor-pointer"
                >
                  <img 
                    src={`https://img.youtube.com/vi/${getYoutubeId(todayTasks.find(t => t.type === 'video')?.videoUrl || '')}/maxresdefault.jpg`} 
                    alt="Lesson" 
                    className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-all">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/50 shadow-2xl">
                      <Play className="w-8 h-8 text-white fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          {/* Exam Entry */}
          <div className="bg-surface-container-highest rounded-[2.5rem] p-10 border border-outline-variant/10">
            <h3 className="text-2xl font-bold mb-6 font-manrope">Sınav Sonucu Gir</h3>
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-2 block">Ders</label>
                  <select className="w-full bg-surface-container-lowest border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 py-4 px-4 outline-none">
                    <option>Matematik</option>
                    <option>Türkçe</option>
                    <option>Fizik</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-2 block">Net Doğru</label>
                  <input 
                    type="number" 
                    placeholder="00" 
                    className="w-full bg-surface-container-lowest border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 py-4 px-4 outline-none"
                  />
                </div>
              </div>
              <button className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                Sonucu Kaydet
              </button>
            </form>
          </div>

          {/* Trial History */}
          {trialHistory.length > 0 && (
            <div className="bg-surface-container-lowest rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <ClipboardCheck className="w-6 h-6 text-secondary" />
                <h3 className="text-2xl font-bold font-manrope">Deneme Geçmişi</h3>
              </div>
              <div className="space-y-4">
                {trialHistory.map((trial) => (
                  <button 
                    key={trial.id} 
                    onClick={() => setSelectedTrial(trial)}
                    className="w-full p-6 bg-surface-container-low rounded-3xl border border-outline-variant/5 hover:border-secondary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{trial.date}</p>
                        <h4 className="font-bold text-on-surface text-sm sm:text-base">Genel Deneme Sınavı</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Toplam Net</p>
                        <p className="text-xl sm:text-2xl font-black text-secondary">{trial.totalNet.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase">
                      <span>Detayları Gör</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
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

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setShowVideoModal(false)}
                className="absolute top-6 right-6 z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
              >
                <AlertTriangle className="w-6 h-6 rotate-45" />
              </button>
              <iframe 
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
