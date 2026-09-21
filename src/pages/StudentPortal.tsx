import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, BookOpen, CheckSquare, AlertTriangle, Save, Calendar, ShieldCheck, CheckCircle2, Youtube, Archive, Trash2, History, X, RotateCcw, Timer, ClipboardCheck, ArrowRight, Sparkles, Target, Award, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getExamCountdownForGrade, GradeExamCountdown } from '../lib/curriculum';

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

  const scrollToTasks = () => {
    tasksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = () => {
    const id = localStorage.getItem('currentUserId');
    if (id) {
      setStudentId(id);
      
      // Sınıfa özel sınav sayacı hesaplama (örn. 10. sınıfa Maarif Modeli sınavı, 8. sınıfa LGS)
      const savedStudents = localStorage.getItem('students');
      if (savedStudents) {
        const students = JSON.parse(savedStudents);
        const currentStudent = students.find((s: any) => s.id === id);
        if (currentStudent) {
          setStudentGrade(currentStudent.grade || '');
          setCountdown(getExamCountdownForGrade(currentStudent.grade || ''));
        }
      }

      const savedTasks = localStorage.getItem(`tasks_${id}`);
      if (savedTasks) {
        const allTasks = JSON.parse(savedTasks);
        setTasks(allTasks);
        
        // Filter for today
        const dayIndex = new Date().getDay(); // 0 is Sunday
        const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
        setTodayTasks(allTasks.filter((t: Task) => t.day === todayName));
      } else {
        setTasks([]);
        setTodayTasks([]);
      }

      const savedArchives = localStorage.getItem(`archived_programs_${id}`);
      if (savedArchives) {
        setArchivedPrograms(JSON.parse(savedArchives));
      }

      const savedTrials = localStorage.getItem(`trial_results_detailed_${id}`);
      if (savedTrials) {
        setTrialHistory(JSON.parse(savedTrials));
      }
    }
  };

  useEffect(() => {
    const name = localStorage.getItem('currentUserName');
    if (name) setStudentName(name);
    loadData();

    // Listen for storage changes (e.g. from teacher panel in another tab)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, correct: undefined, incorrect: undefined, empty: undefined, net: undefined } : t
    );
    setTasks(updatedTasks);
    localStorage.setItem(`tasks_${studentId}`, JSON.stringify(updatedTasks));
    
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

  const saveTaskEvaluation = () => {
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
    localStorage.setItem(`tasks_${studentId}`, JSON.stringify(updatedTasks));

    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));

    setShowResultModal(false);
    setEvaluatingTask(null);
  };

  const resetTaskEvaluation = () => {
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
    localStorage.setItem(`tasks_${studentId}`, JSON.stringify(updatedTasks));

    const dayIndex = new Date().getDay();
    const todayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];
    setTodayTasks(updatedTasks.filter((t: Task) => t.day === todayName));

    setShowResultModal(false);
    setEvaluatingTask(null);
  };

  const finishProgram = () => {
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
    localStorage.setItem(`archived_programs_${studentId}`, JSON.stringify(updatedArchives));

    // Clear current tasks
    setTasks([]);
    setTodayTasks([]);
    localStorage.removeItem(`tasks_${studentId}`);
    setShowFinishConfirm(false);
  };

  const deleteArchive = (id: string) => {
    const updated = archivedPrograms.filter(a => a.id !== id);
    setArchivedPrograms(updated);
    localStorage.setItem(`archived_programs_${studentId}`, JSON.stringify(updated));
  };

  const restoreArchive = (archive: ArchivedProgram) => {
    // If there are current tasks, we might want to ask or just merge
    // For "accidental" archive, we replace current tasks
    setTasks(archive.tasks);
    localStorage.setItem(`tasks_${studentId}`, JSON.stringify(archive.tasks));
    
    // Remove from archive
    const updatedArchives = archivedPrograms.filter(a => a.id !== archive.id);
    setArchivedPrograms(updatedArchives);
    localStorage.setItem(`archived_programs_${studentId}`, JSON.stringify(updatedArchives));

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
    <div className="space-y-12 pb-20">
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
          <div className="bg-surface-container-low rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex flex-col">
                <span className="text-primary font-black text-[10px] uppercase tracking-widest mb-1">Ders & Görev Takibi</span>
                <h3 className="text-3xl font-extrabold font-manrope text-on-surface">
                  Ödev Akışı
                </h3>
                <div className="flex gap-4 mt-3">
                  <button 
                    onClick={() => setViewMode('today')}
                    className={`text-[11px] font-bold uppercase tracking-wider pb-1 transition-colors border-b-2 ${viewMode === 'today' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}
                  >
                    Günlük Program
                  </button>
                  <button 
                    onClick={() => setViewMode('weekly')}
                    className={`text-[11px] font-bold uppercase tracking-wider pb-1 transition-colors border-b-2 ${viewMode === 'weekly' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}
                  >
                    Haftalık Tablo
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-center">
                {tasks.length > 0 && (
                  <button 
                    onClick={() => setShowFinishConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <Archive className="w-4 h-4" />
                    Programı Bitir
                  </button>
                )}
                <span className="text-primary font-bold text-xs bg-white border border-outline-variant/10 px-4 py-2 rounded-xl shadow-sm">
                  Bugün: {DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
                </span>
              </div>
            </div>

            {viewMode === 'today' ? (
              /* Günlük Akış Görünümü */
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {todayTasks.length > 0 ? todayTasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task)}
                    className="flex items-center p-5 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5 group hover:scale-[1.01] transition-all cursor-pointer relative"
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0",
                      task.completed ? "bg-tertiary border-tertiary" : "border-outline group-hover:border-primary"
                    )}>
                      {task.completed && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          "font-bold text-sm transition-all",
                          task.completed ? "text-on-surface/50 line-through" : "text-on-surface"
                        )}>
                          {task.title}
                        </p>
                        {task.completed && (task.type === 'question' || task.type === 'test') && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            🎯 {task.correct ?? 0} D • {task.incorrect ?? 0} Y {task.empty ? `• ${task.empty} B` : ''} {task.net !== undefined ? `(${task.net} Net)` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mt-0.5 flex items-center gap-2">
                        <span>{task.subject}</span>
                        <span>•</span>
                        <span>
                          {task.type === 'video' ? 'Video' : 
                           task.type === 'test' ? `Test • ${task.amount || 'Çözüm'}` :
                           task.type === 'question' ? `${task.amount || 'Soru'}` : 
                           task.type === 'book' ? `Kitap Okuma • ${task.amount || 'Okuma'}` : 
                           'Okuma'}
                        </span>
                        {(task.type === 'question' || task.type === 'test') && !task.completed && (
                          <span className="text-primary font-black lowercase text-[10px] bg-primary/10 px-2 py-0.5 rounded-full">
                            Tıkla ve D/Y gir
                          </span>
                        )}
                      </p>
                    </div>
                    {task.type === 'video' && task.videoUrl && (
                      <Youtube className="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                )) : (
                  <div className="text-center py-12 bg-surface-container-lowest rounded-3xl border border-outline-variant/5">
                    <CheckCircle2 className="w-12 h-12 text-tertiary/20 mx-auto mb-4" />
                    <p className="text-sm font-bold text-on-surface-variant">
                      Bugün için atanmış bir görev yok.
                    </p>
                    <p className="text-xs text-on-surface-variant/70 mt-1">Haftalık tablodan tüm günlerin programını inceleyebilirsin.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Haftalık Tablo Görünümü */
              <div className="space-y-4">
                {tasks.length > 0 ? (
                  <div className="overflow-x-auto rounded-3xl border border-outline-variant/10 shadow-sm bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-surface-container-high/40 text-on-surface-variant font-black text-[10px] uppercase tracking-widest border-b border-outline-variant/10">
                          <th className="px-6 py-4">Gün</th>
                          <th className="px-6 py-4">Ders</th>
                          <th className="px-6 py-4">Görev / Ödev Detayı</th>
                          <th className="px-6 py-4">Tip / Miktar</th>
                          <th className="px-6 py-4 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {[...tasks]
                          .sort((a, b) => DAYS_TR.indexOf(a.day) - DAYS_TR.indexOf(b.day))
                          .map((task) => (
                            <tr 
                              key={task.id} 
                              onClick={() => handleTaskClick(task)}
                              className={cn(
                                "hover:bg-primary/[0.03] transition-colors cursor-pointer",
                                task.completed ? "bg-tertiary/[0.02]" : ""
                              )}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={cn(
                                  "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                                  task.day === DAYS_TR[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-surface-container-high text-on-surface-variant"
                                )}>
                                  {task.day}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-bold text-sm text-on-surface">{task.subject}</td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className={cn(
                                    "font-semibold text-sm max-w-xs truncate",
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
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={cn(
                                  "text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase inline-flex items-center gap-1",
                                  task.type === 'video' ? "bg-red-50 text-red-600" : 
                                  task.type === 'test' ? "bg-indigo-50 text-indigo-700" :
                                  task.type === 'question' ? "bg-secondary/10 text-secondary" : 
                                  task.type === 'book' ? "bg-emerald-50 text-emerald-700" :
                                  "bg-tertiary/10 text-tertiary"
                                )}>
                                  {task.type === 'test' && <ClipboardCheck className="w-3 h-3" />}
                                  {task.type === 'book' && <BookOpen className="w-3 h-3" />}
                                  {task.type === 'question' && <Target className="w-3 h-3" />}
                                  {task.type === 'video' ? 'Konu Videosu' : 
                                   task.type === 'test' ? `Test: ${task.amount || 'Ödev'}` :
                                   task.type === 'question' ? `${task.amount || 'Soru'}` : 
                                   task.type === 'book' ? `Kitap: ${task.amount || 'Okuma'}` :
                                   'Konu Okuma'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                    task.completed ? "bg-tertiary border-tertiary text-white" : "border-outline hover:border-primary"
                                  )}>
                                    {task.completed && <CheckSquare className="w-3.5 h-3.5" />}
                                  </div>
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-surface-container-lowest rounded-3xl border border-outline-variant/5">
                    <CheckCircle2 className="w-12 h-12 text-tertiary/20 mx-auto mb-4" />
                    <p className="text-sm font-bold text-on-surface-variant">
                      Henüz atanmış bir haftalık program bulunmuyor.
                    </p>
                  </div>
                )}
              </div>
            )}
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

          {/* Motivation Card */}
          <div className="bg-gradient-to-r from-secondary-container/20 to-secondary/10 rounded-[2.5rem] p-10 relative overflow-hidden group border border-secondary/10">
            <div className="relative z-10">
              <span className="text-secondary font-bold text-xs uppercase tracking-widest block mb-4">Günün Motivasyonu</span>
              <blockquote className="text-3xl font-bold text-on-surface leading-tight font-manrope">
                "Başarı, her gün tekrarlanan küçük çabaların toplamıdır."
              </blockquote>
              <p className="mt-6 text-sm font-bold text-on-surface-variant">— Robert Collier</p>
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <BookOpen className="w-64 h-64 text-secondary" />
            </div>
          </div>
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
