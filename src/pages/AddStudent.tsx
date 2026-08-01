import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Sparkles, User, School, AtSign, Lock, Eye, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveStudentToFirestore, getTeachersFromFirestore } from '../lib/firestoreService';

export function AddStudent() {
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    username: '',
    password: '',
    teacherId: ''
  });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    getTeachersFromFirestore().then(list => setTeachers(list));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return;

    const newStudent = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      grade: formData.grade || '12. Sınıf',
      username: formData.username,
      password: formData.password || '123456',
      email: `${formData.username}@okul.com`,
      teacherId: formData.teacherId,
      lastTrialScore: 0,
      avatar: `https://picsum.photos/seed/${formData.username}/100/100`,
      role: 'student'
    };

    // Save to Firestore & Local Storage
    await saveStudentToFirestore(newStudent);

    setShowSuccess(true);
    setFormData({ name: '', grade: '', username: '', password: '', teacherId: '' });
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-[2.5rem] shadow-ambient overflow-hidden flex flex-col md:flex-row border border-outline-variant/10">
        {/* Left Sidebar Info */}
        <div className="w-full md:w-2/5 p-12 bg-gradient-to-br from-primary to-primary-container text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <UserPlus className="w-12 h-12 mb-8 opacity-80" />
            <h2 className="text-4xl font-manrope font-extrabold leading-tight mb-6">Yeni Akademik Yolculuk Başlıyor</h2>
            <p className="text-white/80 font-medium leading-relaxed">
              Yeni bir öğrenciyi sisteme dahil ederek eğitim ekosistemimizi büyütün. Lütfen tüm alanları doğru ve eksiksiz doldurun.
            </p>
          </div>

          <div className="mt-12 space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold">Güvenli Kimlik Oluşturma</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold">Akıllı Sınıf Ataması</span>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-secondary/10 rounded-full blur-2xl" />
        </div>

        {/* Right Form */}
        <div className="w-full md:w-3/5 p-12 bg-surface-container-lowest">
          <div className="mb-10">
            <h3 className="text-2xl font-manrope font-bold text-on-surface">Öğrenci Bilgileri</h3>
            <p className="text-sm text-on-surface-variant font-medium">Lütfen temel kimlik ve erişim bilgilerini giriniz.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ad Soyad</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Ahmet Yılmaz" 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface placeholder:text-outline/40 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Sınıf / Grup Ataması</label>
                  <div className="relative group">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                    <select 
                      required
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface appearance-none outline-none"
                    >
                      <option value="">Sınıf Seçiniz</option>
                      <option value="8. Sınıf">8. Sınıf (LGS)</option>
                      <option value="12-A">12-A Sınıfı</option>
                      <option value="12-B">12-B Sınıfı</option>
                      <option value="11-C">11-C Sınıfı</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Danışman Öğretmen</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                    <select 
                      required
                      value={formData.teacherId}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface appearance-none outline-none"
                    >
                      <option value="">Öğretmen Seçiniz</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Kullanıcı Adı</label>
                  <div className="relative group">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="ayilmaz2024" 
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Başlangıç Şifresi</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••" 
                      className="w-full pl-12 pr-12 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <button 
                type="button" 
                onClick={() => setFormData({ name: '', grade: '', username: '', password: '' })}
                className="w-full md:w-auto px-10 py-4 text-on-surface font-bold hover:bg-surface-container-high rounded-full transition-all order-2 md:order-1"
              >
                İptal Et
              </button>
              <button 
                type="submit" 
                className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all order-1 md:order-2 flex items-center justify-center gap-2"
              >
                <span>Öğrenciyi Kaydet</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50"
          >
            <CheckCircle2 className="w-6 h-6" />
            Öğrenci başarıyla kaydedildi!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
