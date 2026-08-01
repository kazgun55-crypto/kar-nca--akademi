import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Verified, FileText, Mail, Sparkles, Timer, Calendar, UserCheck } from 'lucide-react';
import { StatCard } from '@/src/components/StatCard';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [studentCount, setStudentCount] = useState<number>(0);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number>(0);

  useEffect(() => {
    const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const savedTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');

    setStudentCount(savedStudents.length);
    setTeacherCount(savedTeachers.length);

    if (savedStudents.length > 0) {
      const totalComp = savedStudents.reduce((acc: number, s: any) => acc + (s.completion || 75), 0);
      setAvgScore(Math.round(totalComp / savedStudents.length));
    } else {
      setAvgScore(0);
    }
  }, []);

  const calculateCountdownDays = (examType: 'LGS' | 'YKS') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let examYear = now.getFullYear();
    let examMonth = 5; // June is 5 (0-indexed)
    let examDay = examType === 'LGS' ? 6 : 19; // June 6 or June 19
    
    let examDate = new Date(examYear, examMonth, examDay);
    if (today > examDate) {
      examDate = new Date(examYear + 1, examMonth, examDay);
    }
    
    const diffTime = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const lgsDays = calculateCountdownDays('LGS');
  const yksDays = calculateCountdownDays('YKS');

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">Öğrenci Yönetimi</h3>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium">Akademik gelişim ve erişim kontrollerini buradan yönetin.</p>
        </div>
        <Link 
          to="/students/new"
          className="bg-gradient-to-br from-primary to-primary-container text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-sm sm:text-base w-full sm:w-auto"
        >
          <Users className="w-5 h-5" />
          Yeni Öğrenci Ekle
        </Link>
      </section>

      {/* Sınav Geri Sayım Sayaçları Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-gradient-to-r from-primary/5 to-secondary/5 border border-outline-variant/10 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <StatCard 
            label="Ortalama Başarı Oranı" 
            value={studentCount > 0 ? `%${avgScore}` : '%0'} 
            icon={TrendingUp} 
            trend="Aktif öğrenci verilerine dayanır" 
            color="secondary"
            progress={avgScore}
          />
        </div>
        <StatCard 
          label="Sistemdeki Öğrenci Sayısı" 
          value={studentCount.toString()} 
          icon={Users} 
          color="primary"
        />
        <StatCard 
          label="Kayıtlı Öğretmen Sayısı" 
          value={teacherCount.toString()} 
          icon={UserCheck} 
          color="tertiary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h4 className="text-xl font-bold">Hızlı Erişim & Araçlar</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-surface-container-high rounded-2xl flex items-center gap-5 hover:bg-surface-container-highest transition-colors cursor-pointer group shadow-sm">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Excel'den İçe Aktar</p>
                <p className="text-xs text-on-surface-variant">Toplu öğrenci listesi yükleyin.</p>
              </div>
            </div>
            <div className="p-6 bg-surface-container-high rounded-2xl flex items-center gap-5 hover:bg-surface-container-highest transition-colors cursor-pointer group shadow-sm">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-secondary shadow-sm group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Toplu Mesaj Gönder</p>
                <p className="text-xs text-on-surface-variant">Tüm sınıfa duyuru yapın.</p>
              </div>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary/5 p-8 rounded-2xl border border-secondary/10 flex flex-col items-center text-center space-y-4 shadow-ambient"
        >
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center text-white shadow-xl shadow-secondary/30">
            <Sparkles className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-bold text-on-surface">Yapay Zeka Öngörüsü</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            3 öğrenci son bir haftadır tamamlama oranında düşüş yaşıyor. Onlarla bireysel bir görüşme planlamak isteyebilirsiniz.
          </p>
          <button className="bg-secondary text-white px-8 py-3 rounded-full text-sm font-bold mt-2 shadow-lg shadow-secondary/20 hover:scale-105 active:scale-95 transition-all">
            Detayları Gör
          </button>
        </motion.div>
      </div>
    </div>
  );
}
