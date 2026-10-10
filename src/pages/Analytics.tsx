import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Plus, History, Target, BookOpen, Trash2, PlayCircle, ExternalLink, Sparkles,
  HelpCircle, Award, CheckSquare, Compass, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAiAnalysisSafely } from '../lib/aiAnalysisService';
import { exportAiAnalysisToPdf } from '../lib/pdfExportService';
import { getStudentTrials, saveStudentTrials } from '../lib/firestoreService';

interface TrialResult {
  id: string;
  date: string;
  score: number;
  totalQuestions: number;
}

interface TopicError {
  id: string;
  topic: string;
  count: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const VIDEO_RECOMMENDATIONS: { [key: string]: { title: string, url: string } } = {
  'Türev': { title: 'Türev Konu Anlatımı - Full Tekrar', url: 'https://www.youtube.com/results?search_query=türev+konu+anlatımı' },
  'İntegral': { title: 'İntegral Sıfırdan Zirveye', url: 'https://www.youtube.com/results?search_query=integral+konu+anlatımı' },
  'Polinomlar': { title: 'Polinomlar - ÖSYM Tipi Sorular', url: 'https://www.youtube.com/results?search_query=polinomlar+konu+anlatımı' },
  'Trigonometri': { title: 'Trigonometri Tüm Formüller', url: 'https://www.youtube.com/results?search_query=trigonometri+konu+anlatımı' },
  'Logaritma': { title: 'Logaritma - Pratik Çözümler', url: 'https://www.youtube.com/results?search_query=logaritma+konu+anlatımı' },
  'Sayılar': { title: 'Temel Kavramlar ve Sayılar', url: 'https://www.youtube.com/results?search_query=sayılar+konu+anlatımı' },
  'Paragraf': { title: 'Paragraf Çözme Teknikleri', url: 'https://www.youtube.com/results?search_query=paragraf+çözme+teknikleri' },
  'Yazım Kuralları': { title: 'Yazım Kuralları - Full Tekrar', url: 'https://www.youtube.com/results?search_query=yazım+kuralları+konu+anlatımı' },
};

export function Analytics() {
  const [trialResults, setTrialResults] = useState<TrialResult[]>([]);
  const [topicErrors, setTopicErrors] = useState<TopicError[]>([]);
  
  // AI Analysis States
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'all' | 'weekly' | 'under80' | 'trials'>('all');
  
  // Form states
  const [newScore, setNewScore] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const studentId = localStorage.getItem('currentUserId');
    if (studentId) {
      const savedTrials = localStorage.getItem(`trial_results_${studentId}`);
      const savedErrors = localStorage.getItem(`topic_errors_${studentId}`);
      const savedAiAnalysis = localStorage.getItem(`ai_analysis_${studentId}`);
      
      if (savedTrials) setTrialResults(JSON.parse(savedTrials));
      if (savedErrors) setTopicErrors(JSON.parse(savedErrors));
      if (savedAiAnalysis) setAiAnalysis(JSON.parse(savedAiAnalysis));

      getStudentTrials(studentId).then(cloud => {
        if (cloud.simpleTrials && cloud.simpleTrials.length > 0) {
          setTrialResults(cloud.simpleTrials);
        } else if (cloud.detailedTrials && cloud.detailedTrials.length > 0) {
          const mapped = cloud.detailedTrials.map(dt => ({
            id: dt.id,
            date: dt.date,
            score: dt.totalNet,
            totalQuestions: 100
          }));
          setTrialResults(mapped);
        }
      }).catch(() => {});
    }
  }, []);

  const runAiAnalysis = async () => {
    const studentId = localStorage.getItem('currentUserId');
    if (!studentId) return;

    setLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const studentName = localStorage.getItem('currentUserName') || 'Öğrenci';
      const grade = localStorage.getItem('currentUserGrade') || 'Belirtilmemiş';
      const savedTasks = JSON.parse(localStorage.getItem(`tasks_${studentId}`) || '[]');
      const detailedTrials = JSON.parse(localStorage.getItem(`trial_results_detailed_${studentId}`) || '[]');
      const savedErrors = JSON.parse(localStorage.getItem(`topic_errors_${studentId}`) || '[]');

      const savedArchives = JSON.parse(localStorage.getItem(`archived_programs_${studentId}`) || '[]');

      const data = await fetchAiAnalysisSafely({
        studentName,
        grade,
        tasks: savedTasks,
        trialResults,
        detailedTrials,
        topicErrors: savedErrors.length > 0 ? savedErrors : topicErrors,
        archivedPrograms: savedArchives
      });

      setAiAnalysis(data);
      localStorage.setItem(`ai_analysis_${studentId}`, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Analiz sırasında beklenmedik bir hata oluştu.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const addTrial = () => {
    const studentId = localStorage.getItem('currentUserId');
    if (!newScore || !studentId) return;
    const result: TrialResult = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      score: Number(newScore),
      totalQuestions: 100
    };
    const updated = [...trialResults, result];
    setTrialResults(updated);
    localStorage.setItem(`trial_results_${studentId}`, JSON.stringify(updated));
    setNewScore('');
    triggerSuccess();
  };

  const addError = () => {
    const studentId = localStorage.getItem('currentUserId');
    if (!newTopic || !studentId) return;
    const existing = topicErrors.find(e => e.topic.toLowerCase() === newTopic.toLowerCase());
    let updated;
    if (existing) {
      updated = topicErrors.map(e => e.id === existing.id ? { ...e, count: e.count + 1 } : e);
    } else {
      updated = [...topicErrors, { id: Math.random().toString(36).substr(2, 9), topic: newTopic, count: 1 }];
    }
    setTopicErrors(updated);
    localStorage.setItem(`topic_errors_${studentId}`, JSON.stringify(updated));
    setNewTopic('');
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const deleteTrial = (id: string) => {
    const studentId = localStorage.getItem('currentUserId');
    if (!studentId) return;
    const updated = trialResults.filter(t => t.id !== id);
    setTrialResults(updated);
    localStorage.setItem(`trial_results_${studentId}`, JSON.stringify(updated));
  };

  const latestScore = trialResults.length > 0 ? trialResults[trialResults.length - 1].score : 0;
  const previousScore = trialResults.length > 1 ? trialResults[trialResults.length - 2].score : 0;
  const trend = latestScore >= previousScore ? 'up' : 'down';

  const sortedErrors = [...topicErrors].sort((a, b) => b.count - a.count);
  const topErrors = sortedErrors.slice(0, 3);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Analiz & Gelişim</h3>
          <p className="text-on-surface-variant font-medium">Deneme sonuçlarını ve konu eksiklerini buradan takip et.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Target className="w-6 h-6" />
            </div>
            {trialResults.length > 1 ? (
              <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'}`}>
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(latestScore - previousScore).toFixed(1)} Net
              </span>
            ) : (
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full">
                {trialResults.length === 1 ? 'İlk Sınav' : 'Kayıt Yok'}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Son Deneme Neti</p>
            <h4 className="text-3xl font-black text-on-surface">
              {trialResults.length > 0 ? latestScore.toFixed(2) : '-'}
            </h4>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">En Çok Hata Yapılan Konu</p>
            <h4 className="text-2xl font-black text-on-surface truncate">
              {sortedErrors[0]?.topic || 'Hata Yok'}
            </h4>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Toplam Deneme</p>
            <h4 className="text-3xl font-black text-on-surface">{trialResults.length} Adet</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trial Progress Chart */}
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Net Gelişim Grafiği
            </h4>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {trialResults.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trialResults}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2">
                <TrendingUp className="w-10 h-10 text-outline-variant mx-auto opacity-20" />
                <p className="text-xs font-bold text-on-surface-variant">Henüz kayıtlı deneme sınavı sonucu bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Topic Error Chart */}
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-secondary" />
              Hatalı Konu Dağılımı
            </h4>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {sortedErrors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedErrors.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {sortedErrors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-tertiary mx-auto opacity-30" />
                <p className="text-xs font-bold text-on-surface-variant">Harika! Henüz kaydedilmiş konu hatası yok.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Yapay Zeka Destekli Gelişim Analizi */}
      <div className="bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-transparent border border-primary/20 p-8 rounded-[2.5rem] shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h4 className="text-2xl font-black text-on-surface flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              Yapay Zeka Eğitim Danışmanı Analizi
            </h4>
            <p className="text-sm text-on-surface-variant font-medium">
              Tamamladığın ödevler, doğru/yanlış oranların ve deneme sonuçlarına göre kişiselleştirilmiş eksik analizi ve video önerileri.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {aiAnalysis && (
              <button
                type="button"
                onClick={() => {
                  const studentName = localStorage.getItem('currentUserName') || 'Öğrenci';
                  const studentGrade = localStorage.getItem('currentUserGrade') || '12. Sınıf';
                  exportAiAnalysisToPdf(aiAnalysis, studentName, studentGrade);
                }}
                className="px-6 py-4 bg-white/90 hover:bg-white text-on-surface border border-outline-variant/30 font-black rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer text-xs sm:text-sm"
                title="Yapay zeka analiz raporunu PDF formatında indir veya yazdır"
              >
                <Download className="w-4 h-4 text-primary" />
                <span>PDF Olarak İndir</span>
              </button>
            )}
            <button
              onClick={runAiAnalysis}
              disabled={loadingAnalysis}
              className={`px-8 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-container hover:to-purple-700 text-white font-black rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 text-xs sm:text-sm cursor-pointer ${
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
          <div className="space-y-6 relative z-10 animate-fade-in">
            {/* View Selector Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-surface-container-high rounded-2xl flex-wrap">
              <button
                type="button"
                onClick={() => setAnalysisTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  analysisTab === 'all'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Genel Değerlendirme
              </button>
              <button
                type="button"
                onClick={() => setAnalysisTab('weekly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  analysisTab === 'weekly'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Haftalık Program Analizi
              </button>
              <button
                type="button"
                onClick={() => setAnalysisTab('under80')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  analysisTab === 'under80'
                    ? 'bg-white text-rose-600 shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-rose-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>%80 Altı Kritik Konular</span>
                {aiAnalysis.under80Topics && aiAnalysis.under80Topics.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                    {aiAnalysis.under80Topics.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAnalysisTab('trials')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  analysisTab === 'trials'
                    ? 'bg-white text-secondary shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-secondary" />
                Deneme Sınavları Analizi
              </button>
            </div>

            {/* TAB 1: ALL / SUMMARY OVERVIEW */}
            {(analysisTab === 'all') && (
              <div className="space-y-6">
                {/* Summary Banner */}
                <div className="p-6 bg-white/80 backdrop-blur-md rounded-3xl border border-outline-variant/10 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Yapay Zeka Genel Koçluk Raporu
                  </p>
                  <p className="text-on-surface font-semibold text-base leading-relaxed italic">
                    "{aiAnalysis.summary}"
                  </p>
                </div>

                {/* KPI Metrics */}
                {aiAnalysis.weeklyPerformanceStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-outline-variant/10 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">Haftalık Soru</p>
                      <p className="text-xl sm:text-2xl font-black text-on-surface">{aiAnalysis.weeklyPerformanceStats.solvedQuestions || aiAnalysis.weeklyPerformanceStats.totalQuestions || 0}</p>
                      <p className="text-[10px] text-on-surface-variant/70">Hedef: {aiAnalysis.weeklyPerformanceStats.assignedQuestions || 0}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/50 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Doğru</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-700">{aiAnalysis.weeklyPerformanceStats.totalCorrect || 0}</p>
                      <p className="text-[10px] text-emerald-700/70">Başarılı Soru</p>
                    </div>
                    <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/50 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-rose-800 uppercase">Yanlış</p>
                      <p className="text-xl sm:text-2xl font-black text-rose-700">{aiAnalysis.weeklyPerformanceStats.totalIncorrect || 0}</p>
                      <p className="text-[10px] text-rose-700/70">Hata Sayısı</p>
                    </div>
                    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/50 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-amber-800 uppercase">Boş</p>
                      <p className="text-xl sm:text-2xl font-black text-amber-700">{aiAnalysis.weeklyPerformanceStats.totalEmpty || 0}</p>
                      <p className="text-[10px] text-amber-700/70">Cevapsız</p>
                    </div>
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/50 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase">Doğruluk</p>
                      <p className="text-xl sm:text-2xl font-black text-indigo-700">%{aiAnalysis.weeklyPerformanceStats.successRate || 0}</p>
                      <p className="text-[10px] text-indigo-700/70">Haftalık Oran</p>
                    </div>
                    <div className="p-4 bg-secondary/10 rounded-2xl border border-secondary/20 shadow-xs text-center space-y-1">
                      <p className="text-[10px] font-bold text-secondary uppercase">Son Deneme</p>
                      <p className="text-xl sm:text-2xl font-black text-secondary">{aiAnalysis.weeklyPerformanceStats.latestTrialNet || 0} Net</p>
                      <p className="text-[10px] text-secondary/70">Hedef: {(Number(aiAnalysis.weeklyPerformanceStats.latestTrialNet) + 3).toFixed(1)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HAFTALIK PROGRAM VE DOĞRU-YANLIŞ ANALİZİ */}
            {(analysisTab === 'all' || analysisTab === 'weekly') && (
              <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-on-surface">Haftalık Program & Doğru-Yanlış Performansı</h4>
                      <p className="text-xs text-on-surface-variant font-medium">
                        Programdaki ödev tamamlama, soru sayıları ve doğruluk oranlarının analizi
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                    Ödev Doğruluk Oranı: %{aiAnalysis.weeklyPerformanceStats?.successRate || 0}
                  </span>
                </div>

                {/* Weekly Program AI Review */}
                {aiAnalysis.weeklyProgramAnalysis?.summary && (
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs sm:text-sm font-medium text-indigo-950 leading-relaxed">
                    <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Haftalık Ödev ve Soru Değerlendirmesi:
                    </p>
                    {aiAnalysis.weeklyProgramAnalysis.summary}
                  </div>
                )}

                {/* Progress Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Ödev Tamamlama</span>
                      <span className="text-primary font-black">%{aiAnalysis.weeklyPerformanceStats?.completionRate || 0}</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${aiAnalysis.weeklyPerformanceStats?.completionRate || 0}%` }} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      {aiAnalysis.weeklyPerformanceStats?.completedTasksCount || 0} / {aiAnalysis.weeklyPerformanceStats?.totalTasksCount || 0} Görev Tamamlandı
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Haftalık Soru Hedefi</span>
                      <span className="text-tertiary font-black">%{aiAnalysis.weeklyPerformanceStats?.questionCompletionRate || 0}</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full" style={{ width: `${aiAnalysis.weeklyPerformanceStats?.questionCompletionRate || 0}%` }} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      {aiAnalysis.weeklyPerformanceStats?.solvedQuestions || 0} / {aiAnalysis.weeklyPerformanceStats?.assignedQuestions || 0} Soru Çözüldü
                    </p>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                      <span>Net Doğruluk Oranı</span>
                      <span className="text-emerald-700 font-black">%{aiAnalysis.weeklyPerformanceStats?.successRate || 0}</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${aiAnalysis.weeklyPerformanceStats?.successRate || 0}%` }} />
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      {aiAnalysis.weeklyPerformanceStats?.totalCorrect || 0} Doğru • {aiAnalysis.weeklyPerformanceStats?.totalIncorrect || 0} Yanlış
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: %80 BAŞARI EŞİĞİNİN ALTINDAKİ KONULAR VE ÖZEL TAVSİYELER */}
            {(analysisTab === 'all' || analysisTab === 'under80' || analysisTab === 'weekly') && (
              <div className="p-6 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 rounded-3xl border border-rose-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-rose-950 flex items-center gap-2">
                        %80 Başarı Eşiğinin Altındaki Kritik Konular
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider">
                          Hedef: %80+
                        </span>
                      </h4>
                      <p className="text-xs text-rose-900/80 font-medium">
                        Öğrencinin haftalık programda doğru-yanlış girdiği ve başarı oranı %80'in altında kalan konuların teşhisi ve video önerileri
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 bg-white rounded-full border border-rose-300 text-rose-700 shadow-2xs">
                    {aiAnalysis.under80Topics?.length || 0} Kritik Konu Tespit Edildi
                  </span>
                </div>

                {aiAnalysis.under80Topics && aiAnalysis.under80Topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiAnalysis.under80Topics.map((topicItem: any, idx: number) => {
                      const isCritical = topicItem.accuracy < 60;
                      return (
                        <div 
                          key={idx} 
                          className="p-5 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3.5 hover:shadow-md transition-shadow"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                {topicItem.subject}
                              </span>
                              <h5 className="font-black text-base text-on-surface mt-1">{topicItem.topic}</h5>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase block ${
                                isCritical ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                              }`}>
                                %{topicItem.accuracy} Başarı
                              </span>
                              <span className="text-[10px] font-bold text-on-surface-variant block mt-0.5">
                                {topicItem.correct}D / {topicItem.incorrect}Y
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                              <span>Mevcut Başarı: %{topicItem.accuracy}</span>
                              <span className="text-rose-600 font-black">Hedef: %80</span>
                            </div>
                            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden relative">
                              {/* 80% mark */}
                              <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-rose-500 z-10" title="Hedef Eşik (%80)" />
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isCritical ? 'bg-rose-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, topicItem.accuracy)}%` }}
                              />
                            </div>
                          </div>

                          {/* Diagnosis */}
                          <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                            {topicItem.diagnosis}
                          </p>

                          {/* Recommendation Box */}
                          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-950 space-y-1">
                            <p className="font-bold flex items-center gap-1.5 text-amber-900">
                              <Target className="w-3.5 h-3.5 text-amber-700" />
                              Yapay Zeka Telafi Tavsiyesi:
                            </p>
                            <p className="text-[11px] leading-relaxed font-medium">{topicItem.recommendation}</p>
                          </div>

                          {/* Video Link */}
                          {topicItem.video && (
                            <a
                              href={topicItem.video.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 text-xs text-primary font-bold transition-all group"
                            >
                              <span className="flex items-center gap-2 truncate pr-2">
                                <PlayCircle className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate">{topicItem.video.title}</span>
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-primary shrink-0">
                                İzle <ExternalLink className="w-3 h-3" />
                              </span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-2xl border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-bold text-emerald-950">Tebrikler! %80 Eşiğinin Altında Konu Yok</p>
                    <p className="text-xs text-emerald-800">
                      Öğrencinin haftalık programdaki görevlerinde çözülen tüm konularda %80 başarı oranının üzerinde performans kaydedilmiştir.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DENEME SINAVLARI ANALİZİ */}
            {(analysisTab === 'all' || analysisTab === 'trials') && (
              <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center font-black">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-on-surface">Deneme Sınavları Özel Analiz Modülü</h4>
                      <p className="text-xs text-on-surface-variant font-medium">
                        Deneme sınavı net trendleri, zaman yönetimi ve bir sonraki deneme için taktikler
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-3.5 py-1.5 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
                    {aiAnalysis.trialAnalysis?.trendLabel || 'Net Takibi Aktif'}
                  </span>
                </div>

                {/* Trial Review Text */}
                {aiAnalysis.trialAnalysis?.summary && (
                  <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 text-xs sm:text-sm font-medium text-secondary-950 leading-relaxed">
                    <p className="font-bold text-secondary mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-secondary" />
                      Deneme Sınavı Yapay Zeka Değerlendirmesi:
                    </p>
                    {aiAnalysis.trialAnalysis.summary}
                  </div>
                )}

                {/* Trial Score Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-surface-container-low rounded-2xl text-center space-y-1 border border-outline-variant/10">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Son Deneme</span>
                    <span className="text-2xl font-black text-secondary block">{aiAnalysis.trialAnalysis?.latestTrialNet || 0} Net</span>
                    <span className="text-[10px] text-on-surface-variant block">Mevcut Seviye</span>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-2xl text-center space-y-1 border border-outline-variant/10">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">En Yüksek Net</span>
                    <span className="text-2xl font-black text-emerald-700 block">{aiAnalysis.trialAnalysis?.highestTrialNet || 0} Net</span>
                    <span className="text-[10px] text-emerald-700/80 block">Zirve Skoru</span>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-2xl text-center space-y-1 border border-outline-variant/10">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Ortalama Net</span>
                    <span className="text-2xl font-black text-primary block">{aiAnalysis.trialAnalysis?.averageTrialNet || 0} Net</span>
                    <span className="text-[10px] text-primary/80 block">Kayıtlı {aiAnalysis.trialAnalysis?.trialCount || 0} Deneme</span>
                  </div>
                  <div className="p-4 bg-surface-container-low rounded-2xl text-center space-y-1 border border-outline-variant/10">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Hedeflenen Net</span>
                    <span className="text-2xl font-black text-purple-700 block">{aiAnalysis.trialAnalysis?.targetNet || 0} Net</span>
                    <span className="text-[10px] text-purple-700/80 block">Gelecek Deneme Hedefi</span>
                  </div>
                </div>

                {/* Trial Recommendations */}
                {aiAnalysis.trialAnalysis?.trialRecommendations && (
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
                      Deneme Sınavı Başarı Stratejileri & Taktikleri
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {aiAnalysis.trialAnalysis.trialRecommendations.map((tRec: any, idx: number) => (
                        <div key={idx} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-on-surface">{tRec.title}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-secondary/10 text-secondary uppercase">
                              {tRec.badge}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                            {tRec.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5 / PEDAGOJİK NOTLAR VE DERS DETAYLARI */}
            {(analysisTab === 'all') && (
              <div className="space-y-6">
                {/* Previous Week Card */}
                {aiAnalysis.previousWeekEvaluation && (
                  <div className="p-6 bg-gradient-to-br from-indigo-500/5 via-primary/5 to-transparent rounded-3xl border border-primary/20 shadow-sm space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-base text-on-surface">Önceki Hafta Değerlendirmesi & Karnesi</h4>
                          <p className="text-xs text-on-surface-variant font-medium">
                            Tamamlanan haftanın ödev performansı ve yapay zeka değerlendirmesi
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black px-3 py-1 bg-white rounded-full border border-primary/20 text-primary shadow-2xs">
                        🗓️ {aiAnalysis.previousWeekEvaluation.endDate || 'Geçen Hafta'}
                      </span>
                    </div>

                    <div className="p-4 bg-white/90 rounded-2xl border border-outline-variant/10 text-sm font-semibold text-on-surface leading-relaxed">
                      {aiAnalysis.previousWeekEvaluation.evaluationSummary}
                    </div>
                  </div>
                )}

                {/* Recommendations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Weekly Plan Recommendations */}
                  {aiAnalysis.weeklyPlanRecommendations && aiAnalysis.weeklyPlanRecommendations.length > 0 && (
                    <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary" />
                          Yapay Zeka Çalışma Önerileri
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                          Haftalık Planlama
                        </span>
                      </div>
                      <div className="space-y-3">
                        {aiAnalysis.weeklyPlanRecommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-sm text-on-surface">{rec.subject} - {rec.topic}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                rec.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {rec.priority === 'high' ? 'Yüksek Öncelik' : 'Önerilen'}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-primary">{rec.suggestedAmount}</p>
                            <p className="text-[11px] text-on-surface-variant font-medium">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaching & Pedagogy Notes */}
                  {aiAnalysis.teacherPedagogyNotes && aiAnalysis.teacherPedagogyNotes.length > 0 && (
                    <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-500" />
                          Pedagojik Koçluk & Odak Noktaları
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 uppercase">
                          Gelişim Takibi
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {aiAnalysis.teacherPedagogyNotes.map((note: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/40 border border-amber-200/40 text-xs text-on-surface font-medium leading-relaxed">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject Breakdown */}
                {aiAnalysis.subjects && aiAnalysis.subjects.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiAnalysis.subjects.map((sub: any, i: number) => {
                      const isDanger = sub.status === 'danger';
                      const isWarning = sub.status === 'warning';
                      return (
                        <div key={i} className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                isDanger ? 'bg-secondary/10 text-secondary' : isWarning ? 'bg-orange-100 text-orange-700' : 'bg-tertiary/10 text-tertiary'
                              }`}>
                                {isDanger ? 'Geliştirilmeli' : isWarning ? 'Dikkat Edilmeli' : 'Başarılı'}
                              </span>
                              <h5 className="font-extrabold text-xl text-on-surface mt-1">{sub.name}</h5>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase">Tahmini Başarı</p>
                              <p className="text-2xl font-black text-primary">%{sub.accuracy}</p>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                isDanger ? 'bg-secondary' : isWarning ? 'bg-orange-500' : 'bg-tertiary'
                              }`}
                              style={{ width: `${sub.accuracy}%` }}
                            />
                          </div>
                          {sub.deficiencies && sub.deficiencies.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {sub.deficiencies.map((def: any, idx: number) => (
                                <div key={idx} className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1">
                                  <p className="font-bold text-on-surface">{def.topic}</p>
                                  <p className="text-on-surface-variant text-[11px]">{def.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
                Henüz yapay zeka analiz raporun oluşturulmamış. Verilerini analiz ederek ders bazlı gelişim önerileri almak için yukarıdaki butona tıklayabilirsin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video Recommendations Section */}
      <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Eksik Konular İçin Video Önerileri
          </h4>
        </div>
        
        {topErrors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topErrors.map((error, index) => {
              const rec = VIDEO_RECOMMENDATIONS[error.topic] || { 
                title: `${error.topic} Konu Anlatımı`, 
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(error.topic)}+konu+anlatımı` 
              };
              return (
                <div key={error.id} className="bg-surface-container-low p-6 rounded-3xl space-y-4 hover:bg-surface-container-high transition-colors group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-full uppercase tracking-widest">
                      {error.count} Hata
                    </span>
                    <PlayCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h5 className="font-bold text-on-surface leading-tight">{rec.title}</h5>
                  <a 
                    href={rec.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs font-bold text-primary hover:underline"
                  >
                    Hemen İzle
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/30">
            <p className="text-on-surface-variant font-bold">Henüz hata analizi yapılmamış.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* History List */}
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <h4 className="text-xl font-bold text-on-surface">Deneme Geçmişi</h4>
          <div className="space-y-3">
            {trialResults.slice().reverse().map((trial) => (
              <div key={trial.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center font-bold text-primary shadow-sm">
                    {trial.score.toFixed(1)}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Deneme Sonucu</p>
                    <p className="text-xs text-on-surface-variant font-medium">{trial.date}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteTrial(trial.id)}
                  className="p-2 text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50"
          >
            <CheckCircle2 className="w-6 h-6" />
            Veri kaydedildi!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
