import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Target, 
  BookOpen, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Percent, 
  Award, 
  Sparkles, 
  BarChart3, 
  Clock, 
  FileText, 
  ArrowRight,
  HelpCircle,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  getSubjectsForGrade, 
  getGradeCategory, 
  Subject 
} from '../lib/curriculum';
import { calculateNetScore } from '../lib/utils';
import { getStudentTrials, saveStudentTrials } from '../lib/firestoreService';

export interface DetailedTrialResult {
  id: string;
  date: string;
  title?: string;
  name?: string;
  gradeLabel?: string;
  totalNet: number;
  totalQuestions?: number;
  results: {
    [subject: string]: {
      correct: number;
      incorrect: number;
      empty?: number;
      net?: number;
      wrongTopics?: { topic: string; count: number }[];
    };
  };
}

export interface SimpleTrialResult {
  id: string;
  date: string;
  score: number;
  title?: string;
  totalQuestions?: number;
}

interface StudentTrialAnalysisProps {
  student: {
    id: string;
    name: string;
    grade: string;
    avatar?: string;
    lastTrialScore?: number;
  };
  onAssignTopicTask?: (subject: string, topic: string) => void;
  onTrialUpdated?: () => void;
  showToast: (msg: string) => void;
}

const SUBJECT_COLORS = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'
];

