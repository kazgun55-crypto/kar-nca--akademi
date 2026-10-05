import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Medal, Award, Crown, Flame, Target, Users, TrendingUp, Sparkles, 
  Search, ArrowUpDown, Filter, ChevronRight, ExternalLink, ShieldCheck, 
  CheckCircle2, AlertCircle, BarChart3, Layers, BookOpen, Clock, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { calculateWeeklyQuestionStats } from '../lib/utils';
import { subscribeStudents, subscribeTeachers } from '../lib/firestoreService';

export interface StudentLeaderboardProps {
  embedded?: boolean; // When embedded inside Dashboard.tsx
  initialGroupFilter?: string;
}

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
  taskCompletionRate: number;
  completedTasksCount: number;
  totalTasksCount: number;
  lastTrialScore: number;
  lastActive?: string;
  rankInGroup?: number;
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
  const [sortBy, setSortBy] = useState<'solved' | 'progress' | 'net' | 'trial' | 'tasks'>('solved');
  const [groupingMode, setGroupingMode] = useState<'cohort' | 'exact'>('cohort');

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

  // Compute performance metrics for all students
  const enrichedStudents: StudentPerformanceData[] = useMemo(() => {
    return students.map(student => {
      const tasks = (Array.isArray(student.tasks) && student.tasks.length > 0)
        ? student.tasks
        : JSON.parse(localStorage.getItem(`tasks_${student.id}`) || '[]');

      const stats = calculateWeeklyQuestionStats(
        tasks, 
        Number(student.weeklyQuestionTarget || student.weeklyQuestionGoal) || undefined
      );

      const completedCount = tasks.filter((t: any) => t.completed).length;
      const totalCount = tasks.length;
      const taskCompletion = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100) 
        : (student.completion || 0);

      const normalized = getNormalizedAcademicGroup(student.grade);
      const exactClass = student.grade || 'Belirtilmedi';

      return {
        id: student.id,
        name: student.name || 'İsimsiz Öğrenci',
        avatar: student.avatar || student.image || `https://picsum.photos/seed/${student.id}/100/100`,
        grade: exactClass,
        normalizedGroup: groupingMode === 'cohort' ? normalized : exactClass,
        branch: student.branch || (student.grade?.includes('Say') ? 'Sayısal' : student.grade?.includes('EA') ? 'Eşit Ağırlık' : 'Genel'),
        teacherId: student.teacherId || '',
        teacherName: teacherMap.get(student.teacherId) || 'Atanmadı',
        solvedQuestions: stats.solvedQuestions,
        assignedQuestions: stats.assignedQuestions,
        questionProgressPercent: stats.progressPercent,
        correct: stats.correct,
        incorrect: stats.incorrect,
        empty: stats.empty,
        net: stats.net,
        taskCompletionRate: taskCompletion,
        completedTasksCount: completedCount,
        totalTasksCount: totalCount,
        lastTrialScore: Number(student.lastTrialScore) || 0,
        lastActive: student.lastActive || 'Aktif',
      };
    });
  }, [students, groupingMode, teacherMap]);

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
          // Tie-break: Net score
          if (b.net !== a.net) return b.net - a.net;
          return b.questionProgressPercent - a.questionProgressPercent;
        }
        if (sortBy === 'progress') {
          if (b.questionProgressPercent !== a.questionProgressPercent) {
            return b.questionProgressPercent - a.questionProgressPercent;
          }
          return b.solvedQuestions - a.solvedQuestions;
        }
        if (sortBy === 'net') {
          if (b.net !== a.net) return b.net - a.net;
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
    
    // Top student overall
    const topStudentOverall = [...enrichedStudents].sort((a, b) => b.solvedQuestions - a.solvedQuestions)[0];

    return {
      totalQuestionsSolved,
      totalQuestionsAssigned,
      totalStudents,
      topStudentOverall,
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
                Yalnızca Yönetici Görünümü
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-full border border-amber-300/30">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Sınıf & Branş İçi Performans Sıralaması
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 fill-amber-500/20 shrink-0" />
              <span>Öğrenci Soru Çözüm & Başarı Sıralaması</span>
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl font-medium leading-relaxed">
              Her öğrenci yalnızca <strong>kendi sınıf seviyesi ve branşındaki akranlarıyla</strong> adil bir şekilde kıyaslanır. 
              Soru çözme adetleri, tamamlama oranları ve net başarıları gerçek zamanlı Firestore verileriyle sıralanır.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-primary uppercase tracking-tight">Toplam Çözülen</p>
              <p className="text-xl sm:text-2xl font-black text-on-surface">{overallStats.totalQuestionsSolved}</p>
              <p className="text-[9px] font-bold text-on-surface-variant">Soru (Aktif Hafta)</p>
            </div>

            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-tight">Haftanın Lideri</p>
              <p className="text-sm sm:text-base font-black text-amber-900 truncate">
                {overallStats.topStudentOverall ? overallStats.topStudentOverall.name : '-'}
              </p>
              <p className="text-[9px] font-black text-amber-700">
                {overallStats.topStudentOverall ? `${overallStats.topStudentOverall.solvedQuestions} Soru 🥇` : 'Veri Yok'}
              </p>
            </div>

            <div className="p-3.5 bg-surface-container-high/80 backdrop-blur-sm rounded-2xl border border-outline-variant/10 text-center space-y-0.5 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-black text-secondary uppercase tracking-tight">Kıyaslanan Sınıf</p>
              <p className="text-xl sm:text-2xl font-black text-secondary">{overallStats.activeGroupCount}</p>
              <p className="text-[9px] font-bold text-on-surface-variant">{overallStats.totalStudents} Aktif Öğrenci</p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-6 border-t border-outline-variant/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 flex-wrap">
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
                onClick={() => setSortBy('progress')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sortBy === 'progress'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Soru tamamlama yüzdesi"
              >
                % Hedef
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
                Net
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
                Deneme
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

        {/* Group Filter Tabs */}
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
                        <p className="text-xs text-on-surface-variant font-medium">
                          Grup Ortalaması: <strong className="text-primary">{groupAvgSolved} Soru/Öğrenci</strong> • Toplam Çözülen: <strong className="text-on-surface">{groupTotalSolved} Soru</strong>
                        </p>
                      </div>
                    </div>

                    {champion && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900 text-xs font-black self-start sm:self-auto">
                        <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
                        <span>Grup Lideri: {champion.name} ({champion.solvedQuestions} Soru)</span>
                      </div>
                    )}
                  </div>

                  {/* Students Ranking Table / Card List */}
                  <div className="space-y-2.5">
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
                          {/* Left: Rank & Student Identity */}
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
                              className="w-10 h-10 rounded-full object-cover border border-outline-variant/20 shrink-0 shadow-2xs"
                              referrerPolicy="no-referrer"
                            />

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-sm font-extrabold text-on-surface truncate">{student.name}</h5>
                                {isGold && (
                                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md border border-amber-300/40">
                                    Grup Şampiyonu
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-medium flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="font-semibold text-primary">{student.grade}</span>
                                <span>•</span>
                                <span>Öğretmen: <strong>{student.teacherName}</strong></span>
                              </p>
                            </div>
                          </div>

                          {/* Right: Performance Data Metrics */}
                          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/10">
                            {/* Questions Solved (Primary Key) */}
                            <div className="text-left md:text-right min-w-[100px]">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight flex items-center md:justify-end gap-1">
                                <Target className="w-3 h-3 text-primary" /> Çözülen Soru
                              </p>
                              <p className={`text-base sm:text-lg font-black ${isGold ? 'text-amber-700' : 'text-on-surface'}`}>
                                {student.solvedQuestions} Soru
                              </p>
                              <p className="text-[10px] font-bold text-primary">
                                {student.assignedQuestions > 0 ? `Hedef: ${student.assignedQuestions} Soru` : 'Serbest Çalışma'}
                              </p>
                            </div>

                            {/* Target Progress Bar & Percent */}
                            <div className="min-w-[100px] text-left md:text-right">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Hedef Başarısı</p>
                              <p className="text-sm font-black text-tertiary">
                                %{student.questionProgressPercent}
                              </p>
                              <div className="w-20 bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1 md:ml-auto">
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
                                <span className="text-emerald-700">{student.correct}D</span> • <span className="text-rose-700">{student.incorrect}Y</span>
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

                            {/* View Student Portal Button */}
                            <Link
                              to={`/portal?studentId=${student.id}`}
                              className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-all"
                              title="Öğrencinin Portalı & Çalışma Programını İncele"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
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

      {/* Info Footnote */}
      <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-xs text-on-surface-variant flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Yönetici Notu:</strong> Bu performans ve sıralama ekranı <em>yalnızca yöneticilere özeldir</em>. 
          Öğrenciler kendi portallarında bu kıyaslama tablosunu veya diğer öğrencilerin derecelerini göremezler. 
          Soru sayıları hesaplanırken kitap okuma sayfaları ve konu videoları elenerek yalnızca soru ve branş denemesi çözümleri esas alınmıştır.
        </p>
      </div>
    </div>
  );
}
