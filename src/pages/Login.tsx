import React, { useState, useEffect } from 'react';
import { LogIn, User, Lock, ArrowRight, ShieldCheck, Sparkles, Mail, CheckCircle2, AlertTriangle, X, KeyRound, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithFirebase, seedFirestoreIfEmpty, syncFirestoreToLocalStorage } from '../lib/firestoreService';

export function Login() {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [foundAccount, setFoundAccount] = useState<any | null>(null);
  const [forgotError, setForgotError] = useState('');
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Sync Firestore data & Seed defaults if empty
    seedFirestoreIfEmpty();
    syncFirestoreToLocalStorage();

    // 1. Pre-populate teachers if empty
    const savedTeachers = localStorage.getItem('teachers');
    if (!savedTeachers || JSON.parse(savedTeachers).length === 0) {
      const defaultTeachers = [
        { 
          id: '1', 
          name: 'Dr. Ahmet Yılmaz', 
          department: 'Matematik', 
          email: 'ahmet@okul.com', 
          status: 'Aktif', 
          username: 'ahmet_y', 
          password: 'password123', 
          image: 'https://picsum.photos/seed/t1/100/100',
          role: 'teacher'
        },
        { 
          id: '2', 
          name: 'Prof. Ayşe Demir', 
          department: 'Fizik', 
          email: 'ayse@okul.com', 
          status: 'Aktif', 
          username: 'ayse_d', 
          password: 'password123', 
          image: 'https://picsum.photos/seed/t2/100/100',
          role: 'teacher'
        }
      ];
      localStorage.setItem('teachers', JSON.stringify(defaultTeachers));
    }

    // 2. Pre-populate students if empty
    const savedStudents = localStorage.getItem('students');
    if (!savedStudents || JSON.parse(savedStudents).length === 0) {
      const defaultStudents = [
        { 
          id: '1', 
          name: 'Ahmet Yılmaz', 
          grade: '12. Sınıf', 
          lastTrialScore: 85.5, 
          avatar: 'https://picsum.photos/seed/s1/100/100', 
          image: 'https://picsum.photos/seed/s1/100/100',
          username: 'ahmet', 
          password: '123', 
          teacherId: '1',
          completion: 78,
          lastActive: '5 dakika önce',
          role: 'student'
        },
        { 
          id: '2', 
          name: 'Ayşe Demir', 
          grade: '11. Sınıf', 
          lastTrialScore: 72.0, 
          avatar: 'https://picsum.photos/seed/s2/100/100', 
          image: 'https://picsum.photos/seed/s2/100/100',
          username: 'ayse', 
          password: '123', 
          teacherId: '1',
          completion: 64,
          lastActive: '2 saat önce',
          role: 'student'
        },
        { 
          id: '3', 
          name: 'Can Özkan', 
          grade: '12. Sınıf', 
          lastTrialScore: 91.2, 
          avatar: 'https://picsum.photos/seed/s3/100/100', 
          image: 'https://picsum.photos/seed/s3/100/100',
          username: 'can', 
          password: '123', 
          teacherId: '1',
          completion: 88,
          lastActive: 'Bugün 10:00',
          role: 'student'
        }
      ];
      localStorage.setItem('students', JSON.stringify(defaultStudents));
    }
  }, []);

  const handleForgotSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setEmailSentStatus(null);
    setFoundAccount(null);

    const query = forgotInput.trim().toLowerCase();
    if (!query) {
      setForgotError('Lütfen kullanıcı adı veya e-posta adresi girin.');
      return;
    }

    const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const savedTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');

    const studentMatch = savedStudents.find((s: any) => 
      s.username?.toLowerCase() === query || s.email?.toLowerCase() === query
    );

    if (studentMatch) {
      setFoundAccount({ ...studentMatch, accountType: 'Öğrenci', storageKey: 'students' });
      return;
    }

    const teacherMatch = savedTeachers.find((t: any) => 
      t.username?.toLowerCase() === query || t.email?.toLowerCase() === query
    );

    if (teacherMatch) {
      setFoundAccount({ ...teacherMatch, accountType: 'Öğretmen', storageKey: 'teachers' });
      return;
    }

    if (query === 'köksal' || query === 'koksal' || query === 'admin') {
      setFoundAccount({
        name: 'Sistem Yöneticisi',
        username: 'köksal',
        password: 'köksal123',
        email: 'admin@okul.com',
        accountType: 'Yönetici'
      });
      return;
    }

    setForgotError('Girdiğiniz kullanıcı adı veya e-posta adresiyle eşleşen hesap bulunamadı.');
  };

  const sendPasswordEmail = () => {
    if (!foundAccount) return;

    const email = foundAccount.email || `${foundAccount.username}@okul.com`;
    const subject = encodeURIComponent('Şifre Hatırlatma / E-Okul Portalı');
    const body = encodeURIComponent(
      `Merhaba ${foundAccount.name},\n\nHesap şifre hatırlatma talebiniz üzerine giriş bilgileriniz aşağıdadır:\n\n` +
      `Kullanıcı Adı: ${foundAccount.username}\n` +
      `Şifre: ${foundAccount.password}\n\n` +
      `İyi çalışmalar dileriz.`
    );

    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    setEmailSentStatus(`E-posta istemciniz (${email}) adresine e-posta taslağıyla açıldı!`);
  };

  const handleResetPassword = () => {
    if (!foundAccount || !newPassword.trim()) return;

    if (foundAccount.storageKey) {
      const list = JSON.parse(localStorage.getItem(foundAccount.storageKey) || '[]');
      const updated = list.map((item: any) => {
        if (item.id === foundAccount.id) {
          return { ...item, password: newPassword.trim() };
        }
        return item;
      });
      localStorage.setItem(foundAccount.storageKey, JSON.stringify(updated));
    }

    setFoundAccount((prev: any) => prev ? { ...prev, password: newPassword.trim() } : null);
    setEmailSentStatus('Şifreniz başarıyla güncellendi!');
    setNewPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Kullanıcı adı veya e-posta ve şifre zorunludur.');
      return;
    }

    setLoading(true);
    try {
      // First attempt real Firebase Auth
      await loginWithFirebase(cleanUsername, cleanPassword);
      setSuccessMsg('Firebase ile başarıyla giriş yapıldı! Yönlendiriliyorsunuz...');
      const userRole = localStorage.getItem('userRole');
      setTimeout(() => {
        if (userRole === 'student') navigate('/portal');
        else if (userRole === 'teacher') navigate('/my-students');
        else navigate('/');
      }, 600);
      return;
    } catch (firebaseErr: any) {
      console.log('Firebase login fallback checking local credentials...', firebaseErr);
    } finally {
      setLoading(false);
    }

    // Local / Demo fallbacks
    const tryStudent = () => {
      const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
      const student = savedStudents.find((s: any) => 
        (s.username?.trim().toLowerCase() === cleanUsername.toLowerCase() || s.email?.trim().toLowerCase() === cleanUsername.toLowerCase()) && 
        s.password === cleanPassword
      );
      
      if (student) {
        localStorage.setItem('userRole', 'student');
        localStorage.setItem('currentUserId', student.id);
        localStorage.setItem('currentUserName', student.name);
        localStorage.setItem('currentUserGrade', student.grade || '12. Sınıf');
        navigate('/portal');
        return true;
      }
      if (cleanUsername.toLowerCase() === 'ogrenci' && cleanPassword === '123') {
        localStorage.setItem('userRole', 'student');
        localStorage.setItem('currentUserId', '1');
        localStorage.setItem('currentUserName', 'Ahmet Yılmaz');
        localStorage.setItem('currentUserGrade', '12. Sınıf');
        navigate('/portal');
        return true;
      }
      return false;
    };

    const tryTeacher = () => {
      const savedTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');
      const teacher = savedTeachers.find((t: any) => 
        (t.username?.trim().toLowerCase() === cleanUsername.toLowerCase() || t.email?.trim().toLowerCase() === cleanUsername.toLowerCase()) && 
        t.password === cleanPassword
      );
      
      if (teacher) {
        localStorage.setItem('userRole', 'teacher');
        localStorage.setItem('currentUserId', teacher.id);
        localStorage.setItem('currentUserName', teacher.name);
        localStorage.setItem('currentUserEmail', teacher.email || '');
        navigate('/my-students');
        return true;
      }
      if (cleanUsername.toLowerCase() === 'hoca' && cleanPassword === '123') {
        localStorage.setItem('userRole', 'teacher');
        localStorage.setItem('currentUserId', '1');
        localStorage.setItem('currentUserName', 'Dr. Ahmet Yılmaz');
        localStorage.setItem('currentUserEmail', 'ahmet@okul.com');
        navigate('/my-students');
        return true;
      }
      return false;
    };

    const tryAdmin = () => {
      if ((cleanUsername.toLowerCase() === 'köksal' || cleanUsername.toLowerCase() === 'koksal' || cleanUsername.toLowerCase() === 'admin') && (cleanPassword === 'köksal123' || cleanPassword === 'koksal123' || cleanPassword === 'admin123')) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('currentUserId', 'admin');
        localStorage.setItem('currentUserName', 'Sistem Yöneticisi');
        navigate('/');
        return true;
      }
      return false;
    };

    if (role === 'student' && tryStudent()) return;
    if (role === 'teacher' && tryTeacher()) return;
    if (role === 'admin' && tryAdmin()) return;

    if (tryTeacher()) return;
    if (tryStudent()) return;
    if (tryAdmin()) return;

    setError('Geçersiz kullanıcı adı/e-posta veya şifre.');
  };

  const fillDemo = (demoRole: 'student' | 'teacher' | 'teacher2' | 'admin') => {
    setError('');
    if (demoRole === 'teacher') {
      setRole('teacher');
      setUsername('ahmet_y');
      setPassword('password123');
    } else if (demoRole === 'teacher2') {
      setRole('teacher');
      setUsername('ayse_d');
      setPassword('password123');
    } else if (demoRole === 'student') {
      setRole('student');
      setUsername('ahmet');
      setPassword('123');
    } else if (demoRole === 'admin') {
      setRole('admin');
      setUsername('köksal');
      setPassword('köksal123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-3 sm:p-6">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-[2rem] sm:rounded-[2.5rem] shadow-ambient overflow-hidden flex flex-col md:flex-row border border-outline-variant/10">
        {/* Left Side - Branding/Info */}
        <div className="w-full md:w-2/5 p-6 sm:p-8 md:p-12 bg-gradient-to-br from-primary to-primary-container text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8">
              <LogIn className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-manrope font-extrabold leading-tight mb-6">Akademik Yolculuğuna Devam Et</h2>
            <p className="text-white/80 font-medium leading-relaxed">
              Scholar Pulse'a hoş geldiniz. Eğitim ekosistemimize erişmek için lütfen kimlik bilgilerinizle giriş yapın.
            </p>
          </div>

          <div className="mt-12 space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold">Güvenli Erişim</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold">Kişiselleştirilmiş Deneyim</span>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-secondary/10 rounded-full blur-2xl" />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-3/5 p-8 md:p-12 bg-surface-container-lowest">
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-manrope font-bold text-on-surface">Hoş Geldiniz</h3>
              <p className="text-sm text-on-surface-variant font-medium">Sistemdeki yetkili hesabınızla oturum açın.</p>
            </div>

            {/* Role Toggle */}
            <div className="flex p-1 bg-surface-container-high rounded-2xl mb-6">
              <button 
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'student' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Öğrenci
              </button>
              <button 
                type="button"
                onClick={() => setRole('teacher')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'teacher' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Öğretmen
              </button>
              <button 
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Yönetici
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Kullanıcı Adı veya E-Posta</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Örn: ahmet veya ahmet@okul.com" 
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Şifre</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline transition-colors group-focus-within:text-primary" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20" />
                  <span className="text-xs font-medium text-on-surface-variant">Beni hatırla</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setForgotInput('');
                    setFoundAccount(null);
                    setForgotError('');
                    setEmailSentStatus(null);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Şifremi unuttum
                </button>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Oturum Aç</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-outline-variant/15 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-center">Hızlı Demolar - Tıklayıp Deneyin</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  type="button"
                  onClick={() => fillDemo('teacher')}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-on-surface-variant transition-all border border-outline-variant/10"
                >
                  👨‍🏫 Öğretmen (Ahmet Y.)
                </button>
                <button 
                  type="button"
                  onClick={() => fillDemo('teacher2')}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-on-surface-variant transition-all border border-outline-variant/10"
                >
                  👩‍🏫 Öğretmen (Ayşe D.)
                </button>
                <button 
                  type="button"
                  onClick={() => fillDemo('student')}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-on-surface-variant transition-all border border-outline-variant/10"
                >
                  🎓 Öğrenci (Ahmet)
                </button>
                <button 
                  type="button"
                  onClick={() => fillDemo('admin')}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-on-surface-variant transition-all border border-outline-variant/10"
                >
                  ⚙️ Yönetici (Köksal)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password / Send Reset Email Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-on-surface">Şifremi Unuttum</h4>
                    <p className="text-xs text-on-surface-variant">Hesabınızı bulun ve e-posta ile şifrenizi sıfırlayın.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!foundAccount ? (
                <form onSubmit={handleForgotSearch} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Kullanıcı Adı veya E-Posta</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                      <input 
                        type="text"
                        required
                        value={forgotInput}
                        onChange={(e) => setForgotInput(e.target.value)}
                        placeholder="Örn: ahmet veya ahmet@okul.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Hesabı Ara & Bul</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">{foundAccount.accountType || 'Kullanıcı'} Hesabı</span>
                      <span className="text-xs text-on-surface-variant font-medium">Sistemde Kayıtlı</span>
                    </div>
                    <p className="font-extrabold text-lg text-on-surface">{foundAccount.name}</p>
                    <p className="text-xs text-on-surface-variant">Kullanıcı Adı: <span className="font-mono text-on-surface font-bold">{foundAccount.username}</span></p>
                    <p className="text-xs text-on-surface-variant">E-Posta: <span className="font-mono text-on-surface font-bold">{foundAccount.email || 'Belirtilmemiş'}</span></p>
                    <p className="text-xs text-on-surface-variant">Mevcut Şifre: <span className="font-mono text-secondary font-bold">{foundAccount.password}</span></p>
                  </div>

                  {emailSentStatus && (
                    <div className="p-3 bg-tertiary/10 text-tertiary rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{emailSentStatus}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button 
                      type="button"
                      onClick={sendPasswordEmail}
                      className="w-full py-3.5 bg-gradient-to-r from-secondary to-secondary-container text-white font-bold rounded-2xl shadow-lg shadow-secondary/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      <span>E-Posta ile Şifre Gönder (Mail)</span>
                    </button>

                    <div className="pt-2 border-t border-outline-variant/10 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Veya Yeni Şifre Belirleyin</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Yeni şifre yazın..."
                          className="flex-grow px-4 py-3 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button 
                          type="button"
                          onClick={handleResetPassword}
                          className="px-5 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all whitespace-nowrap"
                        >
                          Güncelle
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setFoundAccount(null);
                      setForgotInput('');
                    }}
                    className="w-full py-2.5 bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-xl hover:bg-surface-container-highest transition-colors"
                  >
                    Başka Bir Hesap Ara
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
