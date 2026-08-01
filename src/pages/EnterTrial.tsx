import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface Subject {
  name: string;
  topics: string[];
}

const SUBJECTS_12: Subject[] = [
  { 
    name: 'Matematik', 
    topics: ['Sayılar', 'Polinomlar', 'Türev', 'İntegral', 'Trigonometri', 'Logaritma', 'Fonksiyonlar', 'Geometri'] 
  },
  { 
    name: 'Türkçe', 
    topics: ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Dil Bilgisi'] 
  },
  { 
    name: 'Fizik', 
    topics: ['Kuvvet ve Hareket', 'Optik', 'Elektrik ve Manyetizma', 'Dalgalar', 'Modern Fizik'] 
  },
  { 
    name: 'Kimya', 
    topics: ['Atom ve Periyodik Sistem', 'Mol Kavramı', 'Asitler, Bazlar ve Tuzlar', 'Kimyasal Tepkimeler'] 
  },
  { 
    name: 'Biyoloji', 
    topics: ['Hücre', 'Kalıtım', 'Sistemler', 'Ekoloji', 'Canlıların Temel Bileşenleri'] 
  }
];

const SUBJECTS_8: Subject[] = [
  { 
    name: 'Matematik', 
    topics: ['Çarpanlar ve Katlar', 'Üslü İfadeler', 'Kareköklü İfadeler', 'Veri Analizi', 'Olasılık', 'Cebirsel İfadeler', 'Doğrusal Denklemler', 'Eşitsizlikler', 'Üçgenler', 'Eşlik ve Benzerlik', 'Dönüşüm Geometrisi', 'Geometrik Cisimler'] 
  },
  { 
    name: 'Türkçe', 
    topics: ['Fiilimsiler', 'Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Cümlenin Ögeleri', 'Fiilde Çatı', 'Cümle Türleri', 'Anlatım Bozuklukları', 'Sözel Mantık'] 
  },
  { 
    name: 'Fen ve Teknoloji', 
    topics: ['Mevsimler ve İklim', 'DNA ve Genetik Kod', 'Basınç', 'Madde ve Endüstri', 'Basit Makineler', 'Enerji Dönüşümleri', 'Elektrik Yükleri'] 
  },
  { 
    name: 'İnkılap Tarihi ve Atatürkçülük', 
    topics: ['Bir Kahraman Doğuyor', 'Milli Uyanış', 'Ya İstiklal Ya Ölüm', 'Atatürkçülük', 'Demokratikleşme Çabaları', 'Dış Politika', 'Atatürk\'ün Ölümü'] 
  },
  { 
    name: 'Din Kültürü ve Ahlak Bilgisi', 
    topics: ['Kader İnancı', 'Zekat ve Sadaka', 'Din ve Hayat', 'Hz. Muhammed\'in Örnekliği', 'Kur\'an-ı Kerim'] 
  },
  { 
    name: 'İngilizce', 
    topics: ['Friendship', 'Teen Life', 'In the Kitchen', 'On the Phone', 'The Internet', 'Adventures', 'Tourism', 'Chores', 'Science', 'Natural Forces'] 
  }
];

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
  const studentGrade = localStorage.getItem('currentUserGrade') || '12. Sınıf';
  const subjects = studentGrade.includes('8') ? SUBJECTS_8 : SUBJECTS_12;

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

  const [expandedSubject, setExpandedSubject] = useState<string | null>(subjects[0].name);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateResult = (subject: string, field: 'correct' | 'incorrect', value: number) => {
    setTrialResults(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: Math.max(0, value)
      }
    }));
  };

  const toggleTopic = (subject: string, topic: string) => {
    setTrialResults(prev => {
      const current = prev[subject];
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
      const current = prev[subject];
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
      total += res.correct - (res.incorrect * 0.25);
    });
    return Math.max(0, total);
  };

  const saveTrial = () => {
    const studentId = localStorage.getItem('currentUserId');
    if (!studentId) return;

    const newTrial: TrialData = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      results: trialResults,
      totalNet: calculateTotalNet()
    };

    // Save to trial results history (student specific)
    const detailedKey = `trial_results_detailed_${studentId}`;
    const savedTrials = JSON.parse(localStorage.getItem(detailedKey) || '[]');
    localStorage.setItem(detailedKey, JSON.stringify([...savedTrials, newTrial]));

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
      res.wrongTopics.forEach(item => {
        const existing = legacyErrors.find((e: any) => e.topic === item.topic);
        if (existing) {
          existing.count += item.count;
        } else {
          legacyErrors.push({ id: Math.random().toString(36).substr(2, 9), topic: item.topic, count: item.count });
        }
      });
    });
    localStorage.setItem(errorsKey, JSON.stringify(legacyErrors));

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/analytics');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-1">
        <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Deneme Sonucu Gir</h3>
        <p className="text-on-surface-variant font-medium">Ders bazlı sonuçlarını ve yanlış yaptığın konuları işaretle.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {studentGrade.includes('8') ? (
          <>
            <div className="mt-8 mb-4">
              <h4 className="text-xl font-bold text-primary flex items-center gap-2">
                <div className="w-2 h-8 bg-primary rounded-full" />
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

            <div className="mt-12 mb-4">
              <h4 className="text-xl font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-8 bg-secondary rounded-full" />
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
