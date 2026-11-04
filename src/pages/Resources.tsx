import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookMarked, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Filter, 
  Award, 
  TrendingUp, 
  X, 
  Save, 
  ExternalLink,
  Target,
  ArrowRight,
  User,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StudentResource, 
  saveStudentResource, 
  deleteStudentResource, 
  subscribeStudentResources,
  subscribeStudents,
  getStudentById
} from '../lib/firestoreService';
import { getSubjectsForGrade } from '../lib/curriculum';

const POPULAR_PUBLISHERS = [
  '3D Yayınları',
  'Apotemi',
  'Bilgi Sarmal',
  'Karakök',
  'Limit',
  'Orijinal',
  'Hız ve Renk',
  'Palme',
  'Çap Yayınları',
  'Endemik',
  'Karekök',
  'Metin Yayınları',
  'Aydın Yayınları',
  'Birey',
  'Esen',
  'Tonguç'
];

const DEFAULT_SUBJECTS = [
  'Matematik',
  'Türkçe',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Geometri',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü',
  'İngilizce',
  'Fen Bilimleri',
  'Sosyal Bilgiler'
];

export function Resources() {
  const userRole = localStorage.getItem('userRole') || 'student';
  const currentUserId = localStorage.getItem('currentUserId') || '1';
  const currentUserName = localStorage.getItem('currentUserName') || 'Öğrenci';

  // State for active student (for teachers/admins to switch between students)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentUserId);
  const [activeStudentName, setActiveStudentName] = useState<string>(currentUserName);
  const [activeStudentGrade, setActiveStudentGrade] = useState<string>('12. Sınıf');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  // Resources state
  const [resources, setResources] = useState<StudentResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<StudentResource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick progress modal
  const [progressModalTarget, setProgressModalTarget] = useState<StudentResource | null>(null);
  const [quickAddQuestions, setQuickAddQuestions] = useState<string>('20');

  // Form state
  const [formData, setFormData] = useState({
    subject: 'Matematik',
    customSubject: '',
    name: '',
    publisher: '',
    status: 'active' as 'active' | 'completed' | 'new' | 'paused',
    totalQuestions: '',
    solvedQuestions: '',
    notes: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch available students if teacher or admin
  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'admin') {
      const unsub = subscribeStudents((list) => {
        setAvailableStudents(list);
        if (list.length > 0 && selectedStudentId === currentUserId) {
          const first = list[0];
          setSelectedStudentId(first.id);
          setActiveStudentName(first.name);
          setActiveStudentGrade(first.grade || '12. Sınıf');
        }
      });
      return () => unsub();
    }
  }, [userRole]);

  // 2. Fetch student details when selectedStudentId changes
  useEffect(() => {
    if (selectedStudentId) {
      getStudentById(selectedStudentId).then(s => {
        if (s) {
          setActiveStudentName(s.name);
          setActiveStudentGrade(s.grade || '12. Sınıf');
        }
      });
    }
  }, [selectedStudentId]);

  // 3. Realtime subscription to student's resources
  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    const unsub = subscribeStudentResources(selectedStudentId, (list) => {
      setResources(list);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedStudentId]);

  // Dynamic available subjects for this student
  const subjectList = useMemo(() => {
    const curriculumSubjects = getSubjectsForGrade(activeStudentGrade).map(s => s.name);
    const merged = Array.from(new Set([...curriculumSubjects, ...DEFAULT_SUBJECTS]));
    return merged;
  }, [activeStudentGrade]);

  // Distinct subjects currently in student's resources
  const existingResourceSubjects = useMemo(() => {
    const set = new Set(resources.map(r => r.subject));
    return Array.from(set);
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = 
        (res.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.publisher || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = selectedSubjectFilter === 'all' || res.subject === selectedSubjectFilter;
      const matchesStatus = selectedStatusFilter === 'all' || res.status === selectedStatusFilter;

      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [resources, searchQuery, selectedSubjectFilter, selectedStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = resources.length;
    const active = resources.filter(r => r.status === 'active').length;
    const completed = resources.filter(r => r.status === 'completed').length;
    const totalQuestions = resources.reduce((acc, r) => acc + (Number(r.totalQuestions) || 0), 0);
    const solvedQuestions = resources.reduce((acc, r) => acc + (Number(r.solvedQuestions) || 0), 0);
    const progress = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

    return { total, active, completed, totalQuestions, solvedQuestions, progress };
  }, [resources]);

  // Open modal for Create
  const handleOpenAddModal = (presetSubject?: string) => {
    setEditingResource(null);
    setFormData({
      subject: presetSubject || (subjectList[0] || 'Matematik'),
      customSubject: '',
      name: '',
      publisher: '',
      status: 'active',
      totalQuestions: '',
      solvedQuestions: '',
      notes: ''
    });
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (res: StudentResource) => {
    setEditingResource(res);
    const isCustom = !subjectList.includes(res.subject);
    setFormData({
      subject: isCustom ? 'other' : res.subject,
      customSubject: isCustom ? res.subject : '',
      name: res.name || '',
      publisher: res.publisher || '',
      status: res.status || 'active',
      totalQuestions: res.totalQuestions ? String(res.totalQuestions) : '',
      solvedQuestions: res.solvedQuestions ? String(res.solvedQuestions) : '',
      notes: res.notes || ''
    });
    setShowModal(true);
  };

  // Save handler
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = formData.subject === 'other' 
      ? (formData.customSubject.trim() || 'Genel') 
      : formData.subject;

    if (!formData.name.trim()) {
      showToast('Lütfen kaynak / kitap adını giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalQ = formData.totalQuestions ? parseInt(formData.totalQuestions, 10) : undefined;
      const solvedQ = formData.solvedQuestions ? parseInt(formData.solvedQuestions, 10) : undefined;

      await saveStudentResource(selectedStudentId, {
        id: editingResource ? editingResource.id : undefined,
        subject: finalSubject,
        name: formData.name.trim(),
        publisher: formData.publisher.trim() || undefined,
        status: formData.status,
        totalQuestions: isNaN(totalQ as any) ? undefined : totalQ,
        solvedQuestions: isNaN(solvedQ as any) ? undefined : solvedQ,
        notes: formData.notes.trim() || undefined,
        createdAt: editingResource ? editingResource.createdAt : new Date().toISOString()
      });

      showToast(editingResource ? 'Kaynak başarıyla güncellendi! ✅' : 'Yeni kaynak başarıyla eklendi! 📚✨');
      setShowModal(false);
    } catch (err) {
      console.error(err);
      showToast('Kaynak kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteResource = async (resourceId: string, name: string) => {
    if (!window.confirm(`"${name}" adlı kaynağı silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteStudentResource(selectedStudentId, resourceId);
      showToast('Kaynak silindi.');
    } catch (err) {
      console.error(err);
      showToast('Kaynak silinirken bir hata oluştu.');
    }
  };

  // Quick progress increment handler
  const handleQuickAddProgress = async () => {
    if (!progressModalTarget) return;
    const addCount = parseInt(quickAddQuestions, 10);
    if (isNaN(addCount) || addCount <= 0) {
      showToast('Lütfen geçerli bir soru sayısı giriniz.');
      return;
    }

    const currentSolved = progressModalTarget.solvedQuestions || 0;
    const newSolved = currentSolved + addCount;
    const totalQ = progressModalTarget.totalQuestions || 0;

    let newStatus = progressModalTarget.status;
    if (totalQ > 0 && newSolved >= totalQ) {
      newStatus = 'completed';
    }

    await saveStudentResource(selectedStudentId, {
      ...progressModalTarget,
      solvedQuestions: newSolved,
      status: newStatus
    });

    showToast(`"${progressModalTarget.name}" için +${addCount} soru ilerlemesi kaydedildi! 🎯`);
    setProgressModalTarget(null);
  };

  const getSubjectColor = (subject: string) => {
    const s = (subject || '').toLowerCase();
    if (s.includes('matematik')) return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    if (s.includes('türk') || s.includes('edebiyat')) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    if (s.includes('fizik')) return 'bg-amber-500/10 text-amber-800 border-amber-500/30';
    if (s.includes('kimya')) return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
    if (s.includes('biyo')) return 'bg-teal-500/10 text-teal-700 border-teal-500/30';
    if (s.includes('geo')) return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
    if (s.includes('tarih') || s.includes('inkılap')) return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
    if (s.includes('coğrafya')) return 'bg-lime-500/10 text-lime-800 border-lime-500/30';
    if (s.includes('din')) return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30';
    if (s.includes('felsefe')) return 'bg-violet-500/10 text-violet-700 border-violet-500/30';
    if (s.includes('ingilizce')) return 'bg-pink-500/10 text-pink-700 border-pink-500/30';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const getStatusBadge = (status: StudentResource['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Aktif Çözülüyor
          </span>
        );
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Yeni Başlandı
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3 h-3 text-slate-600" />
            Bitti / Tamamlandı
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Beklemede
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm border border-slate-800 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-primary to-primary-container rounded-[2.5rem] p-6 sm:p-8 md:p-10 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-white">
                Soru Kaynaklarım & Kitaplarım
              </span>
              <span className="px-2.5 py-1 bg-amber-400/90 text-indigo-950 rounded-full text-[10px] font-black uppercase tracking-wider">
                Ders Ders Takip
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-manrope tracking-tight">
              Kaynaklarım
            </h1>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed font-medium">
              Soru çözdüğün soru bankalarını, fasikülleri ve kaynak kitaplarını ders ders kaydet.
              Öğretmenin ödev verirken bu kaynaklarını görerek sana özel nokta atışı ödevler tanımlayabilir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-6 py-3.5 bg-white text-primary hover:bg-white/90 active:scale-95 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Kaynak Ekle</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-60 h-60 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Teacher / Admin: Student Selector Bar */}
      {(userRole === 'teacher' || userRole === 'admin') && (
        <div className="p-4 bg-surface-container-lowest rounded-3xl border border-outline-variant/15 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">İncelenen Öğrenci</p>
              <h3 className="text-base font-extrabold text-on-surface">
                {activeStudentName} <span className="text-xs font-bold text-primary">({activeStudentGrade})</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold text-on-surface-variant">Öğrenci Değiştir:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-4 py-2.5 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface border border-outline-variant/15 outline-none focus:ring-2 focus:ring-primary"
            >
              {availableStudents.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.grade || '12. Sınıf'})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Toplam Kaynak</span>
            <BookMarked className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-on-surface">{stats.total} <span className="text-xs font-bold text-on-surface-variant">Kitap</span></p>
          <p className="text-[11px] text-on-surface-variant font-medium">{existingResourceSubjects.length} farklı derste</p>
        </div>

        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Aktif Çözülen</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.active} <span className="text-xs font-bold text-emerald-900/70">Kitap</span></p>
          <p className="text-[11px] text-emerald-800 font-medium">Haftalık rutinde kullanılıyor</p>
        </div>

        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Biten Kaynaklar</span>
            <CheckCircle2 className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{stats.completed} <span className="text-xs font-bold text-slate-500">Kitap</span></p>
          <p className="text-[11px] text-slate-500 font-medium">Tamamı bitirildi</p>
        </div>

        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Çözülen Soru</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">
            {stats.solvedQuestions > 0 ? stats.solvedQuestions.toLocaleString('tr-TR') : '0'}
            <span className="text-xs font-bold text-indigo-600 ml-1">Soru</span>
          </p>
          <p className="text-[11px] text-indigo-800 font-medium">
            {stats.totalQuestions > 0 ? `%${stats.progress} tamamlanma oranı` : 'Kayıtlı soru sayısı'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/10 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kaynak adı, ders veya yayınevi ara (örn: 3D, Apotemi, Limit)..."
              className="w-full pl-11 pr-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border-none outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-highest rounded-full text-on-surface-variant"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-on-surface-variant" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif Çözülen</option>
              <option value="new">Yeni Başlandı</option>
              <option value="completed">Bitti / Tamamlandı</option>
              <option value="paused">Beklemede</option>
            </select>
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
            }`}
          >
            Tüm Dersler ({resources.length})
          </button>

          {subjectList.map((subj) => {
            const count = resources.filter(r => r.subject === subj).length;
            if (count === 0 && !existingResourceSubjects.includes(subj)) return null;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubjectFilter(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedSubjectFilter === subj
                    ? 'bg-primary text-white shadow-xs font-black'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <span>{subj}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedSubjectFilter === subj ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-on-surface-variant">Kaynaklar yükleniyor...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-12 sm:p-16 bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/15 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <BookMarked className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-on-surface">
              {searchQuery || selectedSubjectFilter !== 'all' || selectedStatusFilter !== 'all'
                ? 'Aradığınız kriterlere uygun kaynak bulunamadı'
                : 'Henüz kaynak eklenmemiş'}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {searchQuery || selectedSubjectFilter !== 'all' || selectedStatusFilter !== 'all'
                ? 'Filtreleri temizleyerek veya arama kelimesini değiştirerek tekrar deneyebilirsiniz.'
                : 'Çözdüğün soru bankalarını ve ders kitaplarını ekle; öğretmenin ödev verirken dersine ait kaynakları anında görsün.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddModal(selectedSubjectFilter !== 'all' ? selectedSubjectFilter : undefined)}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>İlk Kaynağını Ekle</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const hasQuestionData = Boolean(res.totalQuestions || res.solvedQuestions);
            const totalQ = res.totalQuestions || 0;
            const solvedQ = res.solvedQuestions || 0;
            const percent = totalQ > 0 ? Math.min(100, Math.round((solvedQ / totalQ) * 100)) : 0;

            return (
              <motion.div
                key={res.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-surface-container-lowest p-5 sm:p-6 rounded-[2rem] border border-outline-variant/15 hover:border-primary/30 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Card Header: Subject and Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black border ${getSubjectColor(res.subject)}`}>
                      {res.subject}
                    </span>
                    {getStatusBadge(res.status)}
                  </div>

                  {/* Resource Title & Publisher */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {res.name}
                    </h3>
                    {res.publisher && (
                      <p className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 inline-block" />
                        {res.publisher}
                      </p>
                    )}
                  </div>

                  {/* Progress Bar (if question counts defined) */}
                  {hasQuestionData && (
                    <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-on-surface-variant">Çözülen Soru:</span>
                        <span className="text-primary font-black">
                          {solvedQ} / {totalQ > 0 ? totalQ : '?'} Soru {totalQ > 0 && `(%${percent})`}
                        </span>
                      </div>
                      {totalQ > 0 && (
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {res.notes && (
                    <p className="text-xs text-on-surface-variant font-medium bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/5 italic">
                      "{res.notes}"
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProgressModalTarget(res)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      title="Soru çözümü ekle veya ilerlemeyi güncelle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>İlerleme Gir</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(res)}
                      className="p-2 hover:bg-surface-container-high text-on-surface-variant hover:text-primary rounded-xl transition-all cursor-pointer"
                      title="Kaynağı Düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(res.id, res.name)}
                      className="p-2 hover:bg-rose-50 text-on-surface-variant hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                      title="Kaynağı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT RESOURCE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-outline-variant/15 z-10 max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface">
                      {editingResource ? 'Kaynağı Düzenle' : 'Yeni Soru Kaynağı Ekle'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium">
                      {activeStudentName} için ders kaynağı tanımı
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveResource} className="space-y-4">
                {/* Subject Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    Ders <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                  >
                    {subjectList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="other">+ Farklı Ders Adı Girin...</option>
                  </select>

                  {formData.subject === 'other' && (
                    <input
                      type="text"
                      value={formData.customSubject}
                      onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                      placeholder="Örn: Geometri, Mantık, Paragraf..."
                      className="w-full px-4 py-3 mt-2 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  )}
                </div>

                {/* Resource / Book Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    Kaynak / Kitap Adı <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: 3D TYT Matematik Soru Bankası"
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Publisher */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    Yayınevi (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Örn: 3D Yayınları, Apotemi, Bilgi Sarmal..."
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                  />
                  {/* Quick Publisher Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_PUBLISHERS.slice(0, 8).map(pub => (
                      <button
                        key={pub}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, publisher: pub }))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                          formData.publisher === pub
                            ? 'bg-primary text-white'
                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                      >
                        {pub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    Kullanım Durumu
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'active', label: 'Aktif Çözülüyor' },
                      { id: 'new', label: 'Yeni Başlandı' },
                      { id: 'completed', label: 'Bitti' },
                      { id: 'paused', label: 'Beklemede' },
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: st.id as any })}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                          formData.status === st.id
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Counts */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                      Toplam Soru Sayısı
                    </label>
                    <input
                      type="number"
                      value={formData.totalQuestions}
                      onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                      placeholder="Örn: 1200"
                      min="0"
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                      Çözülen Soru Sayısı
                    </label>
                    <input
                      type="number"
                      value={formData.solvedQuestions}
                      onChange={(e) => setFormData({ ...formData, solvedQuestions: e.target.value })}
                      placeholder="Örn: 350"
                      min="0"
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs sm:text-sm font-bold text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    Özel Notlar (İsteğe Bağlı)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Örn: Hafta sonları çözüyorum, zor soruları hocaya soracağım..."
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-medium text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="px-5 py-3 rounded-2xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Kaydediliyor...' : editingResource ? 'Değişiklikleri Kaydet' : 'Kaynağı Ekle'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PROGRESS MODAL */}
      <AnimatePresence>
        {progressModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProgressModalTarget(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant/15 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
                <div>
                  <h4 className="font-black text-sm text-on-surface">İlerleme Girişi</h4>
                  <p className="text-xs text-on-surface-variant font-medium truncate max-w-[200px]">
                    {progressModalTarget.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProgressModalTarget(null)}
                  className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-on-surface-variant">
                  Bu kitaptan yeni çözdüğün soru sayısını gir:
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={quickAddQuestions}
                    onChange={(e) => setQuickAddQuestions(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-base font-black text-on-surface border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary text-center"
                  />
                  <span className="text-xs font-bold text-on-surface-variant shrink-0">Soru</span>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  {['10', '20', '30', '40', '50'].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuickAddQuestions(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        quickAddQuestions === cnt
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      +{cnt}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-on-surface-variant font-medium text-center pt-1">
                  Şu anki çözülen: <strong>{progressModalTarget.solvedQuestions || 0}</strong> → Yeni:{' '}
                  <strong className="text-emerald-700">
                    {(progressModalTarget.solvedQuestions || 0) + (parseInt(quickAddQuestions, 10) || 0)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setProgressModalTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddProgress}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
