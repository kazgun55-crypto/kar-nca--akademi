import React, { useState } from 'react';
import { UserPlus, Shield, Mail, BookOpen, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveTeacherToFirestore } from '../lib/firestoreService';

export function AddTeacher() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Matematik',
    accessLevel: 'Standart Öğretmen',
    username: '',
    password: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTeacher = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      status: 'Aktif',
      image: `https://picsum.photos/seed/${formData.username || formData.name}/100/100`,
      role: 'teacher'
    };

    // Save to Firestore & Local Storage
    await saveTeacherToFirestore(newTeacher);

    setShowSuccess(true);
    setFormData({
      name: '',
      email: '',
      department: 'Matematik',
      accessLevel: 'Standart Öğretmen',
      username: '',
      password: ''
    });
    
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/teachers');
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold text-sm group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Geri Dön
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-manrope font-extrabold text-on-surface">Yeni Öğretmen Ata</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Akademik kadronuza yeni bir uzman ekleyin. Departman yetkilerini ve erişim seviyelerini buradan belirleyebilirsiniz.
            </p>
          </div>

          <div className="bg-surface-container-low p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant">Güvenlik Notu</h4>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-tertiary shrink-0" />
              <p className="text-xs text-on-surface-variant">Öğretmenlere atanan şifreler ilk girişte değiştirilmelidir.</p>
            </div>
          </div>
        </div>

        <div className="flex-grow bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-ambient border border-outline-variant/10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Ad Soyad</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Dr. Ahmet Yılmaz" 
                  className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">E-Posta Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ahmet@okul.com" 
                    className="w-full pl-12 pr-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Departman / Branş</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-12 pr-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none appearance-none"
                  >
                    <option>Matematik</option>
                    <option>Fizik</option>
                    <option>Kimya</option>
                    <option>Biyoloji</option>
                    <option>Edebiyat</option>
                    <option>Tarih</option>
                    <option>Psikolojik Danışman</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Erişim Seviyesi</label>
                <select 
                  value={formData.accessLevel}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                  className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none appearance-none"
                >
                  <option>Standart Öğretmen</option>
                  <option>Bölüm Başkanı</option>
                  <option>Koordinatör</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Kullanıcı Adı</label>
                <input 
                  type="text" 
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="ahmet_y" 
                  className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Şifre</label>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••" 
                  className="w-full px-5 py-4 bg-surface-container-high border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all font-medium text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => navigate(-1)}
                className="px-8 py-4 rounded-full font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                İptal
              </button>
              <button 
                type="submit"
                className="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Öğretmeni Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50 animate-in fade-in slide-in-from-bottom-4">
          Öğretmen başarıyla kaydedildi!
        </div>
      )}
    </div>
  );
}
