import React, { useState, useEffect } from 'react';
import { subscribeStudents, updateStudentTeacherId, deleteStudentFromFirestore } from '../lib/firestoreService';
import { 
  Users, 
  Search, 
  Calendar, 
  TrendingUp, 
  Plus, 
  ChevronRight, 
  BookOpen, 
  PlayCircle, 
  CheckCircle2, 
  X,
  Target,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  History,
  Archive,
  Timer,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from 'recharts';

interface Student {
  id: string;
  name: string;
  grade: string;
  lastTrialScore: number;
  avatar: string;
}

interface Task {
  id: string;
  type: 'video' | 'question' | 'reading';
  title: string;
  subject: string;
  amount?: string;
  videoUrl?: string;
  day: string;
  completed: boolean;
}

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SUBJECTS_HS = ['Matematik', 'Türkçe', 'Fizik', 'Kimya', 'Biyoloji'];
const SUBJECTS_8 = ['Matematik', 'Türkçe', 'Fen ve Teknoloji', 'İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export function MyStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [activeTab, setActiveTab] = useState<'program' | 'analytics'>('program');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  const calculateCountdownDays = (examType: 'LGS' | 'YKS') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let examYear = now.getFullYear();
    let examMonth = 5; // June is 5 (0-indexed)
    let examDay = examType === 'LGS' ? 6 : 19; // June 6 (LGS 2027) or June 19 (YKS 2027)
    
    let examDate = new Date(examYear, examMonth, examDay);
    if (today > examDate) {
      examDate = new Date(examYear + 1, examMonth, examDay);
    }
    
    const diffTime = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const lgsDays = calculateCountdownDays('LGS');
  const yksDays = calculateCountdownDays('YKS');
  
  const uniqueClasses = Array.from(new Set(students.map(s => s.grade)));
  
  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.grade === selectedClass);

  const showLgsCounter = selectedClass === 'all'
    ? filteredStudents.some(s => s.grade.includes('8') || s.grade.toLowerCase().includes('lgs'))
    : (selectedClass.includes('8') || selectedClass.toLowerCase().includes('lgs'));

  const showYksCounter = selectedClass === 'all'
    ? filteredStudents.some(s => s.grade.includes('12') || s.grade.includes('11') || s.grade.toLowerCase().includes('yks') || s.grade.toLowerCase().includes('mezun'))
    : (selectedClass.includes('12') || selectedClass.includes('11') || selectedClass.toLowerCase().includes('yks') || selectedClass.toLowerCase().includes('mezun'));

  const currentSubjects = selectedStudent?.grade.includes('8') ? SUBJECTS_8 : SUBJECTS_HS;

  // Program modal states
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [newTask, setNewTask] = useState({
    type: 'video' as 'video' | 'question' | 'reading',
    subject: '',
    title: '',
    amount: '',
    videoUrl: ''
  });

  useEffect(() => {
    if (selectedStudent) {
      setNewTask(prev => ({ ...prev, subject: currentSubjects[0] }));
    }
  }, [selectedStudent]);

  // Analytics data (mocked for the selected student)
  const [studentTrials, setStudentTrials] = useState<any[]>([]);
  const [studentErrors, setStudentErrors] = useState<any[]>([]);
  const [studentTasks, setStudentTasks] = useState<Task[]>([]);
  const [archivedPrograms, setArchivedPrograms] = useState<any[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);

  // AI Analysis States
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Claim & Delete Modal States
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [deletingStudentTarget, setDeletingStudentTarget] = useState<Student | null>(null);
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
  const [allDirectoryStudents, setAllDirectoryStudents] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const unsub = subscribeStudents((allList) => {
      setAllDirectoryStudents(allList);
      const teacherId = localStorage.getItem('currentUserId') || '1';
      const myStudents = allList.filter((s: any) => s.teacherId === teacherId);
      setStudents(myStudents);
    });

    return () => unsub();
  }, []);

  const claimStudent = async (studentId: string) => {
    const teacherId = localStorage.getItem('currentUserId') || '1';
    await updateStudentTeacherId(studentId, teacherId);
    showToast('Öğrenci başarıyla danışmanlığınıza eklendi!');
    setShowClaimModal(false);
  };

  const handleUnassignStudent = async (studentId: string) => {
    await updateStudentTeacherId(studentId, '');
    showToast('Öğrenci danışmanlığınızdan çıkarıldı.');
    setShowDeleteStudentModal(false);
    setDeletingStudentTarget(null);
  };

  const handlePermanentlyDeleteStudent = async (studentId: string) => {
    await deleteStudentFromFirestore(studentId);
    showToast('Öğrenci sistemden tamamen silindi.');
    setShowDeleteStudentModal(false);
    setDeletingStudentTarget(null);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setView('details');
    
    // Load real data for this student if exists, else mock
    const savedTrials = localStorage.getItem(`trial_results_${student.id}`);
    const savedErrors = localStorage.getItem(`topic_errors_${student.id}`);
    const savedTasks = localStorage.getItem(`tasks_${student.id}`);

    if (savedTrials) setStudentTrials(JSON.parse(savedTrials));
    else if (['1', '2', '3'].includes(student.id)) setStudentTrials([
      { date: '01.04', score: 65, avg: 60 }, 
      { date: '08.04', score: 72, avg: 62 },
      { date: '15.04', score: 75, avg: 65 },
      { date: '22.04', score: 82, avg: 68 },
      { date: '29.04', score: 85.5, avg: 70 }
    ]);
    else setStudentTrials([]);

    if (savedErrors) setStudentErrors(JSON.parse(savedErrors));
    else if (['1', '2', '3'].includes(student.id)) setStudentErrors([
      { topic: 'Türev', count: 5 },
      { topic: 'İntegral', count: 3 },
      { topic: 'Trigonometri', count: 4 },
      { topic: 'Polinomlar', count: 2 },
      { topic: 'Limit', count: 1 }
    ]);
    else setStudentErrors([]);

    if (savedTasks) setStudentTasks(JSON.parse(savedTasks));
    else setStudentTasks([]);

    const savedArchives = localStorage.getItem(`archived_programs_${student.id}`);
    if (savedArchives) setArchivedPrograms(JSON.parse(savedArchives));
    else setArchivedPrograms([]);

    // Subject performance
    const savedDetailedTrials = localStorage.getItem(`trial_results_detailed_${student.id}`);
    if (savedDetailedTrials) {
      const detailedTrials = JSON.parse(savedDetailedTrials);
      const subjectTotals: { [key: string]: { correct: number, count: number } } = {};
      
      detailedTrials.forEach((trial: any) => {
        Object.entries(trial.results).forEach(([subject, data]: [string, any]) => {
          if (!subjectTotals[subject]) subjectTotals[subject] = { correct: 0, count: 0 };
          subjectTotals[subject].correct += data.correct;
          subjectTotals[subject].count += 1;
        });
      });

      const performance = Object.entries(subjectTotals).map(([subject, data]) => ({
        subject,
        A: Math.round((data.correct / (data.count * 20)) * 100), // Assuming 20 questions per subject avg
        fullMark: 100
      }));
      setSubjectPerformance(performance);
    } else if (['1', '2', '3'].includes(student.id)) {
      setSubjectPerformance([
        { subject: 'Matematik', A: 85, fullMark: 100 },
        { subject: 'Türkçe', A: 92, fullMark: 100 },
        { subject: 'Fizik', A: 78, fullMark: 100 },
        { subject: 'Kimya', A: 88, fullMark: 100 },
        { subject: 'Biyoloji', A: 80, fullMark: 100 },
      ]);
    } else {
      setSubjectPerformance([]);
    }

    // Weekly activity
    if (['1', '2', '3'].includes(student.id)) {
      setWeeklyActivity([
        { day: 'Pzt', tasks: 4 },
        { day: 'Sal', tasks: 6 },
        { day: 'Çar', tasks: 3 },
        { day: 'Per', tasks: 8 },
        { day: 'Cum', tasks: 5 },
        { day: 'Cmt', tasks: 2 },
        { day: 'Paz', tasks: 0 },
      ]);
    } else {
      // Calculate from real tasks if possible
      const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
      const activity = days.map(day => {
        const dayTasks = (JSON.parse(savedTasks || '[]')).filter((t: any) => {
          const dayName = DAYS.find(d => d.startsWith(day));
          return t.day === dayName;
        });
        return { day, tasks: dayTasks.length };
      });
      setWeeklyActivity(activity);
    }

    // Load AI Analysis for selected student
    const savedAiAnalysis = localStorage.getItem(`ai_analysis_${student.id}`);
    if (savedAiAnalysis) {
      setAiAnalysis(JSON.parse(savedAiAnalysis));
    } else {
      setAiAnalysis(null);
    }
  };

  const runAiAnalysis = async () => {
    if (!selectedStudent) return;

    setLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const savedTasks = JSON.parse(localStorage.getItem(`tasks_${selectedStudent.id}`) || '[]');
      const savedTrials = JSON.parse(localStorage.getItem(`trial_results_${selectedStudent.id}`) || '[]');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          grade: selectedStudent.grade,
          tasks: savedTasks,
          trialResults: savedTrials
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Yapay Zeka analizi başarısız oldu.');
      }

      const data = await response.json();
      setAiAnalysis(data);
      localStorage.setItem(`ai_analysis_${selectedStudent.id}`, JSON.stringify(data));
      
      // Update last trial score or trigger re-render if necessary
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Analiz sırasında beklenmedik bir hata oluştu.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const addTask = () => {
    if (!newTask.title) return;
    
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTask,
      day: selectedDay,
      completed: false
    };

    const updatedTasks = [...studentTasks, task];
    setStudentTasks(updatedTasks);
    localStorage.setItem(`tasks_${selectedStudent?.id}`, JSON.stringify(updatedTasks));
    
    setNewTask({ type: 'video', subject: currentSubjects[0], title: '', amount: '', videoUrl: '' });
    setShowProgramModal(false);
  };

  const getStudentTasksByDay = (day: string) => {
    return studentTasks.filter((t: Task) => t.day === day);
  };

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingNote, setMeetingNote] = useState('');

  const addMeeting = () => {
    if (!meetingNote || !selectedStudent) return;
    
    const teacherId = localStorage.getItem('currentUserId') || '1';
    const meeting = {
      id: Math.random().toString(36).substr(2, 9),
      teacherId,
      studentId: selectedStudent.id,
      date: new Date().toISOString(),
      notes: meetingNote
    };

    const savedMeetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    localStorage.setItem('meetings', JSON.stringify([...savedMeetings, meeting]));
    
    setMeetingNote('');
    setShowMeetingModal(false);
    
    // Optional: show success toast
  };

  return (
    <div className="space-y-8 pb-12">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Öğrencilerim</h3>
                <p className="text-on-surface-variant font-medium font-sans">Sorumlu olduğunuz öğrencileri ve gelişimlerini takip edin.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setShowClaimModal(true)}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-primary px-6 py-3.5 rounded-full font-bold flex items-center gap-2 border border-outline-variant/10 shadow-sm transition-all"
                >
                  <Users className="w-5 h-5" />
                  Sistemden Öğrenci Ata
                </button>
                <button 
                  onClick={() => window.location.href = '/students/new'}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Öğrenci
                </button>
              </div>
            </div>

            {/* Sınıf Filtreleri */}
            {uniqueClasses.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                <button
                  onClick={() => setSelectedClass('all')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedClass === 'all'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Tüm Sınıflar ({students.length})
                </button>
                {uniqueClasses.map((cls) => {
                  const count = students.filter(s => s.grade === cls).length;
                  return (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                        selectedClass === cls
                          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {cls} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sınav Geri Sayım Sayaçları Banner */}
            {(showLgsCounter || showYksCounter) && (
              <div className={`grid gap-6 bg-gradient-to-r from-primary/5 to-secondary/5 border border-outline-variant/10 p-6 rounded-[2.5rem] shadow-sm ${showLgsCounter && showYksCounter ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {showLgsCounter && (
                  <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] border border-outline-variant/5">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <Timer className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">LGS Sınav Sayacı</p>
                      <p className="text-2xl font-black text-primary mt-0.5">{lgsDays} Gün Kaldı</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Hedef: LGS Hazırlık Sınavı</p>
                    </div>
                  </div>
                )}
                {showYksCounter && (
                  <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] border border-outline-variant/5">
                    <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shadow-sm">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">YKS Sınav Sayacı</p>
                      <p className="text-2xl font-black text-secondary mt-0.5">{yksDays} Gün Kaldı</p>
                      <p className="text-[10px] text-on-surface-variant font-medium">Hedef: Yükseköğretim Kurumları Sınavı</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {filteredStudents.length === 0 ? (
              <div className="bg-surface-container-lowest p-12 rounded-[2.5rem] border border-outline-variant/10 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-sm">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-bold text-on-surface">Henüz Sorumlu Olduğunuz Öğrenci Yok</h4>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                  Sistemde kayıtlı öğrencileri kendi danışmanlığınıza ekleyebilir veya yeni bir öğrenci kaydı oluşturabilirsiniz.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <button 
                    onClick={() => setShowClaimModal(true)}
                    className="bg-primary text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Sistemdeki Öğrencilerden Kendine Ata
                  </button>
                  <button 
                    onClick={() => window.location.href = '/students/new'}
                    className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-6 py-3.5 rounded-full font-bold transition-all border border-outline-variant/10"
                  >
                    Yeni Öğrenci Ekle
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className="bg-surface-container-lowest p-6 rounded-[2.5rem] border border-outline-variant/10 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all text-left group cursor-pointer relative"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl overflow-hidden ring-4 ring-primary/5">
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-on-surface group-hover:text-primary transition-colors">{student.name}</h4>
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{student.grade}</p>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingStudentTarget(student);
                          setShowDeleteStudentModal(true);
                        }}
                        title="Öğrenciyi Danışmanlıktan Çıkar / Sil"
                        className="p-2.5 rounded-2xl bg-surface-container-high hover:bg-red-50 text-outline hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Son Net</p>
                        <p className="text-xl font-black text-primary">{student.lastTrialScore || '-'}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs font-bold text-primary">
                      <span>Detayları ve Programı Gör</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                  Listeye Dön
                </button>

                {selectedStudent && (
                  <button 
                    onClick={() => {
                      setDeletingStudentTarget(selectedStudent);
                      setShowDeleteStudentModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Öğrenciyi Sil
                  </button>
                )}
              </div>

              <div className="flex bg-surface-container-high p-1 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('program')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'program' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
                >
                  Program Hazırla
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
                >
                  Gelişim Analizi
                </button>
              </div>
            </div>

            {/* Student Profile Summary */}
            <div className="bg-surface-container-lowest p-8 rounded-[3rem] border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="h-24 w-24 rounded-[2rem] overflow-hidden ring-4 ring-primary/10">
                <img src={selectedStudent?.avatar} alt={selectedStudent?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="text-center md:text-left flex-grow">
                <h3 className="text-3xl font-black text-on-surface">{selectedStudent?.name}</h3>
                <p className="text-on-surface-variant font-bold">{selectedStudent?.grade} Öğrencisi</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowMeetingModal(true)}
                  className="bg-tertiary text-white px-6 py-4 rounded-3xl font-bold shadow-lg shadow-tertiary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Görüşme Notu Ekle
                </button>
                <div className="bg-surface-container-low px-6 py-4 rounded-3xl text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Son Net</p>
                  <p className="text-2xl font-black text-primary">{selectedStudent?.lastTrialScore}</p>
                </div>
                <div className="bg-surface-container-low px-6 py-4 rounded-3xl text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Hedef</p>
                  <p className="text-2xl font-black text-secondary">100+</p>
                </div>
              </div>
            </div>

            {activeTab === 'program' ? (
              <div className="space-y-6">
                <div className="bg-surface-container-low p-6 rounded-[2rem] flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">Toplam Ödev</p>
                      <p className="text-2xl font-black text-on-surface">{studentTasks.length}</p>
                    </div>
                    <div className="h-10 w-px bg-outline-variant/30" />
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">Tamamlanan</p>
                      <p className="text-2xl font-black text-tertiary">{studentTasks.filter(t => t.completed).length}</p>
                    </div>
                  </div>
                  <div className="flex-grow max-w-xs mx-8">
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-tertiary transition-all duration-500" 
                        style={{ width: `${(studentTasks.filter(t => t.completed).length / (studentTasks.length || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {DAYS.map((day) => (
                  <div key={day} className="space-y-4">
                    <div className="text-center py-2 bg-surface-container-high rounded-xl">
                      <span className="text-xs font-black text-on-surface uppercase">{day}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {getStudentTasksByDay(day).map((task: Task) => (
                        <div key={task.id} className={`p-3 rounded-2xl border shadow-sm space-y-2 transition-all ${task.completed ? 'bg-tertiary/5 border-tertiary/20' : 'bg-white border-outline-variant/10'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                              task.type === 'video' ? 'bg-blue-100 text-blue-600' : 
                              task.type === 'question' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {task.type.toUpperCase()}
                            </span>
                            {task.completed && <CheckCircle2 className="w-3 h-3 text-tertiary" />}
                          </div>
                          <p className={`text-[10px] font-bold leading-tight ${task.completed ? 'text-on-surface/50 line-through' : 'text-on-surface'}`}>{task.title}</p>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => { setSelectedDay(day); setShowProgramModal(true); }}
                        className="w-full py-3 border-2 border-dashed border-outline-variant/30 rounded-2xl flex items-center justify-center text-outline hover:border-primary hover:text-primary transition-all group"
                      >
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Archived Programs for Teacher */}
              {archivedPrograms.length > 0 && (
                <div className="mt-12 space-y-6">
                  <div className="flex items-center gap-3">
                    <History className="w-6 h-6 text-primary" />
                    <h4 className="text-xl font-bold text-on-surface">Önceki Programlar</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedPrograms.map((archive) => (
                      <div key={archive.id} className="p-6 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{archive.endDate}</p>
                            <h5 className="font-bold text-on-surface">Haftalık Program</h5>
                          </div>
                          <span className="text-xs font-black text-tertiary bg-tertiary/10 px-2 py-1 rounded-lg">
                            %{archive.completionRate}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="h-full bg-tertiary" style={{ width: `${archive.completionRate}%` }} />
                          </div>
                          <p className="text-[10px] font-medium text-on-surface-variant">
                            {archive.tasks.length} görevden {archive.tasks.filter((t: any) => t.completed).length} tanesi tamamlandı.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ortalama Net</p>
                    <p className="text-2xl font-black text-primary">{(studentTrials.reduce((acc, curr) => acc + curr.score, 0) / (studentTrials.length || 1)).toFixed(1)}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-tertiary">
                      <TrendingUp className="w-3 h-3" />
                      +4.2 geçen aya göre
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ödev Tamamlama</p>
                    <p className="text-2xl font-black text-secondary">
                      %{studentTasks.length > 0 ? Math.round((studentTasks.filter(t => t.completed).length / studentTasks.length) * 100) : 0}
                    </p>
                    <p className="text-[10px] font-medium text-on-surface-variant mt-2">Son 30 gün verisi</p>
                  </div>
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Zayıf Ders</p>
                    <p className="text-2xl font-black text-secondary-container">Fizik</p>
                    <p className="text-[10px] font-medium text-on-surface-variant mt-2">Gelişim gerekiyor</p>
                  </div>
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Sıralama</p>
                    <p className="text-2xl font-black text-tertiary">12/145</p>
                    <p className="text-[10px] font-medium text-on-surface-variant mt-2">Kurum geneli</p>
                  </div>
                </div>

                {/* Yapay Zeka Destekli Gelişim Analizi */}
                <div className="mt-8 bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border border-primary/20 p-8 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-on-surface flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        Yapay Zeka Eğitim Danışmanı Analizi
                      </h4>
                      <p className="text-sm text-on-surface-variant font-medium">
                        Öğrencinin tamamladığı ödevler, doğru/yanlış oranları ve deneme sonuçlarına göre kişiselleştirilmiş eksik analizi ve video önerileri.
                      </p>
                    </div>
                    <button
                      onClick={runAiAnalysis}
                      disabled={loadingAnalysis}
                      className={`px-8 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-container hover:to-purple-700 text-white font-black rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 ${
                        loadingAnalysis ? 'opacity-50 cursor-not-allowed animate-pulse' : ''
                      }`}
                    >
                      {loadingAnalysis ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analiz Ediliyor...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analizi Güncelle
                        </>
                      )}
                    </button>
                  </div>

                  {analysisError && (
                    <div className="p-4 bg-secondary/10 border border-secondary/20 text-secondary rounded-2xl text-sm font-bold flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5" />
                      {analysisError}
                    </div>
                  )}

                  {loadingAnalysis && (
                    <div className="py-16 text-center space-y-4">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <Sparkles className="w-10 h-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-on-surface font-black text-lg">Yapay Zeka Verilerini İnceliyor...</p>
                        <p className="text-xs text-on-surface-variant font-medium">Bu işlem yaklaşık 10-15 saniye sürebilir.</p>
                      </div>
                    </div>
                  )}

                  {!loadingAnalysis && aiAnalysis && (
                    <div className="space-y-8 relative z-10 animate-fade-in">
                      {/* Summary Banner */}
                      <div className="p-6 bg-white/80 backdrop-blur-md rounded-3xl border border-outline-variant/10 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          Genel Değerlendirme Raporu
                        </p>
                        <p className="text-on-surface font-semibold text-base leading-relaxed italic">
                          "{aiAnalysis.summary}"
                        </p>
                      </div>

                      {/* Subject Analysis Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aiAnalysis.subjects?.map((sub: any, i: number) => {
                          const isDanger = sub.status === 'danger';
                          const isWarning = sub.status === 'warning';
                          
                          return (
                            <div key={i} className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                    isDanger ? 'bg-secondary/10 text-secondary' :
                                    isWarning ? 'bg-orange-100 text-orange-700' :
                                    'bg-tertiary/10 text-tertiary'
                                  }`}>
                                    {isDanger ? 'Geliştirilmeli' : isWarning ? 'Dikkat Edilmeli' : 'Başarılı'}
                                  </span>
                                  <h5 className="font-extrabold text-xl text-on-surface">{sub.name}</h5>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Tahmini Başarı</p>
                                  <p className="text-2xl font-black text-primary">%{sub.accuracy}</p>
                                </div>
                              </div>

                              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isDanger ? 'bg-secondary' : isWarning ? 'bg-orange-500' : 'bg-tertiary'
                                  }`}
                                  style={{ width: `${sub.accuracy}%` }}
                                />
                              </div>

                              {/* Deficiencies */}
                              <div className="space-y-3 pt-2">
                                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Konu Eksikleri & Çözüm Önerileri</p>
                                {sub.deficiencies && sub.deficiencies.length > 0 ? (
                                  sub.deficiencies.map((def: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-sm text-on-surface">{def.topic}</span>
                                        <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                                          Önem Derecesi: {def.errorCount}
                                        </span>
                                      </div>
                                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                                        {def.description}
                                      </p>
                                      
                                      {/* Recommendations */}
                                      {def.recommendations && def.recommendations.length > 0 && (
                                        <div className="pt-2 border-t border-outline-variant/10 space-y-2">
                                          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">Önerilen Kaynaklar & Ders Videoları</p>
                                          <div className="space-y-1.5">
                                            {def.recommendations.map((rec: any, rIdx: number) => (
                                              <a
                                                key={rIdx}
                                                href={rec.youtubeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-2.5 bg-white hover:bg-primary/5 rounded-xl border border-outline-variant/5 text-xs text-primary font-bold hover:underline transition-all group"
                                              >
                                                <span className="flex items-center gap-2 truncate pr-4">
                                                  <PlayCircle className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                                                  <span className="truncate">{rec.title}</span>
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] text-on-surface-variant group-hover:text-primary transition-colors">
                                                  İzle
                                                  <ExternalLink className="w-3 h-3" />
                                                </span>
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-tertiary font-bold">Harika! Bu branşta herhangi bir konu eksiği tespit edilmedi.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!loadingAnalysis && !aiAnalysis && (
                    <div className="py-12 text-center space-y-4 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-outline-variant/30">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <div className="space-y-2 max-w-sm mx-auto">
                        <p className="text-on-surface font-bold text-lg">Yapay Zeka Analizini Başlat</p>
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                          Henüz bu öğrenci için yapay zeka analiz raporu oluşturulmamış. Verilerini analiz ederek ders bazlı gelişim önerileri çıkarmak için yukarıdaki butona tıklayabilirsiniz.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Progress Chart */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Net Gelişim Grafiği
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-[10px] font-bold text-on-surface-variant">Öğrenci</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-outline-variant" />
                          <span className="text-[10px] font-bold text-on-surface-variant">Ortalama</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-64 w-full flex items-center justify-center">
                      {studentTrials.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={studentTrials}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                            <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center space-y-2">
                          <TrendingUp className="w-12 h-12 text-outline-variant mx-auto opacity-20" />
                          <p className="text-on-surface-variant font-bold">Henüz deneme verisi yok</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subject Performance Radar */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                    <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <Target className="w-5 h-5 text-secondary" />
                      Ders Bazlı Yetkinlik
                    </h4>
                    <div className="h-64 w-full flex items-center justify-center">
                      {subjectPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectPerformance}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Öğrenci" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center space-y-2">
                          <Target className="w-12 h-12 text-outline-variant mx-auto opacity-20" />
                          <p className="text-on-surface-variant font-bold">Analiz için yeterli veri yok</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Topic Mastery */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6 lg:col-span-2">
                    <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-tertiary" />
                      Konu Bazlı Başarı Oranı
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentSubjects.map((subject) => (
                        <div key={subject} className="p-4 bg-surface-container-low rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-on-surface">{subject}</span>
                            <span className="text-xs font-black text-primary">%{Math.round(Math.random() * 40 + 60)}</span>
                          </div>
                          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.random() * 40 + 60}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                  {/* Error Analysis */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                    <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-secondary" />
                      Hatalı Konu Dağılımı
                    </h4>
                    <div className="h-64 w-full flex items-center justify-center">
                      {studentErrors.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentErrors} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="topic" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} width={100} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                              {studentErrors.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center space-y-2">
                          <AlertTriangle className="w-12 h-12 text-outline-variant mx-auto opacity-20" />
                          <p className="text-on-surface-variant font-bold">Hata kaydı bulunamadı</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Development Suggestions */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                    <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-tertiary" />
                      Gelişim Önerileri
                    </h4>
                    <div className="space-y-4">
                      {studentErrors.length > 0 ? (
                        studentErrors.slice(0, 3).map((error, idx) => (
                          <div key={idx} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-2xl">
                            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                              <Target className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{error.topic} Konusuna Odaklan</p>
                              <p className="text-xs text-on-surface-variant font-medium mt-1">
                                Bu konuda son denemelerde {error.count} hata yapıldı. Konu anlatım videosu ve 50 soru çözümü önerilir.
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm font-bold text-on-surface-variant">Henüz analiz için yeterli veri yok.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weekly Activity */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                    <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-tertiary" />
                      Haftalık Çalışma Yoğunluğu
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyActivity}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="tasks" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Trial History Table */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-on-surface">Son Deneme Sonuçları</h4>
                    <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      Tümünü Gör <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-outline-variant/10">
                          <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tarih</th>
                          <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Sınav Adı</th>
                          <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Net</th>
                          <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Doğru/Yanlış</th>
                          <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {[
                          { date: '29.04.2024', name: 'TYT Genel Deneme-5', score: 85.5, dy: '92D 18Y', status: 'up' },
                          { date: '22.04.2024', name: 'ÖZDEBİR Türkiye Geneli', score: 82.0, dy: '88D 22Y', status: 'up' },
                          { date: '15.04.2024', name: 'TYT Genel Deneme-4', score: 75.0, dy: '82D 28Y', status: 'down' },
                          { date: '08.04.2024', name: 'Kurum İçi Deneme-12', score: 72.0, dy: '78D 32Y', status: 'up' },
                        ].map((trial, i) => (
                          <tr key={i} className="group hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-4 text-sm font-medium text-on-surface-variant">{trial.date}</td>
                            <td className="py-4 text-sm font-bold text-on-surface">{trial.name}</td>
                            <td className="py-4 text-sm font-black text-primary">{trial.score}</td>
                            <td className="py-4 text-xs font-bold text-on-surface-variant">{trial.dy}</td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                                trial.status === 'up' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'
                              }`}>
                                {trial.status === 'up' ? '↑ Yükseliş' : '↓ Düşüş'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Program Modal */}
      <AnimatePresence>
        {showProgramModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-2xl font-black text-on-surface">{selectedDay} Programı</h4>
                  <button onClick={() => setShowProgramModal(false)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(['video', 'question', 'reading'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewTask({ ...newTask, type })}
                        className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                          newTask.type === type ? 'bg-primary text-white border-primary shadow-lg' : 'bg-surface-container-low border-transparent text-on-surface-variant'
                        }`}
                      >
                        {type === 'video' ? 'Video' : type === 'question' ? 'Soru' : 'Okuma'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ders</label>
                    <select 
                      value={newTask.subject}
                      onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                      className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    >
                      {currentSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Görev Başlığı / Konu</label>
                    <input 
                      type="text" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Örn: Logaritma Giriş"
                      className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {newTask.type === 'question' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Soru Sayısı</label>
                      <input 
                        type="text" 
                        value={newTask.amount}
                        onChange={(e) => setNewTask({ ...newTask, amount: e.target.value })}
                        placeholder="Örn: 50 Soru"
                        className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  {newTask.type === 'video' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">YouTube Linki</label>
                      <input 
                        type="text" 
                        value={newTask.videoUrl}
                        onChange={(e) => setNewTask({ ...newTask, videoUrl: e.target.value })}
                        placeholder="https://youtube.com/..."
                        className="w-full px-5 py-4 bg-surface-container-low border-none rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  <button 
                    onClick={addTask}
                    className="w-full py-5 bg-primary text-white font-black rounded-full shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus className="w-6 h-6" />
                    Görev Ekle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Claim Student Modal */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-2xl p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6 max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                <div>
                  <h4 className="text-2xl font-bold text-on-surface">Sistemdeki Öğrencilerden Ata</h4>
                  <p className="text-xs text-on-surface-variant">Sistemde kayıtlı öğrencileri danışmanlığınıza ekleyin.</p>
                </div>
                <button 
                  onClick={() => setShowClaimModal(false)}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-2 max-h-[50vh]">
                {allDirectoryStudents.length > 0 ? (
                  allDirectoryStudents.map((s) => {
                    const isAlreadyMine = students.some(my => my.id === s.id);
                    return (
                      <div key={s.id} className="p-4 bg-surface-container-high rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={s.avatar || s.image || 'https://picsum.photos/seed/s1/100/100'} alt={s.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-bold text-sm text-on-surface">{s.name}</p>
                            <p className="text-xs text-on-surface-variant">{s.grade || '12. Sınıf'} • K: <span className="font-mono">{s.username}</span></p>
                          </div>
                        </div>

                        {isAlreadyMine ? (
                          <span className="px-4 py-2 bg-tertiary/10 text-tertiary rounded-xl text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Listenizde
                          </span>
                        ) : (
                          <button 
                            onClick={() => claimStudent(s.id)}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Danışmanlığa Ekle
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-8 text-xs text-on-surface-variant font-bold">Sistemde hiç kayıtlı öğrenci bulunamadı.</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowClaimModal(false)}
                  className="px-8 py-3 bg-surface-container-high text-on-surface font-bold rounded-2xl hover:bg-surface-container-highest transition-colors text-sm"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete / Unassign Student Modal */}
      <AnimatePresence>
        {showDeleteStudentModal && deletingStudentTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-on-surface">Öğrenci İşlemi</h4>
                <p className="text-sm text-on-surface-variant">
                  <strong className="text-on-surface">{deletingStudentTarget.name}</strong> öğrencisi için yapmak istediğiniz işlemi seçin:
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => handleUnassignStudent(deletingStudentTarget.id)}
                  className="w-full py-3.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-2xl transition-all border border-primary/20 text-sm"
                >
                  Sadece Danışmanlığımdan Çıkar
                </button>
                <button 
                  onClick={() => handlePermanentlyDeleteStudent(deletingStudentTarget.id)}
                  className="w-full py-3.5 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all text-sm"
                >
                  Sistemden Tamamen Sil
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteStudentModal(false);
                    setDeletingStudentTarget(null);
                  }}
                  className="w-full py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-highest transition-colors text-xs"
                >
                  Vazgeç
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50 text-sm"
          >
            <CheckCircle2 className="w-6 h-6" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