export function StudentTrialAnalysis({
  student,
  onAssignTopicTask,
  onTrialUpdated,
  showToast
}: StudentTrialAnalysisProps) {
  const [detailedTrials, setDetailedTrials] = useState<DetailedTrialResult[]>([]);
  const [simpleTrials, setSimpleTrials] = useState<SimpleTrialResult[]>([]);
  const [selectedTrialDetail, setSelectedTrialDetail] = useState<DetailedTrialResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state for adding new trial
  const [newTrialTitle, setNewTrialTitle] = useState('');
  const [newTrialDate, setNewTrialDate] = useState(() => new Date().toLocaleDateString('tr-TR'));
  const [newTrialResults, setNewTrialResults] = useState<{
    [subject: string]: {
      correct: number;
      incorrect: number;
      empty: number;
      wrongTopics: string[];
    };
  }>({});

  const gradeCategory = getGradeCategory(student.grade);
  const penalty = gradeCategory === '8' ? 3 : 4; // 3 wrong = 1 correct for LGS, 4 for YKS
  const availableSubjects = useMemo(() => getSubjectsForGrade(student.grade), [student.grade]);

  // Load trials on mount and when student changes
  useEffect(() => {
    if (!student?.id) return;

    // 1. Initial read from localStorage
    try {
      const cachedDetailed = localStorage.getItem(`trial_results_detailed_${student.id}`);
      const cachedSimple = localStorage.getItem(`trial_results_${student.id}`);
      if (cachedDetailed) {
        setDetailedTrials(JSON.parse(cachedDetailed));
      }
      if (cachedSimple) {
        setSimpleTrials(JSON.parse(cachedSimple));
      }
    } catch {}

    // 2. Fetch fresh trials from Firestore
    getStudentTrials(student.id).then((cloud) => {
      if (cloud.detailedTrials && cloud.detailedTrials.length > 0) {
        setDetailedTrials(cloud.detailedTrials);
        localStorage.setItem(`trial_results_detailed_${student.id}`, JSON.stringify(cloud.detailedTrials));
      }
      if (cloud.simpleTrials && cloud.simpleTrials.length > 0) {
        setSimpleTrials(cloud.simpleTrials);
        localStorage.setItem(`trial_results_${student.id}`, JSON.stringify(cloud.simpleTrials));
      } else if (cloud.detailedTrials && cloud.detailedTrials.length > 0) {
        const mapped = cloud.detailedTrials.map((t: any) => ({
          id: t.id,
          date: t.date,
          score: t.totalNet,
          title: t.title || t.name || 'Genel Deneme',
          totalQuestions: t.totalQuestions || 100
        }));
        setSimpleTrials(mapped);
      }
    }).catch((err) => console.warn('Could not load student trials:', err));
  }, [student.id]);

  // Open Add Modal and initialize subjects
  const handleOpenAddModal = () => {
    const initialResults: any = {};
    availableSubjects.forEach((s) => {
      initialResults[s.name] = {
        correct: 0,
        incorrect: 0,
        empty: 0,
        wrongTopics: []
      };
    });
    setNewTrialResults(initialResults);
    setNewTrialTitle('');
    setNewTrialDate(new Date().toLocaleDateString('tr-TR'));
    setShowAddModal(true);
  };

  // Live calculation of Total Net in Form
  const liveFormTotalNet = useMemo(() => {
    let sum = 0;
    Object.values(newTrialResults).forEach((r: any) => {
      const c = Number(r?.correct) || 0;
      const inc = Number(r?.incorrect) || 0;
      const net = Math.max(0, c - (inc / penalty));
      sum += net;
    });
    return Number(sum.toFixed(2));
  }, [newTrialResults, penalty]);

  const liveFormTotalQuestions = useMemo(() => {
    let sum = 0;
    Object.values(newTrialResults).forEach((r: any) => {
      const c = Number(r?.correct) || 0;
      const inc = Number(r?.incorrect) || 0;
      const emp = Number(r?.empty) || 0;
      sum += (c + inc + emp);
    });
    return sum;
  }, [newTrialResults]);

  // Save New Trial
  const handleSaveTrial = async () => {
    if (!newTrialTitle.trim()) {
      showToast('Lütfen deneme sınavı adını girin (Örn: Özdebir LGS-1).');
      return;
    }

    const cleanedResults: any = {};
    Object.entries(newTrialResults).forEach(([subName, res]: [string, any]) => {
      const c = Math.max(0, Number(res?.correct) || 0);
      const inc = Math.max(0, Number(res?.incorrect) || 0);
      const emp = Math.max(0, Number(res?.empty) || 0);
      const subjectNet = Math.max(0, Number((c - (inc / penalty)).toFixed(2)));

      cleanedResults[subName] = {
        correct: c,
        incorrect: inc,
        empty: emp,
        net: subjectNet,
        wrongTopics: (res?.wrongTopics || []).map((t: string) => ({ topic: t, count: 1 }))
      };
    });

    const newDetailed: DetailedTrialResult = {
      id: 'trial_' + Date.now(),
      date: newTrialDate || new Date().toLocaleDateString('tr-TR'),
      title: newTrialTitle.trim(),
      gradeLabel: student.grade,
      totalNet: liveFormTotalNet,
      totalQuestions: liveFormTotalQuestions > 0 ? liveFormTotalQuestions : 100,
      results: cleanedResults
    };

    const newSimple: SimpleTrialResult = {
      id: newDetailed.id,
      date: newDetailed.date,
      title: newDetailed.title,
      score: newDetailed.totalNet,
      totalQuestions: newDetailed.totalQuestions
    };

    const updatedDetailed = [newDetailed, ...detailedTrials];
    const updatedSimple = [newSimple, ...simpleTrials];

    setDetailedTrials(updatedDetailed);
    setSimpleTrials(updatedSimple);

    // Save to Firestore and local storage
    await saveStudentTrials(student.id, updatedDetailed, updatedSimple);

    setShowAddModal(false);
    showToast('Deneme sınavı başarıyla kaydedildi ve analiz güncellendi! 🎯');
    if (onTrialUpdated) onTrialUpdated();
  };

  // Delete Trial
  const handleDeleteTrial = async (trialId: string) => {
    const updatedDetailed = detailedTrials.filter((t) => t.id !== trialId);
    const updatedSimple = simpleTrials.filter((t) => t.id !== trialId);

    setDetailedTrials(updatedDetailed);
    setSimpleTrials(updatedSimple);

    await saveStudentTrials(student.id, updatedDetailed, updatedSimple);
    setDeleteConfirmId(null);
    if (selectedTrialDetail?.id === trialId) setSelectedTrialDetail(null);
    showToast('Deneme sınavı kaydı silindi.');
    if (onTrialUpdated) onTrialUpdated();
  };

  // Metrics & KPI calculations
  const kpis = useMemo(() => {
    if (detailedTrials.length === 0 && simpleTrials.length === 0) {
      return {
        count: 0,
        latestNet: 0,
        latestTitle: '-',
        latestDate: '-',
        avgNet: 0,
        maxNet: 0,
        netTrend: 0,
        accuracyRate: 0
      };
    }

    // Use detailedTrials if available, otherwise simpleTrials
    const nets = detailedTrials.length > 0 
      ? detailedTrials.map((t) => Number(t.totalNet) || 0)
      : simpleTrials.map((t) => Number(t.score) || 0);

    const latest = detailedTrials.length > 0 ? detailedTrials[0] : null;
    const latestSimple = simpleTrials.length > 0 ? simpleTrials[0] : null;

    const latestNet = latest ? latest.totalNet : (latestSimple ? latestSimple.score : 0);
    const latestTitle = latest?.title || latestSimple?.title || 'Genel Deneme';
    const latestDate = latest?.date || latestSimple?.date || '-';

    const sumNet = nets.reduce((acc, curr) => acc + curr, 0);
    const avgNet = nets.length > 0 ? Number((sumNet / nets.length).toFixed(2)) : 0;
    const maxNet = nets.length > 0 ? Math.max(...nets) : 0;

    // Trend: difference between latest trial and the trial before it
    let netTrend = 0;
    if (nets.length >= 2) {
      netTrend = Number((nets[0] - nets[1]).toFixed(2));
    }

    // Overall accuracy from detailed trials
    let totalC = 0;
    let totalInc = 0;
    detailedTrials.forEach((t) => {
      Object.values(t.results || {}).forEach((subRes: any) => {
        totalC += (Number(subRes.correct) || 0);
        totalInc += (Number(subRes.incorrect) || 0);
      });
    });
    const totalAnswered = totalC + totalInc;
    const accuracyRate = totalAnswered > 0 ? Math.round((totalC / totalAnswered) * 100) : 0;

    return {
      count: Math.max(detailedTrials.length, simpleTrials.length),
      latestNet,
      latestTitle,
      latestDate,
      avgNet,
      maxNet,
      netTrend,
      accuracyRate
    };
  }, [detailedTrials, simpleTrials]);

  // Chart Data: chronologically sorted (earliest to latest)
  const chartData = useMemo(() => {
    const list = detailedTrials.length > 0
      ? [...detailedTrials].reverse()
      : [...simpleTrials].reverse();

    return list.map((t: any, idx) => ({
      name: t.date ? `${t.date}` : `Deneme ${idx + 1}`,
      title: t.title || `Deneme ${idx + 1}`,
      net: Number((t.totalNet ?? t.score ?? 0).toFixed(2)),
      avg: kpis.avgNet
    }));
  }, [detailedTrials, simpleTrials, kpis.avgNet]);

  // Subject Performance Aggregation across all detailed trials
  const subjectStats = useMemo(() => {
    const map: {
      [subject: string]: {
        totalCorrect: number;
        totalIncorrect: number;
        totalEmpty: number;
        totalNet: number;
        trialsCount: number;
        latestNet: number;
      };
    } = {};

    detailedTrials.forEach((trial, trialIndex) => {
      Object.entries(trial.results || {}).forEach(([subName, res]: [string, any]) => {
        if (!map[subName]) {
          map[subName] = {
            totalCorrect: 0,
            totalIncorrect: 0,
            totalEmpty: 0,
            totalNet: 0,
            trialsCount: 0,
            latestNet: 0
          };
        }
        const c = Number(res.correct) || 0;
        const inc = Number(res.incorrect) || 0;
        const emp = Number(res.empty) || 0;
        const net = typeof res.net === 'number' ? res.net : Math.max(0, c - (inc / penalty));

        map[subName].totalCorrect += c;
        map[subName].totalIncorrect += inc;
        map[subName].totalEmpty += emp;
        map[subName].totalNet += net;
        map[subName].trialsCount += 1;
        if (trialIndex === 0) {
          map[subName].latestNet = Number(net.toFixed(2));
        }
      });
    });

    return Object.entries(map).map(([subject, data]) => {
      const avgNet = data.trialsCount > 0 ? Number((data.totalNet / data.trialsCount).toFixed(2)) : 0;
      const totalAnswered = data.totalCorrect + data.totalIncorrect;
      const accuracy = totalAnswered > 0 ? Math.round((data.totalCorrect / totalAnswered) * 100) : 0;
      return {
        subject,
        avgNet,
        latestNet: data.latestNet,
        totalCorrect: data.totalCorrect,
        totalIncorrect: data.totalIncorrect,
        totalEmpty: data.totalEmpty,
        accuracy,
        trialsCount: data.trialsCount
      };
    }).sort((a, b) => b.avgNet - a.avgNet);
  }, [detailedTrials, penalty]);

  // Wrong Topics Aggregation across all detailed trials
  const wrongTopicsAggregation = useMemo(() => {
    const topicMap: { [key: string]: { topic: string; subject: string; count: number } } = {};

    detailedTrials.forEach((trial) => {
      Object.entries(trial.results || {}).forEach(([subject, res]: [string, any]) => {
        const wtList = res.wrongTopics || [];
        wtList.forEach((wt: any) => {
          const tName = typeof wt === 'string' ? wt : wt.topic;
          const key = `${subject}_${tName}`;
          if (!topicMap[key]) {
            topicMap[key] = { topic: tName, subject, count: 0 };
          }
          topicMap[key].count += (wt.count || 1);
        });
      });
    });

    return Object.values(topicMap).sort((a, b) => b.count - a.count);
  }, [detailedTrials]);

  return (
    <div className="space-y-8">
      {/* 1. Header & Actions Bar */}
      <div className="bg-gradient-to-r from-primary/10 via-surface-container-low to-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-primary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Deneme Takip & Gelişim Analizi
            </span>
            <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full">
              {student.grade} Seviyesi
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <span>{student.name} - Deneme Karnesi & Net Analizi</span>
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl font-medium leading-relaxed">
            Öğrencinin girdiği tüm deneme sınavlarının net artış/azalış eğrisi, ders bazlı dökümü ve sık hata yaptığı konular burada listelenir.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Deneme Sınavı Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (5 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Son Deneme Neti */}
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-on-surface-variant">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Son Deneme Neti</p>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-on-surface">
            {kpis.latestNet.toFixed(2)}
          </p>
          <p className="text-[10px] text-on-surface-variant font-bold truncate">
            {kpis.latestTitle} • {kpis.latestDate}
          </p>
        </div>

        {/* Ortalama Net */}
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <p className="text-[10px] font-black uppercase tracking-wider text-secondary">Ortalama Net</p>
            <BarChart3 className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-secondary">
            {kpis.avgNet.toFixed(2)}
          </p>
          <p className="text-[10px] text-on-surface-variant font-medium">
            {kpis.count} Sınavın Ortalaması
          </p>
        </div>

        {/* En Yüksek Net (Zirve Rekoru) */}
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Zirve Net (Rekor)</p>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-800">
            {kpis.maxNet.toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-700 font-bold">
            En Yüksek Başarı 🏆
          </p>
        </div>

        {/* Net Değişimi & Trend */}
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <p className="text-[10px] font-black uppercase tracking-wider">Net Gelişimi</p>
            {kpis.netTrend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${
            kpis.netTrend >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {kpis.netTrend >= 0 ? `+${kpis.netTrend.toFixed(2)}` : `${kpis.netTrend.toFixed(2)}`}
          </p>
          <p className="text-[10px] text-on-surface-variant font-medium">
            Önceki Denemeye Göre
          </p>
        </div>

        {/* Başarı / Doğruluk Oranı */}
        <div className="p-5 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Başarı Oranı</p>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800">
            %{kpis.accuracyRate}
          </p>
          <p className="text-[10px] text-on-surface-variant font-medium">
            Doğru / Cevaplanan Soru
          </p>
        </div>
      </div>

      {/* 3. Net Gelişim Trendi Grafiği (LineChart / AreaChart) */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/10">
          <div>
            <h4 className="text-lg font-black text-on-surface flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Zaman İçinde Net Gelişim Eğrisi</span>
            </h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Öğrencinin her bir deneme sınavındaki toplam net artışını gösteren kronolojik takip grafiği.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary" /> Net Puanı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-secondary rounded-full" /> Ortalama ({kpis.avgNet.toFixed(1)})
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h5 className="text-base font-bold text-on-surface">Henüz Kayıtlı Deneme Sınavı Yok</h5>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Öğrenciye ait ilk deneme sınavını girmek için yukarıdaki "Yeni Deneme Sınavı Ekle" butonuna tıklayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="trialNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fontWeight: 'bold' }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fontWeight: 'bold' }} 
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-xl space-y-1">
                          <p className="text-xs font-black text-on-surface">{data.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium">Tarih: {data.name}</p>
                          <p className="text-sm font-black text-primary">Net: {data.net} Net</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#trialNetGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Ders Bazlı Net Dağılımı ve Başarı Kartları */}
      {subjectStats.length > 0 && (
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/10">
            <div>
              <h4 className="text-lg font-black text-on-surface flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-secondary" />
                <span>Ders Bazlı Net & Başarı Dağılımı</span>
              </h4>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                Öğrencinin her branştaki son sınav neti, genel ortalaması ve doğru/yanlış oranı.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map((sub, idx) => (
              <div 
                key={sub.subject}
                className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} 
                    />
                    <h5 className="font-extrabold text-sm text-on-surface">{sub.subject}</h5>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                    Son Net: {sub.latestNet.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                  <div>
                    <p className="text-[9px] font-black uppercase text-emerald-700">Doğru</p>
                    <p className="text-xs font-black text-emerald-800">{sub.totalCorrect}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-rose-700">Yanlış</p>
                    <p className="text-xs font-black text-rose-800">{sub.totalIncorrect}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-amber-700">Boş</p>
                    <p className="text-xs font-black text-amber-800">{sub.totalEmpty}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant font-medium">Genel Ort. Net:</span>
                    <span className="font-extrabold text-on-surface">{sub.avgNet.toFixed(2)} Net</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant font-medium">Doğruluk Başarısı:</span>
                    <span className="font-extrabold text-emerald-700">%{sub.accuracy}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${sub.accuracy}%`,
                        backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Deneme Hata & Eksik Konu Analizi (Wrong Topics) */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/10">
          <div>
            <h4 className="text-lg font-black text-on-surface flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>Denemelerde En Çok Yanlış Yapılan Konular (Eksik Kazanımlar)</span>
            </h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Öğrencinin optik sonuçlarından tespit edilen kritik eksik konuları doğrudan haftalık programa telafi görevi olarak atayabilirsiniz.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full border border-amber-300/30 self-start sm:self-auto">
            {wrongTopicsAggregation.length} Eksik Konu Tespit Edildi
          </span>
        </div>

        {wrongTopicsAggregation.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h5 className="text-sm font-bold text-on-surface">Kritik Konu Hatası Bulunmuyor</h5>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Deneme sınavı girişlerinde yanlış yapılan konuları işaretlediğinizde, en çok takıldığı konular burada sıralanacak ve telafi ödevi önerecektir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {wrongTopicsAggregation.map((item, idx) => (
              <div 
                key={idx}
                className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                    {item.subject}
                  </span>
                  <h6 className="font-extrabold text-xs sm:text-sm text-on-surface truncate mt-1">
                    {item.topic}
                  </h6>
                  <p className="text-[11px] text-rose-700 font-bold mt-0.5">
                    {item.count} Sınavda Yanlış Yapıldı
                  </p>
                </div>

                {onAssignTopicTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignTopicTask(item.subject, item.topic);
                      showToast(`"${item.topic}" konusu haftalık ödev formuna aktarıldı! 🚀`);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-primary hover:text-white text-primary border border-primary/20 rounded-xl text-xs font-bold transition-all shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Bu konuyu haftalık programa telafi görevi olarak ata"
                  >
                    <span>Ödev Ata</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Tüm Deneme Sınavları Geçmiş Tablosu */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
          <div>
            <h4 className="text-lg font-black text-on-surface flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Kayıtlı Deneme Sınavları Geçmişi ({detailedTrials.length > 0 ? detailedTrials.length : simpleTrials.length})</span>
            </h4>
            <p className="text-xs text-on-surface-variant font-medium">
              Öğrencinin geçmiş deneme sınavları, netleri ve detaylı ders dökümleri.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                <th className="py-3 px-3">Tarih</th>
                <th className="py-3 px-3">Sınav Adı</th>
                <th className="py-3 px-3">Soru Sayısı</th>
                <th className="py-3 px-3">Toplam Net</th>
                <th className="py-3 px-3">Net Değişimi</th>
                <th className="py-3 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5 text-xs">
              {detailedTrials.length > 0 ? (
                detailedTrials.map((trial, idx) => {
                  const prevTrial = detailedTrials[idx + 1];
                  const diff = prevTrial ? Number((trial.totalNet - prevTrial.totalNet).toFixed(2)) : null;

                  return (
                    <tr key={trial.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-on-surface-variant whitespace-nowrap">
                        {trial.date}
                      </td>
                      <td className="py-3.5 px-3 font-black text-on-surface">
                        {trial.title || trial.name || 'Genel Deneme'}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant font-medium">
                        {trial.totalQuestions || 100} Soru
                      </td>
                      <td className="py-3.5 px-3 font-black text-base text-primary">
                        {trial.totalNet.toFixed(2)} Net
                      </td>
                      <td className="py-3.5 px-3">
                        {diff !== null ? (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {diff >= 0 ? `+${diff}` : `${diff}`} Net
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTrialDetail(trial)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                            title="Ders bazlı dökümü ve yanlışları incele"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(trial.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Bu deneme sınavını sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : simpleTrials.length > 0 ? (
                simpleTrials.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-on-surface-variant">{st.date}</td>
                    <td className="py-3.5 px-3 font-black text-on-surface">{st.title || 'Genel Deneme'}</td>
                    <td className="py-3.5 px-3 text-on-surface-variant">{st.totalQuestions || 100} Soru</td>
                    <td className="py-3.5 px-3 font-black text-base text-primary">{st.score.toFixed(2)} Net</td>
                    <td className="py-3.5 px-3 text-on-surface-variant">-</td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTrial(st.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant italic">
                    Henüz kayıtlı deneme sınavı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: YENİ DENEME SINAVI EKLE MODALI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div>
                  <h3 className="text-xl font-black text-on-surface">Yeni Deneme Sınavı Girişi</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    {student.name} • {student.grade} Seviyesi ({penalty} yanlış 1 doğruyu götürür)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
                {/* Sınav Adı ve Tarihi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                      Deneme Sınav Adı / Yayın *
                    </label>
                    <input
                      type="text"
                      value={newTrialTitle}
                      onChange={(e) => setNewTrialTitle(e.target.value)}
                      placeholder="Örn: Özdebir LGS-1, TÖDER TYT-2, Karekök Deneme"
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                      Sınav Tarihi
                    </label>
                    <input
                      type="text"
                      value={newTrialDate}
                      onChange={(e) => setNewTrialDate(e.target.value)}
                      placeholder="Örn: 19.10.2024"
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Dersler ve D/Y/Boş Girişi */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-on-surface-variant tracking-wider">
                      Ders Bazlı Sonuçlar ({availableSubjects.length} Ders)
                    </h4>
                    <span className="text-[11px] font-bold text-primary">
                      Toplam Net: {liveFormTotalNet} Net
                    </span>
                  </div>

                  <div className="space-y-3">
                    {availableSubjects.map((sub) => {
                      const res = newTrialResults[sub.name] || { correct: 0, incorrect: 0, empty: 0, wrongTopics: [] };
                      const c = Number(res.correct) || 0;
                      const inc = Number(res.incorrect) || 0;
                      const subNet = Math.max(0, Number((c - (inc / penalty)).toFixed(2)));

                      return (
                        <div 
                          key={sub.name}
                          className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-on-surface">{sub.name}</span>
                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                              Net: {subNet}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-black uppercase text-emerald-700 block mb-1">Doğru</label>
                              <input
                                type="number"
                                min={0}
                                value={res.correct || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setNewTrialResults((prev) => ({
                                    ...prev,
                                    [sub.name]: { ...prev[sub.name], correct: val }
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-rose-700 block mb-1">Yanlış</label>
                              <input
                                type="number"
                                min={0}
                                value={res.incorrect || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setNewTrialResults((prev) => ({
                                    ...prev,
                                    [sub.name]: { ...prev[sub.name], incorrect: val }
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-rose-500 text-center"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">Boş</label>
                              <input
                                type="number"
                                min={0}
                                value={res.empty || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setNewTrialResults((prev) => ({
                                    ...prev,
                                    [sub.name]: { ...prev[sub.name], empty: val }
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-amber-500 text-center"
                              />
                            </div>
                          </div>

                          {/* Yanlış Yapılan Konu Seçimi */}
                          {inc > 0 && sub.topics && sub.topics.length > 0 && (
                            <div className="pt-2 border-t border-outline-variant/10 space-y-1.5">
                              <p className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Bu Derste Yanlış Yapılan Konuları İşaretleyin:
                              </p>
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                {sub.topics.map((tName) => {
                                  const isSelected = (res.wrongTopics || []).includes(tName);
                                  return (
                                    <button
                                      key={tName}
                                      type="button"
                                      onClick={() => {
                                        const current = res.wrongTopics || [];
                                        const updated = isSelected
                                          ? current.filter((t: string) => t !== tName)
                                          : [...current, tName];
                                        setNewTrialResults((prev) => ({
                                          ...prev,
                                          [sub.name]: { ...prev[sub.name], wrongTopics: updated }
                                        }));
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                        isSelected
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface-variant'
                                      }`}
                                    >
                                      {tName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Live Summary */}
              <div className="pt-4 border-t border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Toplam Net</p>
                    <p className="text-xl font-black text-primary">{liveFormTotalNet} Net</p>
                  </div>
                  <div className="h-8 w-px bg-outline-variant/20" />
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Toplam Soru</p>
                    <p className="text-xl font-black text-on-surface">{liveFormTotalQuestions} Soru</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTrial}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Deneme Sınavını Kaydet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: DENEME DETAY İNCELEME MODALI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTrialDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface-container-lowest border border-outline-variant/20 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div>
                  <h3 className="text-lg font-black text-on-surface">
                    {selectedTrialDetail.title || selectedTrialDetail.name || 'Deneme Sınavı Detayı'}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Tarih: {selectedTrialDetail.date} • {student.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrialDetail(null)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Net Badge */}
              <div className="p-4 my-4 bg-primary/10 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase">Toplam Sınav Neti</p>
                  <p className="text-2xl font-black text-primary">{selectedTrialDetail.totalNet.toFixed(2)} Net</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-white text-primary rounded-xl shadow-2xs">
                  {selectedTrialDetail.gradeLabel || student.grade}
                </span>
              </div>

              {/* Table of Subjects */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/10 text-[10px] font-black uppercase text-on-surface-variant">
                      <th className="py-2.5 px-2">Ders</th>
                      <th className="py-2.5 px-2 text-center text-emerald-700">D</th>
                      <th className="py-2.5 px-2 text-center text-rose-700">Y</th>
                      <th className="py-2.5 px-2 text-center text-amber-700">B</th>
                      <th className="py-2.5 px-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {Object.entries(selectedTrialDetail.results || {}).map(([subName, res]: [string, any]) => {
                      const c = Number(res.correct) || 0;
                      const inc = Number(res.incorrect) || 0;
                      const emp = Number(res.empty) || 0;
                      const net = typeof res.net === 'number' ? res.net : Math.max(0, c - (inc / penalty));

                      return (
                        <tr key={subName}>
                          <td className="py-3 px-2 font-bold text-on-surface">{subName}</td>
                          <td className="py-3 px-2 text-center font-extrabold text-emerald-800">{c}</td>
                          <td className="py-3 px-2 text-center font-extrabold text-rose-800">{inc}</td>
                          <td className="py-3 px-2 text-center font-extrabold text-amber-800">{emp}</td>
                          <td className="py-3 px-2 text-right font-black text-primary">{net.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Wrong Topics in this Exam */}
                {(() => {
                  const wrongTopicsInThisTrial: { subject: string; topic: string }[] = [];
                  Object.entries(selectedTrialDetail.results || {}).forEach(([subject, res]: [string, any]) => {
                    (res.wrongTopics || []).forEach((wt: any) => {
                      const tName = typeof wt === 'string' ? wt : wt.topic;
                      if (tName) wrongTopicsInThisTrial.push({ subject, topic: tName });
                    });
                  });

                  if (wrongTopicsInThisTrial.length === 0) return null;

                  return (
                    <div className="pt-3 border-t border-outline-variant/10 space-y-2">
                      <p className="text-xs font-black text-on-surface flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Bu Sınavda Yanlış Yapılan Konular ({wrongTopicsInThisTrial.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {wrongTopicsInThisTrial.map((wt, i) => (
                          <div 
                            key={i}
                            className="px-2.5 py-1 bg-rose-50 border border-rose-200/50 rounded-xl text-xs flex items-center gap-1.5"
                          >
                            <span className="font-bold text-rose-800">{wt.subject}:</span>
                            <span className="text-on-surface">{wt.topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-outline-variant/15 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTrialDetail(null)}
                  className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold rounded-xl text-xs transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: SİLME ONAY MODALI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/20 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-base font-black text-on-surface">Deneme Sınavını Sil?</h4>
                <p className="text-xs text-on-surface-variant">
                  Bu deneme sınavı kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTrial(deleteConfirmId)}
                  className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-sm shadow-rose-600/20"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component for the Teacher's Main Student List: AllStudentsTrialOverview
// -----------------------------------------------------------------------------
interface AllStudentsTrialOverviewProps {
  students: any[];
  onOpenStudentTrials: (student: any) => void;
  onQuickAddTrial: (student: any) => void;
}

export function AllStudentsTrialOverview({
  students,
  onOpenStudentTrials,
  onQuickAddTrial
}: AllStudentsTrialOverviewProps) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.grade).filter(Boolean))).sort();
  }, [students]);

  // Enriched list with trial info
  const enrichedList = useMemo(() => {
    return students.map((s) => {
      let detailedTrials: any[] = [];
      let simpleTrials: any[] = [];

      try {
        const d = localStorage.getItem(`trial_results_detailed_${s.id}`);
        if (d) detailedTrials = JSON.parse(d);
        const sim = localStorage.getItem(`trial_results_${s.id}`);
        if (sim) simpleTrials = JSON.parse(sim);
      } catch {}

      const latest = detailedTrials[0] || simpleTrials[0] || null;
      const latestNet = latest ? (latest.totalNet ?? latest.score ?? 0) : (Number(s.lastTrialScore) || 0);
      const latestTitle = latest?.title || latest?.name || (latestNet > 0 ? 'Son Deneme' : 'Kayıt Yok');
      const latestDate = latest?.date || '-';

      const trialCount = Math.max(detailedTrials.length, simpleTrials.length);

      let prevNet: number | null = null;
      if (detailedTrials.length >= 2) {
        prevNet = detailedTrials[1].totalNet;
      } else if (simpleTrials.length >= 2) {
        prevNet = simpleTrials[1].score;
      }
      const netDiff = prevNet !== null ? Number((latestNet - prevNet).toFixed(2)) : null;

      return {
        ...s,
        trialCount,
        latestNet: Number(latestNet.toFixed(2)),
        latestTitle,
        latestDate,
        netDiff
      };
    });
  }, [students]);

  const filtered = useMemo(() => {
    return enrichedList.filter((s) => {
      if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;
      if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.latestNet - a.latestNet);
  }, [enrichedList, gradeFilter, search]);

  const stats = useMemo(() => {
    const withTrials = enrichedList.filter((s) => s.latestNet > 0 || s.trialCount > 0);
    const sumNet = withTrials.reduce((sum, s) => sum + s.latestNet, 0);
    const avgNet = withTrials.length > 0 ? Number((sumNet / withTrials.length).toFixed(1)) : 0;
    const topStudent = withTrials.sort((a, b) => b.latestNet - a.latestNet)[0];

    return {
      totalStudents: enrichedList.length,
      evaluatedCount: withTrials.length,
      avgNet,
      topStudent
    };
  }, [enrichedList]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-secondary/10 via-surface-container-low to-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-secondary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Toplu Deneme Takip & Sınıf Başarı Paneli
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Danışmanlık Öğrencileri Deneme Takip Tablosu
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
            Tüm öğrencilerinizin en son girdiği deneme sınavları, netleri ve önceki sınava göre değişimleri tek ekranda.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="p-3 bg-surface-container-high rounded-2xl text-center">
            <p className="text-[10px] font-black uppercase text-secondary">Sınıf Ortalaması</p>
            <p className="text-xl font-black text-on-surface">{stats.avgNet} Net</p>
            <p className="text-[9px] text-on-surface-variant">{stats.evaluatedCount} Öğrenci</p>
          </div>

          <div className="p-3 bg-surface-container-high rounded-2xl text-center">
            <p className="text-[10px] font-black uppercase text-amber-700">En Yüksek Net</p>
            <p className="text-xl font-black text-amber-800">
              {stats.topStudent ? `${stats.topStudent.latestNet}` : '-'}
            </p>
            <p className="text-[9px] text-on-surface-variant truncate">
              {stats.topStudent ? stats.topStudent.name : 'Veri Yok'}
            </p>
          </div>

          <div className="p-3 bg-surface-container-high rounded-2xl text-center">
            <p className="text-[10px] font-black uppercase text-primary">Toplam Öğrenci</p>
            <p className="text-xl font-black text-primary">{stats.totalStudents}</p>
            <p className="text-[9px] text-on-surface-variant">Danışmanlıkta</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Öğrenci adına göre ara..."
            className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-secondary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setGradeFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              gradeFilter === 'all'
                ? 'bg-secondary text-white shadow-xs'
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            Tüm Sınıflar ({enrichedList.length})
          </button>
          {uniqueGrades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGradeFilter(g)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                gradeFilter === g
                  ? 'bg-secondary text-white shadow-xs'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] font-black uppercase text-on-surface-variant tracking-wider bg-surface-container-low/50">
                <th className="py-4 px-5">Öğrenci</th>
                <th className="py-4 px-4">Sınıf</th>
                <th className="py-4 px-4">Kayıtlı Deneme</th>
                <th className="py-4 px-4">Son Deneme Adı & Tarihi</th>
                <th className="py-4 px-4">Son Net</th>
                <th className="py-4 px-4">Net Değişimi</th>
                <th className="py-4 px-5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant italic">
                    Kriterlere uygun öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Öğrenci */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={st.avatar || `https://picsum.photos/seed/${st.id}/100/100`}
                          alt={st.name}
                          className="w-9 h-9 rounded-full object-cover border border-outline-variant/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-on-surface text-sm truncate">{st.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Sınıf */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-primary">{st.grade}</span>
                    </td>

                    {/* Kayıtlı Deneme Sayısı */}
                    <td className="py-3.5 px-4 font-bold text-on-surface-variant">
                      {st.trialCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-extrabold">
                          {st.trialCount} Sınav
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          Deneme Yok
                        </span>
                      )}
                    </td>

                    {/* Son Deneme Adı & Tarihi */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-on-surface truncate max-w-[180px]">{st.latestTitle}</p>
                      <p className="text-[10px] text-on-surface-variant">{st.latestDate}</p>
                    </td>

                    {/* Son Net */}
                    <td className="py-3.5 px-4 font-black text-sm text-primary">
                      {st.latestNet > 0 ? `${st.latestNet} Net` : '-'}
                    </td>

                    {/* Net Değişimi */}
                    <td className="py-3.5 px-4">
                      {st.netDiff !== null ? (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          st.netDiff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {st.netDiff >= 0 ? `+${st.netDiff}` : `${st.netDiff}`} Net
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-[10px]">-</span>
                      )}
                    </td>

                    {/* İşlem */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onQuickAddTrial(st)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Bu öğrenciye yeni deneme sınavı gir"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Deneme Gir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenStudentTrials(st)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Öğrencinin derinlemesine deneme analizini aç"
                        >
                          <span>Deneme Analizi</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
