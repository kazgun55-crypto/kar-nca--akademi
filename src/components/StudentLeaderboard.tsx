import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Medal, Award, Crown, Flame, Target, Users, TrendingUp, Sparkles, 
  Search, ArrowUpDown, Filter, ChevronRight, ExternalLink, ShieldCheck, 
  CheckCircle2, AlertCircle, BarChart3, Layers, BookOpen, Clock, Info,
  Calendar, RotateCcw, X, Eye, CheckCircle, FileText, CheckSquare, HelpCircle,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { calculateWeeklyQuestionStats } from '../lib/utils';
import { subscribeStudents, subscribeTeachers } from '../lib/firestoreService';

export interface StudentLeaderboardProps {
  embedded?: boolean; // When embedded inside Dashboard.tsx
  initialGroupFilter?: string;
}

export type ProgramScope = 
  | 'latest_archived'    // En son sonlandırılan/tamamlanan program (1. Arşiv)
  | 'active'             // Halen yapılmakta olan güncel program
  | 'indexed_archived'   // Belirli bir kaçıncı program (1., 2., 3., 4. ...)
  | 'all_archived_total' // Tüm sonlandırılan programların kümülatif toplamı
  | 'all_archived_avg';   // Sonlandırılan program başına ortalama başarı

export interface StudentPerformanceData {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  normalizedGroup: string;
  branch: string;
  teacherId: string;
  teacherName: string;
  solvedQuestions: number;
  assignedQuestions: number;
  questionProgressPercent: number;
  correct: number;
  incorrect: number;
  empty: number;
  net: number;
  accuracyRate: number; // Doğru / (Doğru + Yanlış) * 100
  evaluatedAnswered: number; // Doğru + Yanlış
  taskCompletionRate: number;
  completedTasksCount: number;
  totalTasksCount: number;
  lastTrialScore: number;
  lastActive?: string;
  rankInGroup?: number;
  
  // Program-based metadata
  programLabel: string;
  programDate: string;
  programStatus: 'archived' | 'active' | 'no_data';
  totalArchivesCount: number;
  programTasks: any[];
  isFallbackActive?: boolean;
}

/**
 * Normalizes grade strings into clean academic comparison cohorts.
 * Ensures students in 8th grade are only compared with 8th graders, 
 * 12th grade with 12th grade, 9th with 9th, etc.
 */
export function getNormalizedAcademicGroup(gradeStr: string = ''): string {
  const clean = String(gradeStr || '').trim().toLowerCase();

  if (clean.includes('8') || clean.includes('lgs')) {
    return '8. Sınıf (LGS)';
  }
  if (clean.includes('9')) {
    return '9. Sınıf (Maarif Modeli)';
  }
  if (clean.includes('10')) {
    return '10. Sınıf (Maarif Modeli)';
  }
  if (clean.includes('11')) {
    return '11. Sınıf (YKS Hazırlık)';
  }
  if (clean.includes('12')) {
    if (clean.includes('say') || clean.includes('fen')) return '12. Sınıf (YKS Sayısal)';
    if (clean.includes('ea') || clean.includes('eşit') || clean.includes('esit')) return '12. Sınıf (YKS Eşit Ağırlık)';
    if (clean.includes('söz') || clean.includes('soz')) return '12. Sınıf (YKS Sözel)';
    if (clean.includes('dil')) return '12. Sınıf (YKS Dil)';
    return '12. Sınıf (YKS)';
  }
  if (clean.includes('mezun')) {
    return 'Mezun (YKS)';
  }

  // Fallback to the raw grade name if available
  return gradeStr.trim() || 'Genel Grup';
}

