import React, { useState, useEffect } from 'react';
import { 
  Calendar, PlayCircle, BookOpen, CheckCircle2, Clock, Plus, User, Send, 
  Trash2, ClipboardCheck, Award, Repeat, Sparkles, Users, Check, Share2, Copy 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  saveStudentTasks, 
  getStudentTasks, 
  subscribeStudentTasks, 
  subscribeStudents, 
  getStudentById,
  saveGlobalAcademicTasks, 
  getGlobalAcademicTasks 
} from '../lib/firestoreService';

interface Task {
  id: string;
  type: 'video' | 'question' | 'test' | 'reading' | 'book';
  title: string;
  amount?: string; // e.g., "50 soru", "20 dakika"
  videoUrl?: string; // YouTube URL
  completed: boolean;
  day: string;
  correct?: number;
  incorrect?: number;
  topic?: string;
}

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export function AssignmentFlow() {
  const userRole = localStorage.getItem('userRole') || 'student';
  const initialDay = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedDays, setSelectedDays] = useState<string[]>([initialDay]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Real-time Firestore Sync & Student Selection States
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [assignedStudentId, setAssignedStudentId] = useState<string>('all');
  const [currentStudentName, setCurrentStudentName] = useState<string>('');
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Teacher state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'video' | 'question' | 'test' | 'reading' | 'book'>('question');
  const [newTaskAmount, setNewTaskAmount] = useState('');
  const [newTaskVideoUrl, setNewTaskVideoUrl] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Student Task Result Entry states
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [modalCorrect, setModalCorrect] = useState<number>(0);
  const [modalIncorrect, setModalIncorrect] = useState<number>(0);
  const [modalTopic, setModalTopic] = useState<string>('');

  // 1. Subscribe to students collection if teacher or admin
  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'admin') {
      const unsub = subscribeStudents((list) => {
        setAllStudents(list);
      });
      return () => unsub();
    }
  }, [userRole]);

  // 2. Real-time onSnapshot listener from Firebase Firestore
  useEffect(() => {
    if (userRole === 'student') {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('studentId') || params.get('id') || params.get('student');
      const studentId = queryId || localStorage.getItem('currentUserId') || '1';
      setActiveStudentId(studentId);
      localStorage.setItem('currentUserId', studentId);

      getStudentById(studentId).then(s => {
        if (s) setCurrentStudentName(s.name);
      });

      // Anlık Firebase onSnapshot dinleyicisi: Öğretmen ödev eklediği anda öğrenci ekranı güncellenir
      const unsubscribe = subscribeStudentTasks(studentId, (cloudTasks) => {
        if (cloudTasks) {
          setTasks(cloudTasks);
        }
      });
      return () => unsubscribe();
    } else {
      // Öğretmen modu
      if (assignedStudentId === 'all') {
        getGlobalAcademicTasks().then(cloudTasks => {
          if (cloudTasks && cloudTasks.length > 0) setTasks(cloudTasks);
        });
      } else {
        // Seçilen öğrencinin Firebase'deki ödevlerini anlık onSnapshot ile dinle
        const unsubscribe = subscribeStudentTasks(assignedStudentId, (cloudTasks) => {
          if (cloudTasks) {
            setTasks(cloudTasks);
          }
        });
        return () => unsubscribe();
      }
    }
  }, [userRole, assignedStudentId]);

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed, correct: undefined, incorrect: undefined, topic: undefined } : t);
    setTasks(updated);

    const sId = (userRole === 'teacher' || userRole === 'admin')
      ? (assignedStudentId !== 'all' ? assignedStudentId : null)
      : (activeStudentId || localStorage.getItem('currentUserId'));

    if (sId) {
      await saveStudentTasks(sId, updated);
    } else if (assignedStudentId === 'all') {
      await saveGlobalAcademicTasks(updated);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (userRole === 'teacher' || userRole === 'admin') {
      return;
    }
    
    if (task.type === 'question' || task.type === 'test') {
      setModalTaskId(task.id);
      setModalCorrect(task.correct || 0);
      setModalIncorrect(task.incorrect || 0);
      
      const guessedTopic = task.title.replace(/test/gi, '').replace(/\d+/g, '').replace(/soru/gi, '').trim() || task.title;
      setModalTopic(task.topic || guessedTopic);
      setShowResultModal(true);
    } else {
      toggleTask(task.id);
    }
  };

  const resetTaskResult = async () => {
    if (!modalTaskId) return;

    const updated = tasks.map(t => {
      if (t.id === modalTaskId) {
        return {
          ...t,
          completed: false,
          correct: undefined,
          incorrect: undefined,
          topic: undefined
        };
      }
      return t;
    });

    setTasks(updated);
    const sId = activeStudentId || localStorage.getItem('currentUserId');
    if (sId) {
      await saveStudentTasks(sId, updated);
    }
    setShowResultModal(false);
    setModalTaskId(null);
  };

  const saveTaskResult = async () => {
    if (!modalTaskId) return;

    const updated = tasks.map(t => {
      if (t.id === modalTaskId) {
        return {
          ...t,
          completed: true,
          correct: Number(modalCorrect),
          incorrect: Number(modalIncorrect),
          topic: modalTopic || t.title
        };
      }
      return t;
    });
    
    setTasks(updated);
    const sId = activeStudentId || localStorage.getItem('currentUserId');
    if (sId) {
      await saveStudentTasks(sId, updated);
      showToast('Soru sonucu Firebase Firestore veritabanına kaydedildi! ✨');
    }
    setShowResultModal(false);
    setModalTaskId(null);
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    const daysToApply = selectedDays.length > 0 ? selectedDays : [selectedDay];
    const newTasks: Task[] = daysToApply.map(d => ({
      id: Math.random().toString(36).substr(2, 9),
      type: newTaskType,
      title: newTaskTitle.trim(),
      amount: newTaskAmount.trim() || undefined,
      videoUrl: newTaskType === 'video' ? newTaskVideoUrl.trim() : undefined,
      completed: false,
      day: d
    }));

    if (userRole === 'teacher' || userRole === 'admin') {
      if (assignedStudentId === 'all') {
        // Tüm öğrencilerin Firestore dökümanına kaydet
        for (const s of allStudents) {
          const studentExisting = s.tasks || [];
          const updated = [...studentExisting, ...newTasks];
          await saveStudentTasks(s.id, updated);
        }
        const updatedLocal = [...tasks, ...newTasks];
        setTasks(updatedLocal);
        await saveGlobalAcademicTasks(updatedLocal);
        showToast(`✅ Ödev başarıyla tüm öğrencilerin (${allStudents.length}) Firebase Firestore hesabına kaydedildi!`);
      } else {
        // Seçilen öğrencinin Firestore dökümanına kaydet
        const targetStudent = allStudents.find(s => s.id === assignedStudentId);
        const studentExisting = targetStudent?.tasks || tasks;
        const updated = [...studentExisting, ...newTasks];
        setTasks(updated);
        await saveStudentTasks(assignedStudentId, updated);
        showToast(`✅ Ödev ${targetStudent?.name || 'öğrenciye'} Firebase Firestore ile kaydedildi ve öğrenci ekranına anında aktarıldı!`);
      }
    } else {
      // Öğrencinin kendi oluşturduğu ödev
      const updated = [...tasks, ...newTasks];
      setTasks(updated);
      if (activeStudentId) {
        await saveStudentTasks(activeStudentId, updated);
        showToast('✅ Ödev Firebase Firestore veritabanına kaydedildi!');
      }
    }

    setNewTaskTitle('');
    setNewTaskAmount('');
    setNewTaskVideoUrl('');
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);

    if (userRole === 'teacher' || userRole === 'admin') {
      if (assignedStudentId !== 'all') {
        await saveStudentTasks(assignedStudentId, updated);
        showToast('Ödev silindi ve Firestore güncellendi.');
      } else {
        await saveGlobalAcademicTasks(updated);
        showToast('Ödev silindi.');
      }
    } else if (activeStudentId) {
      await saveStudentTasks(activeStudentId, updated);
    }
  };

  const filteredTasks = tasks.filter(t => t.day === selectedDay);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Bildirim Kutusu */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${getYoutubeId(selectedVideo)}?autoplay=1`}
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Ödev Akışı</h3>
          <p className="text-on-surface-variant font-medium">
            {userRole === 'student' ? 'Bugün neler yapman gerektiğini buradan takip et.' : 'Öğrencilerin haftalık programlarını buradan yönetin.'}
          </p>
          
          <div className="inline-flex bg-surface-container-high p-1 rounded-2xl border border-outline-variant/10">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                viewMode === 'daily' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Günlük Akış
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                viewMode === 'weekly' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Haftalık Tablo Görünümü
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-high p-2 rounded-2xl">
          <Calendar className="w-5 h-5 text-primary ml-2" />
          <span className="text-sm font-bold text-on-surface pr-4 border-r border-outline-variant/30">Bugün: {DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}</span>
          <Clock className="w-5 h-5 text-primary ml-2" />
          <span className="text-sm font-bold text-on-surface pr-2">{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Öğretmen için Öğrenci Hedef Seçim ve Canlı Senkron Çubuğu */}
      {(userRole === 'teacher' || userRole === 'admin') && (
        <div className="bg-surface-container-low p-4 sm:p-5 rounded-3xl border border-outline-variant/15 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ödev Yönetilen Öğrenci</p>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={assignedStudentId}
                  onChange={(e) => setAssignedStudentId(e.target.value)}
                  className="bg-surface-container-lowest font-black text-sm text-primary px-3.5 py-1.5 rounded-xl border border-primary/20 outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
                >
                  <option value="all">🌟 Tüm Öğrenciler ({allStudents.length} Kayıtlı)</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      👤 {s.name} ({s.grade || 'Sınıf belirtilmemiş'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Firestore Canlı Senkronizasyon (onSnapshot)
            </span>
          </div>
        </div>
      )}

      {/* Öğrenci için Canlı Bağlantı Bilgi Çubuğu */}
      {userRole === 'student' && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-surface-container-low to-surface-container-lowest p-4 rounded-3xl border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-900">
                {currentStudentName ? `${currentStudentName} • Ödev Akışı` : 'Ödev Akışım'}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Öğretmeninin atadığı ödevler anlık (onSnapshot) olarak Firebase veritabanından akmaktadır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Bulut Bağlantısı Aktif
            </span>
          </div>
        </div>
      )}

      {/* Day Selector */}
      {viewMode === 'daily' && (
        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                selectedDay === day 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'weekly' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-4">
            <h4 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Haftalık Ödev Programı Tablosu
            </h4>
            
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-[2.5rem] p-6 shadow-ambient overflow-x-auto">
              <div className="min-w-[850px]">
                <div className="grid grid-cols-7 gap-3 border-b border-outline-variant/10 pb-4 mb-4">
                  {DAYS.map((day) => (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      className={`text-center font-black text-xs uppercase tracking-wider py-2 rounded-xl cursor-pointer transition-all ${
                        selectedDay === day 
                          ? 'bg-primary/15 text-primary border border-primary/30 font-black scale-105' 
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-3 items-start">
                  {DAYS.map((day) => {
                    const dayTasks = tasks.filter(t => t.day === day);
                    return (
                      <div key={day} className="space-y-3 min-h-[350px] p-2 bg-surface-container-low/30 rounded-2xl border border-outline-variant/5 animate-fade-in">
                        {dayTasks.length > 0 ? (
                          dayTasks.map((task) => (
                            <div 
                              key={task.id}
                              onClick={() => handleTaskClick(task)}
                              className={`p-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer relative group ${
                                task.completed 
                                  ? 'bg-tertiary/5 border-tertiary/10 text-on-surface/40' 
                                  : 'bg-white border-outline-variant/10 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="line-clamp-2 mb-1 leading-snug">{task.title}</div>
                              <div className="flex flex-wrap items-center gap-1">
                                <span className={`text-[8px] font-black px-1 rounded ${
                                  task.type === 'video' ? 'bg-blue-100 text-blue-700' :
                                  task.type === 'question' ? 'bg-orange-100 text-orange-700' :
                                  task.type === 'book' ? 'bg-emerald-100 text-emerald-700' :
                                  task.type === 'test' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {task.type === 'video' ? 'Vid' : task.type === 'question' ? 'Sor' : task.type === 'book' ? 'Kitap' : task.type === 'test' ? 'Tst' : 'Oku'}
                                </span>
                                {task.amount && <span className="text-[8px] text-on-surface-variant font-medium">{task.amount}</span>}
                              </div>
                              {task.completed && (task.correct !== undefined || task.incorrect !== undefined) && (
                                <div className="mt-1.5 text-[8px] font-bold text-tertiary bg-tertiary/10 rounded py-0.5 text-center">
                                  D: {task.correct || 0} • Y: {task.incorrect || 0}
                                </div>
                              )}
                              {(userRole === 'teacher' || userRole === 'admin') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary text-white flex items-center justify-center shadow-md hover:scale-115 transition-transform"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16 text-[9px] text-on-surface-variant/30 font-bold italic">
                            Boş
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar for weekly view */}
          <div className="space-y-6">
            {(userRole === 'teacher' || userRole === 'admin') ? (
              <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-ambient border border-outline-variant/10 space-y-6 sticky top-24">
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-on-surface">Yeni Görev Ekle</h4>
                  <p className="text-sm text-on-surface-variant font-medium">Haftalık programa yeni görev planla.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ödev Verilecek Öğrenci</label>
                    <select
                      value={assignedStudentId}
                      onChange={(e) => setAssignedStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant/10 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-bold text-on-surface outline-none text-xs"
                    >
                      <option value="all">🌟 Tüm Öğrencilere Kaydet ({allStudents.length})</option>
                      {allStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          👤 {s.name} ({s.grade || 'Öğrenci'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Gün Seçin</label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-container-high border border-outline-variant/10 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-bold text-on-surface outline-none"
                    >
                      {DAYS.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Görev Başlığı</label>
                    <input 
                      type="text" 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Örn: Logaritma Konu Anlatımı"
                      className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Görev Türü</label>
                    <div className="flex gap-2">
                      {(['video', 'question', 'test', 'reading'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewTaskType(type)}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                            newTaskType === type ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-high border-transparent text-on-surface-variant'
                          }`}
                        >
                          {type === 'video' ? 'Video' : type === 'question' ? 'Soru' : type === 'test' ? 'Test' : 'Okuma'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Miktar (Opsiyonel)</label>
                    <input 
                      type="text" 
                      value={newTaskAmount}
                      onChange={(e) => setNewTaskAmount(e.target.value)}
                      placeholder="Örn: 50 soru veya 20 dk"
                      className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                    />
                  </div>

                  {newTaskType === 'video' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">YouTube Video Linki</label>
                      <input 
                        type="text" 
                        value={newTaskVideoUrl}
                        onChange={(e) => setNewTaskVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                      />
                    </div>
                  )}

                  <button 
                    onClick={addTask}
                    className="w-full py-4 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus className="w-5 h-5" />
                    Programa Ekle
                  </button>

                  <p className="text-[10px] text-center text-on-surface-variant/80 font-bold flex items-center justify-center gap-1 mt-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Firebase Firestore bulutuna doğrudan yazılır, öğrenci ekranına anında (onSnapshot) aktarılır.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-primary/20 sticky top-24">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold">Haftalık Özet</h4>
                  <p className="text-white/80 text-sm font-medium leading-relaxed">
                    Bu hafta toplam {tasks.length} görevin var. {tasks.filter(t => t.completed).length} tanesini tamamladın.
                  </p>
                </div>
                
                <div className="pt-4 space-y-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100}%` }}
                      className="h-full bg-white"
                    />
                  </div>
                  <p className="text-xs font-bold text-center">
                    Haftalık İlerleme: %{Math.round((tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {selectedDay} Programı
              </h4>
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
                {filteredTasks.length} Görev
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleTaskClick(task)}
                    className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                      userRole === 'student' ? 'cursor-pointer hover:border-primary/40' : ''
                    } ${
                      task.completed 
                        ? 'bg-tertiary/5 border-tertiary/20' 
                        : 'bg-surface-container-lowest border-outline-variant/10 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                          task.completed ? 'bg-tertiary text-white' : 'bg-surface-container-high text-outline group-hover:text-primary'
                        }`}
                      >
                        {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-6 h-6 rounded-full border-2 border-current" />}
                      </button>
                      <div>
                        <h5 className={`font-bold text-lg ${task.completed ? 'text-on-surface/50 line-through' : 'text-on-surface'}`}>
                          {task.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${
                            task.type === 'video' ? 'bg-blue-100 text-blue-600' : 
                            task.type === 'question' ? 'bg-orange-100 text-orange-600' : 
                            task.type === 'book' ? 'bg-emerald-100 text-emerald-700' :
                            task.type === 'test' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                          }`}>
                            {task.type === 'video' ? <PlayCircle className="w-3 h-3" /> : task.type === 'test' ? <ClipboardCheck className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                            {task.type === 'video' ? 'Video İzle' : task.type === 'question' ? 'Soru Çöz' : task.type === 'book' ? 'Kitap Okuma' : task.type === 'test' ? 'Test Çöz' : 'Okuma'}
                          </span>
                          {task.amount && <span className="text-xs font-medium text-on-surface-variant">| {task.amount}</span>}
                          {task.completed && (task.correct !== undefined || task.incorrect !== undefined) && (
                            <span className="text-xs font-bold bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Doğru: {task.correct || 0} • Yanlış: {task.incorrect || 0} {task.topic && `• Konu: ${task.topic}`}
                            </span>
                          )}
                          {task.videoUrl && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideo(task.videoUrl!);
                              }}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 animate-pulse"
                            >
                              <PlayCircle className="w-3 h-3" />
                              Videoyu İzle
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {userRole === 'teacher' || userRole === 'admin' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="p-3 text-outline hover:text-secondary hover:bg-secondary/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    ) : null}
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/30">
                  <div className="w-16 h-16 bg-surface-container-high rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-outline" />
                  </div>
                  <p className="text-on-surface-variant font-bold">Bu gün için planlanmış bir görev yok.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel: Teacher Controls or Student Progress */}
          <div className="space-y-6">
            {(userRole === 'teacher' || userRole === 'admin') ? (
              <div className="bg-surface-container-lowest p-7 rounded-[2.5rem] shadow-ambient border border-outline-variant/10 space-y-5 sticky top-24">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-on-surface">Yeni Görev Ekle</h4>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {selectedDays.length > 1 
                      ? `${selectedDays.length} güne toplu görev atayın.` 
                      : `${selectedDay} programına görev ekleyin.`}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Ödev Verilecek Öğrenci */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ödev Verilecek Öğrenci</label>
                    <select
                      value={assignedStudentId}
                      onChange={(e) => setAssignedStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-high border border-outline-variant/10 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-bold text-on-surface outline-none text-xs"
                    >
                      <option value="all">🌟 Tüm Öğrencilere Kaydet ({allStudents.length})</option>
                      {allStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          👤 {s.name} ({s.grade || 'Öğrenci'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Görev Türü</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { type: 'question', label: 'Soru' },
                        { type: 'book', label: 'Kitap' },
                        { type: 'test', label: 'Test' },
                        { type: 'video', label: 'Video' },
                        { type: 'reading', label: 'Okuma' }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setNewTaskType(item.type as any)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                            newTaskType === item.type 
                              ? 'bg-primary text-white border-primary shadow-sm font-black' 
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Task Title & Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      {newTaskType === 'book' ? 'Kitap / Eser Adı' : 'Görev Başlığı'}
                    </label>
                    <input 
                      type="text" 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder={
                        newTaskType === 'book' 
                          ? 'Örn: Çalıkuşu, Suç ve Ceza, Nutuk...' 
                          : newTaskType === 'question' 
                          ? 'Örn: Paragraf Soru Çözümü' 
                          : 'Örn: Logaritma Konu Anlatımı'
                      }
                      className="w-full px-4 py-3 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-bold text-on-surface outline-none text-sm"
                    />

                    {/* Quick shortcuts for Title */}
                    {newTaskType === 'question' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {['Paragraf Soru Çözümü', 'Problem Soru Çözümü', 'Geometri Soru Çözümü'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setNewTaskTitle(preset);
                              if (!newTaskAmount) setNewTaskAmount('30 soru');
                            }}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md hover:bg-primary/20 transition-all"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    )}

                    {newTaskType === 'book' && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {['Serbest Kitap Okuma', 'Nutuk', 'Çalıkuşu', 'Suç ve Ceza', 'Simyacı'].map((book) => (
                          <button
                            key={book}
                            type="button"
                            onClick={() => {
                              setNewTaskTitle(book);
                              if (!newTaskAmount) setNewTaskAmount('25 sayfa');
                            }}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md hover:bg-emerald-200 transition-all"
                          >
                            + {book}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">
                      {newTaskType === 'book' ? 'Okunacak Sayfa Sayısı / Süre' : 'Miktar / Hedef (Opsiyonel)'}
                    </label>
                    <input 
                      type="text" 
                      value={newTaskAmount}
                      onChange={(e) => setNewTaskAmount(e.target.value)}
                      placeholder={newTaskType === 'book' ? 'Örn: 25 sayfa veya 30 dk' : 'Örn: 30 soru veya 20 dk'}
                      className="w-full px-4 py-3 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-bold text-on-surface outline-none text-sm"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(newTaskType === 'book' 
                        ? ['15 sayfa', '20 sayfa', '25 sayfa', '30 sayfa', '30 dk'] 
                        : ['20 soru', '30 soru', '40 soru', '50 soru']
                      ).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setNewTaskAmount(amt)}
                          className="px-2 py-0.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded-md transition-all"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newTaskType === 'video' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">YouTube Video Linki</label>
                      <input 
                        type="text" 
                        value={newTaskVideoUrl}
                        onChange={(e) => setNewTaskVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-3 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none text-sm"
                      />
                    </div>
                  )}

                  {/* Multi-Day Selection for AssignmentFlow */}
                  <div className="space-y-2.5 pt-2 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-on-surface flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5 text-primary" />
                        Uygulanacak Günler
                      </label>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {selectedDays.length === 7 ? 'Tüm Hafta' : `${selectedDays.length} Gün`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDays([...DAYS])}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          selectedDays.length === 7 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        ⭐ Her Gün
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDays(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'])}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          selectedDays.length === 5 && !selectedDays.includes('Cumartesi') ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        📅 Hafta İçi
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDays([selectedDay])}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          selectedDays.length === 1 ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        Sadece Bugün
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((day) => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedDays.length > 1) {
                                  setSelectedDays(selectedDays.filter(d => d !== day));
                                }
                              } else {
                                setSelectedDays([...selectedDays, day]);
                              }
                            }}
                            className={`py-1 text-center rounded-lg text-[10px] font-bold transition-all border ${
                              isSelected
                                ? 'bg-primary/15 text-primary border-primary/30 font-black'
                                : 'bg-surface-container-high text-on-surface-variant/70 border-transparent'
                            }`}
                            title={day}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={addTask}
                    disabled={!newTaskTitle}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {selectedDays.length > 1 ? `${selectedDays.length} Güne Birden Ekle` : 'Programa Ekle'}
                  </button>

                  <p className="text-[10px] text-center text-on-surface-variant/80 font-bold flex items-center justify-center gap-1 mt-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Firebase Firestore bulutuna doğrudan yazılır, öğrenci ekranına anında (onSnapshot) aktarılır.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-primary/20 sticky top-24">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold">Günün Özeti</h4>
                  <p className="text-white/80 text-sm font-medium leading-relaxed">
                    Bugün toplam {filteredTasks.length} görevin var. {filteredTasks.filter(t => t.completed).length} tanesini tamamladın.
                  </p>
                </div>
                
                <div className="pt-4 space-y-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(filteredTasks.filter(t => t.completed).length / (filteredTasks.length || 1)) * 100}%` }}
                      className="h-full bg-white"
                    />
                  </div>
                  <p className="text-xs font-bold text-center">
                    Günlük İlerleme: %{Math.round((filteredTasks.filter(t => t.completed).length / (filteredTasks.length || 1)) * 100)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showResultModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-md p-8 rounded-[2.5rem] shadow-ambient border border-outline-variant/10 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-2">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-black text-on-surface">Görev Sonucu</h4>
                <p className="text-sm text-on-surface-variant font-medium">Bu görevde çözdüğün doğru ve yanlış sayılarını gir.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Konu Başlığı</label>
                  <input 
                    type="text"
                    value={modalTopic}
                    onChange={(e) => setModalTopic(e.target.value)}
                    placeholder="Örn: Türev, Polinomlar, Paragraf"
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-emerald-600 ml-1">Doğru Sayısı</label>
                    <input 
                      type="number"
                      min="0"
                      value={modalCorrect}
                      onChange={(e) => setModalCorrect(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-5 py-4 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-center text-xl outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-red-600 ml-1">Yanlış Sayısı</label>
                    <input 
                      type="number"
                      min="0"
                      value={modalIncorrect}
                      onChange={(e) => setModalIncorrect(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-5 py-4 bg-red-50 text-red-900 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all font-bold text-center text-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowResultModal(false)}
                    className="flex-1 py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-bold rounded-2xl transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={saveTaskResult}
                    className="flex-1 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/15"
                  >
                    Kaydet & Kapat
                  </button>
                </div>
                {tasks.find(t => t.id === modalTaskId)?.completed && (
                  <button 
                    onClick={resetTaskResult}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5 border border-red-200/50"
                  >
                    Görevi Sıfırla (Yapılmadı Olarak İşaretle)
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
