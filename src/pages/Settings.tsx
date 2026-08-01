import React, { useState, useRef } from 'react';
import { User, Lock, Camera, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [profileImage, setProfileImage] = useState('https://picsum.photos/seed/user/200/200');
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile State
  const [name, setName] = useState('Kullanıcı Adı');
  const [email, setEmail] = useState('user@example.com');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        triggerSuccess();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSuccess();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPassword !== confirmPassword) {
      setPassError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    // Simulate password change
    triggerSuccess();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-1">
        <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Ayarlar</h3>
        <p className="text-on-surface-variant font-medium">Hesap bilgilerinizi ve güvenlik tercihlerinizi yönetin.</p>
      </div>

      <div className="flex p-1 bg-surface-container-high rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <User className="w-4 h-4" />
          Profil Bilgileri
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <Lock className="w-4 h-4" />
          Güvenlik & Şifre
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-ambient border border-outline-variant/10 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-10 space-y-10"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-[2rem] overflow-hidden ring-4 ring-primary/10 shadow-xl">
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h4 className="text-2xl font-bold text-on-surface">Profil Fotoğrafı</h4>
                  <p className="text-sm text-on-surface-variant">JPG, GIF veya PNG. Maksimum 2MB.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ad Soyad</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">E-Posta</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end pt-4">
                  <button 
                    type="submit"
                    className="bg-primary text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="security"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-10 space-y-8"
            >
              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-on-surface">Şifre Değiştir</h4>
                <p className="text-sm text-on-surface-variant">Hesabınızı güvende tutmak için güçlü bir şifre kullanın.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-6">
                {passError && (
                  <div className="p-4 bg-secondary/10 text-secondary rounded-2xl flex items-center gap-3 text-sm font-bold border border-secondary/20">
                    <AlertCircle className="w-5 h-5" />
                    {passError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Mevcut Şifre</label>
                  <input 
                    type="password" 
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Yeni Şifre</label>
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Yeni Şifre (Tekrar)</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button 
                    type="submit"
                    className="bg-primary text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Şifreyi Güncelle
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
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
            Başarıyla güncellendi!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