export function StudentLeaderboard({ embedded = false, initialGroupFilter = 'all' }: StudentLeaderboardProps) {
  const userRole = localStorage.getItem('userRole') || 'student';
  const isAdmin = userRole === 'admin';

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroupFilter);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'solved' | 'accuracy' | 'net' | 'progress' | 'trial' | 'tasks'>('solved');
  const [groupingMode, setGroupingMode] = useState<'cohort' | 'exact'>('cohort');

  // Program-based comparison selection state
  const [programScope, setProgramScope] = useState<ProgramScope>('latest_archived');
  const [selectedArchiveIndex, setSelectedArchiveIndex] = useState<number>(0);
  const [includeActiveFallback, setIncludeActiveFallback] = useState<boolean>(true);

  // Modal for inspecting detailed tasks of a student's chosen program
  const [selectedProgramModal, setSelectedProgramModal] = useState<{
    student: StudentPerformanceData;
    tasks: any[];
    title: string;
    date: string;
    completionRate: number;
  } | null>(null);

  // Real-time Firestore subscriptions for students & teachers
  useEffect(() => {
    const unsubStudents = subscribeStudents((list) => {
      setStudents(list);
    });

    const unsubTeachers = subscribeTeachers((list) => {
      setTeachers(list);
    });

    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  // Map teacher ID to Name
  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach(t => {
      if (t.id) map.set(t.id, t.name || 'Öğretmen');
    });
    return map;
  }, [teachers]);

  // Determine the maximum number of completed programs found across all students
  const maxArchivesCount = useMemo(() => {
    let maxCount = 1;
    students.forEach(s => {
      let archives = Array.isArray(s.archivedPrograms) ? s.archivedPrograms : [];
      if (archives.length === 0) {
        try {
          const raw = localStorage.getItem(`archived_programs_${s.id}`);
          if (raw) archives = JSON.parse(raw);
        } catch {}
      }
      if (archives.length > maxCount) {
        maxCount = archives.length;
      }
    });
    return Math.min(10, maxCount); // Limit up to 10 programs in UI
  }, [students]);

  // Compute performance metrics for all students based on the SELECTED PROGRAM SCOPE
  const enrichedStudents: StudentPerformanceData[] = useMemo(() => {
    return students.map(student => {
      // 1. Get active tasks
      let activeTasks = (Array.isArray(student.tasks) && student.tasks.length > 0)
        ? student.tasks
        : [];
      if (activeTasks.length === 0) {
        try {
          const raw = localStorage.getItem(`tasks_${student.id}`);
          if (raw) activeTasks = JSON.parse(raw);
        } catch {}
      }

      // 2. Get completed/archived programs
      let archives: any[] = (Array.isArray(student.archivedPrograms) && student.archivedPrograms.length > 0)
        ? student.archivedPrograms
        : [];
      if (archives.length === 0) {
        try {
          const raw = localStorage.getItem(`archived_programs_${student.id}`);
          if (raw) archives = JSON.parse(raw);
        } catch {}
      }

      // 3. Resolve target tasks according to selected programScope
      let targetTasks: any[] = [];
      let programLabel = '';
      let programDate = '';
      let programStatus: 'archived' | 'active' | 'no_data' = 'no_data';
      let isFallbackActive = false;
      let reportedCompletionRate = 0;

      if (programScope === 'latest_archived') {
        if (archives.length > 0) {
          const latestArchive = archives[0];
          targetTasks = Array.isArray(latestArchive.tasks) ? latestArchive.tasks : [];
          programLabel = '1. Sonlandırılan Program (Son Hafta)';
          programDate = latestArchive.endDate || 'Tamamlandı';
          programStatus = 'archived';
          reportedCompletionRate = typeof latestArchive.completionRate === 'number' ? latestArchive.completionRate : 0;
        } else if (includeActiveFallback && activeTasks.length > 0) {
          targetTasks = activeTasks;
          programLabel = 'Aktif Program (Henüz Sonlanmadı)';
          programDate = 'Devam Ediyor';
          programStatus = 'active';
          isFallbackActive = true;
        } else {
          targetTasks = [];
          programLabel = 'Sonlandırılmış Program Yok';
          programDate = '-';
          programStatus = 'no_data';
        }
      } else if (programScope === 'active') {
        targetTasks = activeTasks;
        programLabel = 'Aktif Çalışılan Program (Güncel)';
        programDate = 'Devam Ediyor';
        programStatus = activeTasks.length > 0 ? 'active' : 'no_data';
      } else if (programScope === 'indexed_archived') {
        if (archives.length > selectedArchiveIndex) {
          const targetedArchive = archives[selectedArchiveIndex];
          targetTasks = Array.isArray(targetedArchive.tasks) ? targetedArchive.tasks : [];
          programLabel = `${selectedArchiveIndex + 1}. Sonlandırılan Program`;
          programDate = targetedArchive.endDate || 'Tamamlandı';
          programStatus = 'archived';
          reportedCompletionRate = typeof targetedArchive.completionRate === 'number' ? targetedArchive.completionRate : 0;
        } else if (includeActiveFallback && selectedArchiveIndex === 0 && activeTasks.length > 0) {
          targetTasks = activeTasks;
          programLabel = 'Aktif Program (Henüz Sonlanmadı)';
          programDate = 'Devam Ediyor';
          programStatus = 'active';
          isFallbackActive = true;
        } else {
          targetTasks = [];
          programLabel = `${selectedArchiveIndex + 1}. Program Kaydı Yok`;
          programDate = '-';
          programStatus = 'no_data';
        }
      } else if (programScope === 'all_archived_total') {
        if (archives.length > 0) {
          targetTasks = archives.flatMap(a => (Array.isArray(a.tasks) ? a.tasks : []));
          programLabel = `Tüm Sonlandırılanlar (${archives.length} Program Toplamı)`;
          programDate = 'Kümülatif Toplam';
          programStatus = 'archived';
        } else if (includeActiveFallback && activeTasks.length > 0) {
          targetTasks = activeTasks;
          programLabel = 'Aktif Program (Tek Plan)';
          programDate = 'Devam Ediyor';
          programStatus = 'active';
          isFallbackActive = true;
        } else {
          targetTasks = [];
          programLabel = 'Sonlandırılmış Program Yok';
          programDate = '-';
          programStatus = 'no_data';
        }
      } else if (programScope === 'all_archived_avg') {
        if (archives.length > 0) {
          targetTasks = archives.flatMap(a => (Array.isArray(a.tasks) ? a.tasks : []));
          programLabel = `Program Başına Ortalama (${archives.length} Program)`;
          programDate = 'Kümülatif Ortalama';
          programStatus = 'archived';
        } else if (includeActiveFallback && activeTasks.length > 0) {
          targetTasks = activeTasks;
          programLabel = 'Aktif Program (Tek Plan)';
          programDate = 'Devam Ediyor';
          programStatus = 'active';
          isFallbackActive = true;
        } else {
          targetTasks = [];
          programLabel = 'Sonlandırılmış Program Yok';
          programDate = '-';
          programStatus = 'no_data';
        }
      }

      // 4. Calculate Canonical Stats for the selected program tasks
      const baseStats = calculateWeeklyQuestionStats(
        targetTasks, 
        Number(student.weeklyQuestionTarget || student.weeklyQuestionGoal) || undefined,
        student.grade
      );

      const completedCount = targetTasks.filter((t: any) => t.completed).length;
      const totalCount = targetTasks.length;
      const calculatedTaskCompletion = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100) 
        : (reportedCompletionRate || 0);

      const normalized = getNormalizedAcademicGroup(student.grade);
      const exactClass = student.grade || 'Belirtilmedi';

      // If programScope is 'all_archived_avg', average the question counts by archive count
      const divisor = (programScope === 'all_archived_avg' && archives.length > 1) ? archives.length : 1;

      const evaluatedTotal = baseStats.correct + baseStats.incorrect + baseStats.empty;
      const accuracyRate = evaluatedTotal > 0
        ? Math.round((baseStats.correct / evaluatedTotal) * 100)
        : (baseStats.accuracyRate || 0);

      return {
        id: student.id,
        name: student.name || 'İsimsiz Öğrenci',
        avatar: student.avatar || student.image || `https://picsum.photos/seed/${student.id}/100/100`,
        grade: exactClass,
        normalizedGroup: groupingMode === 'cohort' ? normalized : exactClass,
        branch: student.branch || (student.grade?.includes('Say') ? 'Sayısal' : student.grade?.includes('EA') ? 'Eşit Ağırlık' : 'Genel'),
        teacherId: student.teacherId || '',
        teacherName: teacherMap.get(student.teacherId) || 'Atanmadı',
        solvedQuestions: Math.round(baseStats.solvedQuestions / divisor),
        assignedQuestions: Math.round(baseStats.assignedQuestions / divisor),
        questionProgressPercent: baseStats.progressPercent,
        correct: Math.round(baseStats.correct / divisor),
        incorrect: Math.round(baseStats.incorrect / divisor),
        empty: Math.round(baseStats.empty / divisor),
        net: Math.round((baseStats.net / divisor) * 10) / 10,
        accuracyRate: accuracyRate,
        evaluatedAnswered: Math.round(evaluatedTotal / divisor),
        taskCompletionRate: calculatedTaskCompletion,
        completedTasksCount: Math.round(completedCount / divisor),
        totalTasksCount: Math.round(totalCount / divisor),
        lastTrialScore: Number(student.lastTrialScore) || 0,
        lastActive: student.lastActive || 'Aktif',
        
        programLabel,
        programDate,
        programStatus,
        totalArchivesCount: archives.length,
        programTasks: targetTasks,
        isFallbackActive
      };
    });
  }, [students, groupingMode, teacherMap, programScope, selectedArchiveIndex, includeActiveFallback]);

  // Group students strictly by their academic level or class
  const groupedRankings = useMemo(() => {
    const groups: Record<string, StudentPerformanceData[]> = {};

    enrichedStudents.forEach(st => {
      // Filter by teacher if selected
      if (selectedTeacher !== 'all' && st.teacherId !== selectedTeacher) {
        return;
      }
      // Filter by search query
      if (searchQuery.trim() && !st.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const groupKey = st.normalizedGroup;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(st);
    });

    // Sort students inside each group based on chosen metric
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (sortBy === 'solved') {
          // Primary: Solved Questions (highest first)
          if (b.solvedQuestions !== a.solvedQuestions) {
            return b.solvedQuestions - a.solvedQuestions;
          }
          // Tie-break: Accuracy rate, then net score
          if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
          if (b.net !== a.net) return b.net - a.net;
          return b.questionProgressPercent - a.questionProgressPercent;
        }
        if (sortBy === 'accuracy') {
          // Primary: Doğru / (Doğru + Yanlış) oranına göre başarı yüzdesi
          if (b.accuracyRate !== a.accuracyRate) {
            return b.accuracyRate - a.accuracyRate;
          }
          // Tie-break: Daha çok soru çözen öğrenci öncelikli
          if (b.solvedQuestions !== a.solvedQuestions) {
            return b.solvedQuestions - a.solvedQuestions;
          }
          if (b.net !== a.net) return b.net - a.net;
          return b.questionProgressPercent - a.questionProgressPercent;
        }
        if (sortBy === 'progress') {
          if (b.questionProgressPercent !== a.questionProgressPercent) {
            return b.questionProgressPercent - a.questionProgressPercent;
          }
          if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
          return b.solvedQuestions - a.solvedQuestions;
        }
        if (sortBy === 'net') {
          if (b.net !== a.net) return b.net - a.net;
          if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
          return b.solvedQuestions - a.solvedQuestions;
        }
        if (sortBy === 'trial') {
          if (b.lastTrialScore !== a.lastTrialScore) {
            return b.lastTrialScore - a.lastTrialScore;
          }
          return b.solvedQuestions - a.solvedQuestions;
        }
        if (sortBy === 'tasks') {
          if (b.taskCompletionRate !== a.taskCompletionRate) {
            return b.taskCompletionRate - a.taskCompletionRate;
          }
          return b.solvedQuestions - a.solvedQuestions;
        }
        return 0;
      });

      // Assign in-group ranking numbers
      groups[key].forEach((st, idx) => {
        st.rankInGroup = idx + 1;
      });
    });

    return groups;
  }, [enrichedStudents, selectedTeacher, searchQuery, sortBy]);

  // Overall statistics for admin dashboard
  const overallStats = useMemo(() => {
    const totalQuestionsSolved = enrichedStudents.reduce((acc, curr) => acc + curr.solvedQuestions, 0);
    const totalQuestionsAssigned = enrichedStudents.reduce((acc, curr) => acc + curr.assignedQuestions, 0);
    const totalStudents = enrichedStudents.length;
    
    // Top student overall by solved questions
    const topStudentOverall = [...enrichedStudents].sort((a, b) => b.solvedQuestions - a.solvedQuestions)[0];

    // Top student overall by accuracy rate
    const validAccuracyStudents = enrichedStudents.filter(s => s.evaluatedAnswered > 0);
    const topAccuracyStudent = [...validAccuracyStudents].sort((a, b) => {
      if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
      return b.solvedQuestions - a.solvedQuestions;
    })[0];

    // Average accuracy rate across all evaluated students
    const avgAccuracyRate = validAccuracyStudents.length > 0
      ? Math.round(validAccuracyStudents.reduce((acc, curr) => acc + curr.accuracyRate, 0) / validAccuracyStudents.length)
      : 0;

    return {
      totalQuestionsSolved,
      totalQuestionsAssigned,
      totalStudents,
      topStudentOverall,
      topAccuracyStudent,
      avgAccuracyRate,
      activeGroupCount: Object.keys(groupedRankings).length
    };
  }, [enrichedStudents, groupedRankings]);

  // Available groups for filtering
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    enrichedStudents.forEach(st => set.add(st.normalizedGroup));
    return Array.from(set).sort();
  }, [enrichedStudents]);

  // Strictly enforce admin-only view:
  if (!isAdmin) {
    return null; // Will not render for students or teachers
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest border border-outline-variant/15 p-6 sm:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Yalnızca Yönetici Paneli
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full border border-amber-300/30">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Program & Doğruluk Oranı Bazlı Sıralama
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 fill-amber-500/20 shrink-0" />
              <span>Program & Doğruluk Oranı Performans Sıralaması</span>
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Öğrencilerin bir programın hazırlanışından sonlandırılmasına kadar tamamladıkları görevler, soru çözümleri ve 
              <strong> doğru/yanlış cevap oranlarına göre başarı yüzdeleri</strong> kıyaslanır. 
              Dilediğiniz program kapsamını veya sıralama kriterini seçerek listeyi anlık güncelleyebilirsiniz.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-primary uppercase tracking-tight">Kıyaslanan Soru</p>
              <p className="text-xl sm:text-2xl font-black text-on-surface">{overallStats.totalQuestionsSolved}</p>
              <p className="text-[9px] font-bold text-on-surface-variant truncate">
                {programScope === 'latest_archived' ? '1. Sonlandırılan Program' :
                 programScope === 'active' ? 'Aktif Hafta' :
                 programScope === 'indexed_archived' ? `${selectedArchiveIndex + 1}. Program` :
                 programScope === 'all_archived_total' ? 'Tüm Arşivler' : 'Program Ortalaması'}
              </p>
            </div>

            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tight flex items-center justify-center gap-1">
                <Percent className="w-3 h-3 text-emerald-600" /> Ort. Başarı Oranı
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-800">%{overallStats.avgAccuracyRate}</p>
              <p className="text-[9px] font-bold text-on-surface-variant">Doğru / Yanlış Oranı</p>
            </div>

            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-tight">
                {sortBy === 'accuracy' ? 'En Yüksek Doğruluk' : 'Program Lideri'}
              </p>
              <p className="text-sm sm:text-base font-black text-amber-900 truncate">
                {sortBy === 'accuracy'
                  ? (overallStats.topAccuracyStudent ? overallStats.topAccuracyStudent.name : '-')
                  : (overallStats.topStudentOverall ? overallStats.topStudentOverall.name : '-')}
              </p>
              <p className="text-[9px] font-black text-amber-700">
                {sortBy === 'accuracy'
                  ? (overallStats.topAccuracyStudent ? `%${overallStats.topAccuracyStudent.accuracyRate} Başarı 🎯` : 'Veri Yok')
                  : (overallStats.topStudentOverall ? `${overallStats.topStudentOverall.solvedQuestions} Soru 🥇` : 'Veri Yok')}
              </p>
            </div>

            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-secondary uppercase tracking-tight">Kıyaslanan Sınıf</p>
              <p className="text-xl sm:text-2xl font-black text-secondary">{overallStats.activeGroupCount}</p>
              <p className="text-[9px] font-bold text-on-surface-variant">{overallStats.totalStudents} Öğrenci</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PROGRAM BAZLI KIYASLAMA SEÇİCİ (YÖNETİCİYE ÖZEL) */}
        {/* ========================================================================= */}
        <div className="mt-6 p-4 sm:p-5 bg-surface-container-lowest/90 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-on-surface flex items-center gap-1.5">
                  <span>Hangi Programa Göre Kıyaslansın?</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.2 bg-primary/10 text-primary rounded-md">
                    Program Seçimi
                  </span>
                </h4>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Bir programın öğrencide başlatılıp sonlandırılmasına (arşivlenmesine) kadar olan verileri baz alır.
                </p>
              </div>
            </div>

            {/* Fallback to Active toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded-xl border border-outline-variant/10 self-start sm:self-auto hover:text-on-surface">
              <input
                type="checkbox"
                checked={includeActiveFallback}
                onChange={(e) => setIncludeActiveFallback(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <span>Henüz sonlanmamış öğrencileri aktif programıyla dahil et</span>
            </label>
          </div>

          {/* Program Scope Selector Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setProgramScope('latest_archived')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                programScope === 'latest_archived'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Öğrencilerin en son sonlandırdıkları (1. geçmiş) haftalık programı kıyaslar"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>🏁 Son Sonlandırılan Program (1. Hafta)</span>
            </button>

            <button
              type="button"
              onClick={() => setProgramScope('active')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                programScope === 'active'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Halen üzerinde çalışılan aktif haftalık programı kıyaslar"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ Aktif Çalışılan Program (Güncel)</span>
            </button>

            <button
              type="button"
              onClick={() => setProgramScope('indexed_archived')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                programScope === 'indexed_archived'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Kaçıncı sonlandırılan programa göre kıyaslanacağını seçin"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🔢 Kaçıncı Programa Göre Kıyasla?</span>
            </button>

            <button
              type="button"
              onClick={() => setProgramScope('all_archived_total')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                programScope === 'all_archived_total'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Tüm sonlandırılmış programların toplamını kıyaslar"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>📊 Tüm Sonlandırılanlar (Kümülatif Toplam)</span>
            </button>

            <button
              type="button"
              onClick={() => setProgramScope('all_archived_avg')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                programScope === 'all_archived_avg'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
              title="Öğrencinin sonlandırdığı program başına ortalama başarıyı kıyaslar"
            >
              <Target className="w-3.5 h-3.5" />
              <span>⚖️ Program Başına Ortalama</span>
            </button>
          </div>

          {/* Sub-selector for "Kaçıncı Programa Göre Kıyasla?" */}
          {programScope === 'indexed_archived' && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-surface-container-high/60 rounded-xl border border-outline-variant/15 flex items-center gap-2 flex-wrap"
            >
              <span className="text-[11px] font-black text-on-surface flex items-center gap-1 pr-2 border-r border-outline-variant/20">
                <Clock className="w-3 h-3 text-primary" /> Program Numarasını Seçin:
              </span>
              {Array.from({ length: maxArchivesCount }).map((_, idx) => {
                const programNum = idx + 1;
                const isSelected = selectedArchiveIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedArchiveIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-secondary text-white shadow-xs'
                        : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {programNum === 1 ? '1. Program (En Son)' :
                     programNum === 2 ? '2. Program (Önceki)' :
                     `${programNum}. Program`}
                  </button>
                );
              })}
              <span className="text-[10px] text-on-surface-variant font-medium ml-auto">
                (Sistemde en fazla {maxArchivesCount} sonlandırılmış program tespit edildi)
              </span>
            </motion.div>
          )}
        </div>

        {/* Filter Controls Bar (Search + Sort Metric + Grouping Mode) */}
        <div className="mt-5 pt-5 border-t border-outline-variant/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Öğrenci adına göre ara..."
              className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sorting Metric Selector */}
            <div className="flex items-center gap-1.5 bg-surface-container-high p-1 rounded-xl border border-outline-variant/15">
              <span className="text-[10px] font-bold text-on-surface-variant px-2 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-primary" /> Sırala:
              </span>
              
              <button
                type="button"
                onClick={() => setSortBy('solved')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'solved'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="En çok soru çözen en üstte"
              >
                🎯 Çözülen Soru
              </button>

              <button
                type="button"
                onClick={() => setSortBy('accuracy')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  sortBy === 'accuracy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                }`}
                title="Doğru ve yanlışların oranına göre çıkan başarı yüzdesi sıralaması (% Doğruluk)"
              >
                <Percent className="w-3 h-3" />
                <span>Başarı Oranı (% D/Y)</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('net')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'net'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="En yüksek net sayısı"
              >
                🏆 Net
              </button>

              <button
                type="button"
                onClick={() => setSortBy('progress')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'progress'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Soru hedef tamamlama yüzdesi"
              >
                % Hedef
              </button>

              <button
                type="button"
                onClick={() => setSortBy('trial')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'trial'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Deneme sınav puanı"
              >
                📝 Deneme
              </button>

              <button
                type="button"
                onClick={() => setSortBy('tasks')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'tasks'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Görev tamamlama oranı"
              >
                ✅ % Görev
              </button>
            </div>

            {/* Grouping Mode Switch */}
            <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-outline-variant/15">
              <button
                type="button"
                onClick={() => setGroupingMode('cohort')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  groupingMode === 'cohort'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Akademik sınav seviyesine göre grupla (Örn: LGS, YKS)"
              >
                Akademik Seviye
              </button>
              <button
                type="button"
                onClick={() => setGroupingMode('exact')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  groupingMode === 'exact'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Birebir şube/sınıf adına göre grupla (Örn: 8-A, 12-A)"
              >
                Şube Bazlı
              </button>
            </div>
          </div>
        </div>

        {/* Academic Group Filter Tabs */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedGroup === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            Tüm Sınıflar & Branşlar ({availableGroups.length} Grup)
          </button>
          {availableGroups.map((grp) => {
            const count = enrichedStudents.filter(s => s.normalizedGroup === grp).length;
            return (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroup(grp)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedGroup === grp
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                <span>{grp}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Leaderboard Display (Group by Group) */}
      <div className="space-y-8">
        {Object.keys(groupedRankings).length === 0 ? (
          <div className="p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/10 space-y-3">
            <Users className="w-12 h-12 text-outline mx-auto" />
            <h4 className="text-lg font-bold text-on-surface">Kriterlere Uygun Öğrenci Bulunamadı</h4>
            <p className="text-xs text-on-surface-variant">
              Filtrelerinizi sıfırlayarak veya arama teriminizi değiştirerek tekrar deneyebilirsiniz.
            </p>
          </div>
        ) : (
          (Object.entries(groupedRankings) as [string, StudentPerformanceData[]][])
            .filter(([groupName]) => selectedGroup === 'all' || selectedGroup === groupName)
            .map(([groupName, groupStudents]) => {
              const groupTotalSolved = groupStudents.reduce((sum, s) => sum + s.solvedQuestions, 0);
              const groupAvgSolved = groupStudents.length > 0 
                ? Math.round(groupTotalSolved / groupStudents.length) 
                : 0;

              const evaluatedStudentsInGroup = groupStudents.filter(s => s.evaluatedAnswered > 0);
              const groupAvgAccuracy = evaluatedStudentsInGroup.length > 0
                ? Math.round(evaluatedStudentsInGroup.reduce((sum, s) => sum + s.accuracyRate, 0) / evaluatedStudentsInGroup.length)
                : 0;

              const champion = groupStudents[0];

              return (
                <div 
                  key={groupName}
                  className="bg-surface-container-lowest border border-outline-variant/15 rounded-[2rem] p-5 sm:p-7 shadow-xs space-y-5"
                >
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300/30">
                        <Trophy className="w-5 h-5 text-amber-600 fill-amber-500/20" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-extrabold text-on-surface tracking-tight">{groupName}</h4>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-md">
                            {groupStudents.length} Öğrenci
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 flex-wrap mt-0.5">
                          <span>Grup Ortalaması: <strong className="text-primary">{groupAvgSolved} Soru/Öğrenci</strong></span>
                          <span>•</span>
                          <span>Ort. Başarı Oranı: <strong className="text-emerald-700">%{groupAvgAccuracy}</strong></span>
                          <span>•</span>
                          <span>Toplam Çözülen: <strong className="text-on-surface">{groupTotalSolved} Soru</strong></span>
                        </p>
                      </div>
                    </div>

                    {champion && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900 text-xs font-black self-start sm:self-auto">
                        <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                        <span>
                          {sortBy === 'accuracy'
                            ? `Grup Başarı Lideri: ${champion.name} (%${champion.accuracyRate} Doğruluk)`
                            : `Grup Lideri: ${champion.name} (${champion.solvedQuestions} Soru)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Students Ranking Table / Card List */}
                  <div className="space-y-3">
                    {groupStudents.map((student, index) => {
                      const rank = index + 1;
                      const isGold = rank === 1;
                      const isSilver = rank === 2;
                      const isBronze = rank === 3;

                      return (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isGold 
                              ? 'bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.03] to-surface-container-lowest border-amber-300/60 shadow-xs' 
                              : isSilver 
                              ? 'bg-gradient-to-r from-slate-400/[0.08] via-slate-400/[0.02] to-surface-container-lowest border-slate-300/60 shadow-2xs'
                              : isBronze 
                              ? 'bg-gradient-to-r from-amber-700/[0.06] via-amber-700/[0.02] to-surface-container-lowest border-amber-600/30 shadow-2xs'
                              : 'bg-surface-container-lowest hover:bg-surface-container-low/60 border-outline-variant/10'
                          }`}
                        >
                          {/* Left: Rank & Student Identity & Program Status Badge */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Rank Badge */}
                            <div className="shrink-0 flex items-center justify-center">
                              {isGold ? (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/30">
                                  🥇 1
                                </div>
                              ) : isSilver ? (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                                  🥈 2
                                </div>
                              ) : isBronze ? (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-sm flex items-center justify-center shadow-sm">
                                  🥉 3
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface-variant font-black text-xs flex items-center justify-center border border-outline-variant/10">
                                  #{rank}
                                </div>
                              )}
                            </div>

                            {/* Avatar */}
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-11 h-11 rounded-full object-cover border border-outline-variant/20 shrink-0 shadow-2xs"
                              referrerPolicy="no-referrer"
                            />

                            {/* Info */}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-sm font-extrabold text-on-surface truncate">{student.name}</h5>
                                {isGold && (
                                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md border border-amber-300/40">
                                    Grup Şampiyonu
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-[11px] text-on-surface-variant font-medium flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-primary">{student.grade}</span>
                                <span>•</span>
                                <span>Öğretmen: <strong>{student.teacherName}</strong></span>
                              </p>

                              {/* Program Info Pill */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  student.programStatus === 'archived'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300/40'
                                    : student.isFallbackActive
                                    ? 'bg-amber-50 text-amber-800 border-amber-300/40'
                                    : student.programStatus === 'active'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300/40'
                                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                                }`}>
                                  <FileText className="w-3 h-3" />
                                  <span>{student.programLabel}</span>
                                  {student.programDate !== '-' && (
                                    <span className="font-semibold opacity-75">({student.programDate})</span>
                                  )}
                                </span>

                                <span className="text-[10px] font-medium text-on-surface-variant px-1.5 py-0.2 rounded bg-surface-container-high">
                                  {student.totalArchivesCount} Arşivli Program
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Performance Data Metrics */}
                          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/10">
                            {/* Questions Solved */}
                            <div className="text-left md:text-right min-w-[95px]">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight flex items-center md:justify-end gap-1">
                                <Target className="w-3 h-3 text-primary" /> Çözülen Soru
                              </p>
                              <p className={`text-base sm:text-lg font-black ${isGold && sortBy === 'solved' ? 'text-amber-700' : 'text-on-surface'}`}>
                                {student.solvedQuestions} Soru
                              </p>
                              <p className="text-[10px] font-bold text-primary">
                                {student.assignedQuestions > 0 ? `Hedef: ${student.assignedQuestions} Soru` : 'Serbest Çalışma'}
                              </p>
                            </div>

                            {/* BAŞARI ORANI (DOĞRU / YANLIŞ ORANINA GÖRE ÇIKAN BAŞARI YÜZDESİ) */}
                            <div className="min-w-[110px] text-left md:text-right">
                              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight flex items-center md:justify-end gap-1">
                                <Percent className="w-3 h-3 text-emerald-600" /> Başarı Oranı
                              </p>
                              <p className={`text-base sm:text-lg font-black ${
                                student.accuracyRate >= 85 ? 'text-emerald-700' :
                                student.accuracyRate >= 70 ? 'text-primary' :
                                student.accuracyRate >= 50 ? 'text-amber-700' :
                                student.accuracyRate > 0 ? 'text-rose-700' : 'text-on-surface-variant'
                              }`}>
                                {student.evaluatedAnswered > 0 ? `%${student.accuracyRate}` : '-'}
                              </p>
                              <div className="w-18 bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1 md:ml-auto">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    student.accuracyRate >= 85 ? 'bg-emerald-500' :
                                    student.accuracyRate >= 70 ? 'bg-primary' :
                                    student.accuracyRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, student.accuracyRate)}%` }}
                                />
                              </div>
                              <p className="text-[9px] font-bold text-on-surface-variant mt-0.5">
                                {student.evaluatedAnswered > 0 
                                  ? `${student.correct}D / ${student.evaluatedAnswered} Soru`
                                  : 'Sonuç bekleniyor'}
                              </p>
                            </div>

                            {/* Target Progress Bar & Percent */}
                            <div className="min-w-[95px] text-left md:text-right">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Hedef Başarısı</p>
                              <p className="text-sm font-black text-tertiary">
                                %{student.questionProgressPercent}
                              </p>
                              <div className="w-16 bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1 md:ml-auto">
                                <div 
                                  className={`h-full rounded-full ${isGold ? 'bg-amber-500' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(100, student.questionProgressPercent)}%` }}
                                />
                              </div>
                            </div>

                            {/* Detailed Stats (Doğru / Yanlış / Net) */}
                            <div className="min-w-[110px] text-left md:text-right hidden sm:block">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Soru Dökümü & Net</p>
                              <p className="text-xs font-black text-on-surface">
                                <span className="text-emerald-700">{student.correct}D</span> • <span className="text-rose-700">{student.incorrect}Y</span> • <span className="text-amber-700">{student.empty}B</span>
                              </p>
                              <p className="text-[10px] font-bold text-emerald-800">
                                Net: <strong>{student.net}</strong>
                              </p>
                            </div>

                            {/* Trial Score */}
                            <div className="text-left md:text-right min-w-[70px]">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Son Deneme</p>
                              <p className="text-xs sm:text-sm font-black text-secondary">
                                {student.lastTrialScore > 0 ? student.lastTrialScore : '-'}
                              </p>
                              <p className="text-[9px] font-medium text-on-surface-variant">Puan / Net</p>
                            </div>

                            {/* Actions: Inspect Program & Open Portal */}
                            <div className="flex items-center gap-1">
                              {student.programTasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProgramModal({
                                      student,
                                      tasks: student.programTasks,
                                      title: student.programLabel,
                                      date: student.programDate,
                                      completionRate: student.taskCompletionRate
                                    });
                                  }}
                                  className="p-2 text-primary hover:text-primary-dark hover:bg-primary/10 rounded-xl transition-all"
                                  title="Bu sonlandırılan programın tüm görevlerini ve doğru/yanlışlarını incele"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}

                              <Link
                                to={`/portal?studentId=${student.id}`}
                                className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-all"
                                title="Öğrencinin Portalı & Canlı Çalışma Programını İncele"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Program Tasks Inspection Modal */}
      <AnimatePresence>
        {selectedProgramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedProgramModal.student.avatar}
                    alt={selectedProgramModal.student.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-outline-variant/20 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-on-surface truncate">
                        {selectedProgramModal.student.name}
                      </h3>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        {selectedProgramModal.student.grade}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      {selectedProgramModal.title} • Tarih: <strong>{selectedProgramModal.date}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProgramModal(null)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Program Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 border-b border-outline-variant/10">
                <div className="p-3 bg-surface-container-high rounded-xl text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Çözülen Soru</p>
                  <p className="text-lg font-black text-primary">{selectedProgramModal.student.solvedQuestions}</p>
                  <p className="text-[10px] text-on-surface-variant">Hedef: {selectedProgramModal.student.assignedQuestions}</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-200/50">
                  <p className="text-[10px] font-black text-emerald-800 uppercase flex items-center justify-center gap-0.5">
                    <Percent className="w-3 h-3" /> Başarı Oranı
                  </p>
                  <p className="text-lg font-black text-emerald-700">%{selectedProgramModal.student.accuracyRate}</p>
                  <p className="text-[10px] text-emerald-800 font-bold">{selectedProgramModal.student.correct}D / {selectedProgramModal.student.evaluatedAnswered} Soru</p>
                </div>

                <div className="p-3 bg-surface-container-high rounded-xl text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Doğru / Yanlış / Boş</p>
                  <p className="text-sm font-black text-on-surface">
                    <span className="text-emerald-700">{selectedProgramModal.student.correct}D</span> • <span className="text-rose-700">{selectedProgramModal.student.incorrect}Y</span> • <span className="text-amber-700">{selectedProgramModal.student.empty}B</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-800">Net: {selectedProgramModal.student.net}</p>
                </div>

                <div className="p-3 bg-surface-container-high rounded-xl text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Görev Tamamlama</p>
                  <p className="text-lg font-black text-secondary">%{selectedProgramModal.completionRate}</p>
                  <p className="text-[10px] text-on-surface-variant">{selectedProgramModal.tasks.filter(t => t.completed).length} / {selectedProgramModal.tasks.length} Görev</p>
                </div>

                <div className="p-3 bg-surface-container-high rounded-xl text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Hedef Başarısı</p>
                  <p className="text-lg font-black text-amber-700">%{selectedProgramModal.student.questionProgressPercent}</p>
                  <p className="text-[10px] text-on-surface-variant">Soru Hedefi</p>
                </div>
              </div>

              {/* Modal Tasks List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
                <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider flex items-center gap-1.5 mb-2">
                  <CheckSquare className="w-3.5 h-3.5 text-primary" /> Programdaki Tüm Görevler ({selectedProgramModal.tasks.length} Adet)
                </h4>

                {selectedProgramModal.tasks.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-6 text-center">
                    Bu programa ait kayıtlı görev detayı bulunamadı.
                  </p>
                ) : (
                  selectedProgramModal.tasks.map((task: any, idx: number) => {
                    const isQuestion = task.type === 'question' || task.type === 'test' || (!task.type && (task.amount || task.correct !== undefined));
                    const isVideo = task.type === 'video';
                    const isReading = task.type === 'reading' || task.type === 'book';

                    const taskAnswered = (task.correct || 0) + (task.incorrect || 0);
                    const taskAccuracy = taskAnswered > 0 ? Math.round(((task.correct || 0) / taskAnswered) * 100) : 0;

                    return (
                      <div
                        key={task.id || idx}
                        className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            task.completed 
                              ? 'bg-emerald-500/10 text-emerald-700' 
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {task.completed ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-on-surface truncate">{task.title || task.subject}</span>
                              {task.day && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-surface-container-high text-on-surface-variant rounded">
                                  {task.day}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-primary/10 text-primary rounded">
                                {task.subject}
                              </span>
                            </div>
                            {task.topic && (
                              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                                Konu: {task.topic}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Task Result Badges */}
                        <div className="shrink-0 text-right space-y-0.5">
                          {task.amount && (
                            <span className="text-[11px] font-bold text-on-surface block">
                              {task.amount}
                            </span>
                          )}

                          {isQuestion && (task.correct !== undefined || task.incorrect !== undefined) && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-emerald-800 block">
                                {task.correct || 0}D • {task.incorrect || 0}Y • Net: {task.net ?? ((task.correct || 0) - (task.incorrect || 0) / 4)}
                              </span>
                              {taskAnswered > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 inline-block">
                                  %{taskAccuracy} Başarı
                                </span>
                              )}
                            </div>
                          )}

                          {isVideo && (
                            <span className="text-[10px] font-bold text-blue-700 block">
                              Konu Anlatım Videosu
                            </span>
                          )}

                          {isReading && (
                            <span className="text-[10px] font-bold text-purple-700 block">
                              Kitap Okuma Görevi
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-outline-variant/15 flex items-center justify-between gap-3">
                <Link
                  to={`/portal?studentId=${selectedProgramModal.student.id}`}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Öğrencinin Canlı Portalına Git</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedProgramModal(null)}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold rounded-xl text-xs transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Footnote */}
      <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-xs text-on-surface-variant flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Yönetici Notu:</strong> Bu performans ve sıralama ekranı <em>yalnızca yöneticilere özeldir</em>. 
          Öğrenciler ve veliler kendi portallarında bu kıyaslama tablosunu veya diğer öğrencilerin derecelerini göremezler. 
          Sıralama program bazlı yapılmakta olup, çözülen sorularda <strong>doğru ve yanlışların oranına göre hesaplanan Başarı Oranı (% D/Y)</strong> kriteriyle de öğrenciler sıralanabilmektedir.
        </p>
      </div>
    </div>
  );
}
