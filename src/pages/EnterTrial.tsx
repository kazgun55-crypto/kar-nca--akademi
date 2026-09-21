import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Minus, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ChevronRight,
  ChevronDown,
  Save,
  AlertCircle,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Subject, 
  SUBJECTS_8, 
  SUBJECTS_9_MAARIF, 
  SUBJECTS_10_MAARIF, 
  SUBJECTS_11_12, 
  getSubjectsForGrade,
  getGradeCategory
} from '../lib/curriculum';

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

function SubjectCard({ 
  subject, 
  expandedSubject, 
  setExpandedSubject, 
  trialResults, 
  updateResult, 
  toggleTopic, 
  updateTopicCount 
}: any) {
  return (
    <div 
      className={`bg-surface-container-lowest rounded-[2rem] border transition-all overflow-hidden ${
        expandedSubject === subject.name ? 'border-primary shadow-lg' : 'border-outline-variant/10 shadow-sm'
      }`}
    >
      <button 
        onClick={() => setExpandedSubject(expandedSubject === subject.name ? null : subject.name)}
        className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
            expandedSubject === subject.name ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'
          }`}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-lg text-on-surface">{subject.name}</h4>
            <p className="text-xs font-bold text-on-surface-variant">
              {trialResults[subject.name].correct} Doğru / {trialResults[subject.name].incorrect} Yanlış
            </p>
          </div>
        </div>
        {expandedSubject === subject.name ? <ChevronDown className="w-6 h-6 text-outline" /> : <ChevronRight className="w-6 h-6 text-outline" />}
      </button>

      <AnimatePresence>
        {expandedSubject === subject.name && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-outline-variant/10"
          >
            <div className="p-8 space-y-8">
              {/* Score Inputs */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Doğru Sayısı</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateResult(subject.name, 'correct', trialResults[subject.name].correct - 1)}
                      className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input 
                      type="number" 
                      value={trialResults[subject.name].correct}
                      onChange={(e) => updateResult(subject.name, 'correct', parseInt(e.target.value) || 0)}
                      className="flex-grow h-12 bg-surface-container-low border-none rounded-xl text-center font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button 
                      onClick={() => updateResult(subject.name, 'correct', trialResults[subject.name].correct + 1)}
                      className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Yanlış Sayısı</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateResult(subject.name, 'incorrect', trialResults[subject.name].incorrect - 1)}
                      className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center hover:bg-secondary/10 hover:text-secondary transition-all"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input 
                      type="number" 
                      value={trialResults[subject.name].incorrect}
                      onChange={(e) => updateResult(subject.name, 'incorrect', parseInt(e.target.value) || 0)}
                      className="flex-grow h-12 bg-surface-container-low border-none rounded-xl text-center font-bold text-on-surface outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <button 
                      onClick={() => updateResult(subject.name, 'incorrect', trialResults[subject.name].incorrect + 1)}
                      className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center hover:bg-secondary/10 hover:text-secondary transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Topic Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Yanlış Yapılan Konular</label>
                  <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                    {trialResults[subject.name].wrongTopics.length} Seçili
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subject.topics.map((topic: string) => {
                    const mistake = trialResults[subject.name].wrongTopics.find((t: any) => t.topic === topic);
                    const isSelected = !!mistake;
                    
                    return (
                      <div key={topic} className="space-y-2">
                        <button
                          onClick={() => toggleTopic(subject.name, topic)}
                          className={`w-full p-4 rounded-2xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                            isSelected
                              ? 'bg-secondary/10 border-secondary text-secondary'
                              : 'bg-surface-container-high border-transparent text-on-surface-variant hover:border-outline-variant'
                          }`}
                        >
                          {topic}
                          {isSelected ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4 opacity-40" />}
                        </button>
                        
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-3 px-2"
                            >
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Hata Sayısı:</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => updateTopicCount(subject.name, topic, mistake.count - 1)}
                                  className="h-6 w-6 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black w-4 text-center">{mistake.count}</span>
                                <button 
                                  onClick={() => updateTopicCount(subject.name, topic, mistake.count + 1)}
                                  className="h-6 w-6 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EnterTrial() {
  const navigate = useNavigate();
  const rawGrade = localStorage.getItem('currentUserGrade') || '9. Sınıf';
  const initialCategory = getGradeCategory(rawGrade);

  const [activeGradeCategory, setActiveGradeCategory] = useState<'8' | '9' | '10' | 'yks'>(initialCategory);

  const subjects = activeGradeCategory === '8'
    ? SUBJECTS_8
    : activeGradeCategory === '9'
    ? SUBJECTS_9_MAARIF
    : activeGradeCategory === '10'
    ? SUBJECTS_10_MAARIF
    : SUBJECTS_11_12;

  const [trialResults, setTrialResults] = useState<{
    [subject: string]: {
      correct: number;
      incorrect: number;
      wrongTopics: { topic: string; count: number }[];
    }
  }>(() => {
    const initial: any = {};
    subjects.forEach(s => {
      initial[s.name] = { correct: 0, incorrect: 0, wrongTopics: [] };
    });
    return initial;
  });

  // Reinitialize results when category changes
  useEffect(() => {
    const updated: any = {};
    subjects.forEach(s => {
      updated[s.name] = trialResults[s.name] || { correct: 0, incorrect: 0, wrongTopics: [] };
    });
    setTrialResults(updated);
    setExpandedSubject(subjects[0]?.name || null);
  }, [activeGradeCategory]);

  const [expandedSubject, setExpandedSubject] = useState<string | null>(subjects[0]?.name || null);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateResult = (subject: string, field: 'correct' | 'incorrect', value: number) => {
    setTrialResults(prev => ({
      ...prev,
      [subject]: {
        ...(prev[subject] || { correct: 0, incorrect: 0, wrongTopics: [] }),
        [field]: Math.max(0, value)
      }
    }));
  };

  const toggleTopic = (subject: string, topic: string) => {
    setTrialResults(prev => {
      const current = prev[subject] || { correct: 0, incorrect: 0, wrongTopics: [] };
      const isSelected = current.wrongTopics.some(t => t.topic === topic);
      
      const newTopics = isSelected
        ? current.wrongTopics.filter(t => t.topic !== topic)
        : [...current.wrongTopics, { topic, count: 1 }];
      
      return {
        ...prev,
        [subject]: {
          ...current,
          wrongTopics: newTopics
        }
      };
    });
  };

  const updateTopicCount = (subject: string, topic: string, count: number) => {
    setTrialResults(prev => {
      const current = prev[subject] || { correct: 0, incorrect: 0, wrongTopics: [] };
      const newTopics = current.wrongTopics.map(t => 
        t.topic === topic ? { ...t, count: Math.max(1, count) } : t
      );
      
      return {
        ...prev,
        [subject]: {
          ...current,
          wrongTopics: newTopics
        }
      };
    });
  };

  const calculateTotalNet = () => {
    let total = 0;
    Object.values(trialResults).forEach((r) => {
      const res = r as { correct: number; incorrect: number };
      total += (res.correct || 0) - ((res.incorrect || 0) * 0.25);
    });
    return Math.max(0, total);
  };

  const saveTrial = () => {
    const studentId = localStorage.getItem('currentUserId');
    if (!studentId) return;

    const gradeLabel = activeGradeCategory === '8'
      ? '8. Sınıf (LGS)'
      : activeGradeCategory === '9'
      ? '9. Sınıf (Maarif Modeli)'
      : activeGradeCategory === '10'
      ? '10. Sınıf (Maarif Modeli)'
      : '11 & 12. Sınıf (YKS)';

    const newTrial: TrialData = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      results: trialResults,
      totalNet: calculateTotalNet()
    };

    // Save to trial results history (student specific)
    const detailedKey = `trial_results_detailed_${studentId}`;
    const savedTrials = JSON.parse(localStorage.getItem(detailedKey) || '[]');
    localStorage.setItem(detailedKey, JSON.stringify([...savedTrials, { ...newTrial, gradeLabel }]));

    // Update legacy trial_results for the existing analytics chart (student specific)
    const legacyKey = `trial_results_${studentId}`;
    const legacyTrials = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    const legacyTrial = {
      id: newTrial.id,
      date: newTrial.date,
      score: newTrial.totalNet,
      totalQuestions: 100 // placeholder
    };
    localStorage.setItem(legacyKey, JSON.stringify([...legacyTrials, legacyTrial]));

    // Update topic errors for analytics (student specific)
    const errorsKey = `topic_errors_${studentId}`;
    const legacyErrors = JSON.parse(localStorage.getItem(errorsKey) || '[]');
    Object.entries(trialResults).forEach(([_, data]) => {
      const res = data as { wrongTopics: { topic: string; count: number }[] };
      if (res?.wrongTopics) {
        res.wrongTopics.forEach(item => {
          const existing = legacyErrors.find((e: any) => e.topic === item.topic);
          if (existing) {
            existing.count += item.count;
          } else {
            legacyErrors.push({ id: Math.random().toString(36).substr(2, 9), topic: item.topic, count: item.count });
          }
        });
      }
    });
    localStorage.setItem(errorsKey, JSON.stringify(legacyErrors));

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/analytics');
    }, 2000);
  };

  const isMaarif = activeGradeCategory === '9' || activeGradeCategory === '10';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">Deneme & Sınav Sonucu Gir</h3>
            {isMaarif && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-black border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Maarif Modeli
              </span>
            )}
          </div>
          <p className="text-on-surface-variant font-medium text-sm">Ders bazlı netlerinizi ve Türkiye Yüzyılı Maarif Modeli konu analizlerinizi kaydedin.</p>
        </div>
      </div>

      {/* Sınıf / Seviye Seçim Çubuğu */}
      <div className="bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveGradeCategory('8')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeGradeCategory === '8'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          8. Sınıf (LGS)
        </button>

        <button
          type="button"
          onClick={() => setActiveGradeCategory('9')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeGradeCategory === '9'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          9. Sınıf (Maarif Modeli)
        </button>

        <button
          type="button"
          onClick={() => setActiveGradeCategory('10')}
          className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeGradeCategory === '10'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          10. Sınıf (Maarif Modeli)
        </button>

        <button
          type="button"
          onClick={() => setActiveGradeCategory('yks')}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeGradeCategory === 'yks'
              ? 'bg-primary text-white shadow-md'
              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          11 & 12. Sınıf (YKS)
        </button>
      </div>

      {/* Maarif Modeli Bilgilendirme Kartı */}
      {isMaarif && (
        <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-secondary/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-on-surface">
              {activeGradeCategory}. Sınıf MEB Türkiye Yüzyılı Maarif Modeli Müfredatı Aktif
            </p>
            <p className="text-on-surface-variant mt-0.5">
              Beceri temelli soru kalıpları, ortak yazılı sınavlar ve yeni nesil konu başlıkları sisteme tam entegre edilmiştir.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {activeGradeCategory === '8' ? (
          <>
            <div className="mt-4 mb-2">
              <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />
                Sözel Bölüm (50 Soru)
              </h4>
            </div>
            {subjects.filter(s => ['Türkçe', 'İnkılap Tarihi ve Atatürkçülük', 'Din Kültürü ve Ahlak Bilgisi', 'İngilizce'].includes(s.name)).map((subject) => (
              <SubjectCard 
                key={subject.name}
                subject={subject}
                expandedSubject={expandedSubject}
                setExpandedSubject={setExpandedSubject}
                trialResults={trialResults}
                updateResult={updateResult}
                toggleTopic={toggleTopic}
                updateTopicCount={updateTopicCount}
              />
            ))}

            <div className="mt-8 mb-2">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-secondary rounded-full" />
                Sayısal Bölüm (40 Soru)
              </h4>
            </div>
            {subjects.filter(s => ['Matematik', 'Fen ve Teknoloji'].includes(s.name)).map((subject) => (
              <SubjectCard 
                key={subject.name}
                subject={subject}
                expandedSubject={expandedSubject}
                setExpandedSubject={setExpandedSubject}
                trialResults={trialResults}
                updateResult={updateResult}
                toggleTopic={toggleTopic}
                updateTopicCount={updateTopicCount}
              />
            ))}
          </>
        ) : isMaarif ? (
          <>
            <div className="mt-4 mb-2">
              <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />
                Fen & Matematik Bilimleri (Maarif Modeli)
              </h4>
            </div>
            {subjects.filter(s => s.name.includes('Matematik') || s.name.includes('Fizik') || s.name.includes('Kimya') || s.name.includes('Biyoloji')).map((subject) => (
              <SubjectCard 
                key={subject.name}
                subject={subject}
                expandedSubject={expandedSubject}
                setExpandedSubject={setExpandedSubject}
                trialResults={trialResults}
                updateResult={updateResult}
                toggleTopic={toggleTopic}
                updateTopicCount={updateTopicCount}
              />
            ))}

            <div className="mt-8 mb-2">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-secondary rounded-full" />
                Sosyal Bilimler, Türk Dili ve Edebiyatı (Maarif Modeli)
              </h4>
            </div>
            {subjects.filter(s => s.name.includes('Türk Dili') || s.name.includes('Tarih') || s.name.includes('Coğrafya') || s.name.includes('Felsefe') || s.name.includes('Din')).map((subject) => (
              <SubjectCard 
                key={subject.name}
                subject={subject}
                expandedSubject={expandedSubject}
                setExpandedSubject={setExpandedSubject}
                trialResults={trialResults}
                updateResult={updateResult}
                toggleTopic={toggleTopic}
                updateTopicCount={updateTopicCount}
              />
            ))}

            <div className="mt-8 mb-2">
              <h4 className="text-lg font-bold text-tertiary flex items-center gap-2">
                <div className="w-2 h-6 bg-tertiary rounded-full" />
                Yabancı Diller (Maarif Modeli)
              </h4>
            </div>
            {subjects.filter(s => s.name.includes('İngilizce')).map((subject) => (
              <SubjectCard 
                key={subject.name}
                subject={subject}
                expandedSubject={expandedSubject}
                setExpandedSubject={setExpandedSubject}
                trialResults={trialResults}
                updateResult={updateResult}
                toggleTopic={toggleTopic}
                updateTopicCount={updateTopicCount}
              />
            ))}
          </>
        ) : (
          subjects.map((subject) => (
            <SubjectCard 
              key={subject.name}
              subject={subject}
              expandedSubject={expandedSubject}
              setExpandedSubject={setExpandedSubject}
              trialResults={trialResults}
              updateResult={updateResult}
              toggleTopic={toggleTopic}
              updateTopicCount={updateTopicCount}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-40">
        <div className="bg-surface-container-lowest p-6 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 flex items-center justify-between backdrop-blur-md bg-white/90">
          <div className="space-y-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tahmini Toplam Net</p>
            <h4 className="text-3xl font-black text-primary">{calculateTotalNet().toFixed(2)}</h4>
          </div>
          <button 
            onClick={saveTrial}
            className="bg-primary text-white px-12 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <Save className="w-6 h-6" />
            Denemeyi Kaydet
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50"
          >
            <CheckCircle2 className="w-6 h-6" />
            Deneme başarıyla kaydedildi!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
