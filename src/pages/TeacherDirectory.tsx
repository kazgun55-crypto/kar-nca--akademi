import React, { useState, useEffect } from 'react';
import { MoreVertical, Eye, ChevronLeft, ChevronRight, UserPlus, Mail, Calendar, Trash2, Edit, ShieldCheck, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export function TeacherDirectory() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  
  // Edit & Delete Modal States
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const savedTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');
    const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
    const savedMeetings = JSON.parse(localStorage.getItem('meetings') || '[]');
    
    if (savedTeachers.length === 0) {
      const defaults = [
        { id: '1', name: 'Dr. Ahmet Yılmaz', department: 'Matematik', email: 'ahmet@okul.com', status: 'Aktif', username: 'ahmet_y', password: 'password123', image: 'https://picsum.photos/seed/t1/100/100' },
        { id: '2', name: 'Prof. Ayşe Demir', department: 'Fizik', email: 'ayse@okul.com', status: 'Aktif', username: 'ayse_d', password: 'password123', image: 'https://picsum.photos/seed/t2/100/100' },
      ];
      setTeachers(defaults);
      localStorage.setItem('teachers', JSON.stringify(defaults));
    } else {
      setTeachers(savedTeachers);
    }
    
    setStudents(savedStudents);
    setMeetings(savedMeetings);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getStudentCount = (teacherId: string) => {
    return students.filter(s => s.teacherId === teacherId).length;
  };

  const getWeeklyMeetingCount = (teacherId: string) => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    return meetings.filter(m => {
      const meetingDate = new Date(m.date);
      return m.teacherId === teacherId && meetingDate >= startOfWeek;
    }).length;
  };

  const handleDeleteTeacher = () => {
    if (!deletingTeacher) return;
    
    const updatedTeachers = teachers.filter(t => t.id !== deletingTeacher.id);
    setTeachers(updatedTeachers);
    localStorage.setItem('teachers', JSON.stringify(updatedTeachers));

    // Remove teacher association from students
    const updatedStudents = students.map(s => s.teacherId === deletingTeacher.id ? { ...s, teacherId: '' } : s);
    setStudents(updatedStudents);
    localStorage.setItem('students', JSON.stringify(updatedStudents));

    showToast(`${deletingTeacher.name} sistemden silindi.`);
    setDeletingTeacher(null);
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const updatedTeachers = teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t);
    setTeachers(updatedTeachers);
    localStorage.setItem('teachers', JSON.stringify(updatedTeachers));

    showToast(`${editingTeacher.name} bilgileri güncellendi.`);
    setEditingTeacher(null);
  };

  const toggleStatus = (teacherId: string) => {
    const updatedTeachers = teachers.map(t => {
      if (t.id === teacherId) {
        const nextStatus = t.status === 'Aktif' ? 'Pasif' : 'Aktif';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTeachers(updatedTeachers);
    localStorage.setItem('teachers', JSON.stringify(updatedTeachers));
    showToast('Öğretmen durumu güncellendi.');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Öğretmen Kadrosu</h3>
          <p className="text-on-surface-variant font-medium">Akademik kadronuzu ve departman yetkilerini buradan yönetin.</p>
        </div>
        <Link 
          to="/teachers/new"
          className="bg-gradient-to-br from-secondary to-secondary-container text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-secondary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <UserPlus className="w-5 h-5" />
          Yeni Öğretmen Ata
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-[2.5rem] overflow-hidden shadow-ambient border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Öğretmen Bilgisi</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Giriş Bilgileri</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Departman</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Öğrenci / Görüşme</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Durum</th>
                <th className="px-8 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-surface-container-highest overflow-hidden ring-2 ring-white shadow-sm">
                        <img src={teacher.image || 'https://picsum.photos/seed/t1/100/100'} alt={teacher.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{teacher.name}</p>
                        <p className="text-xs text-on-surface-variant font-medium">{teacher.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-on-surface">K: <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{teacher.username}</span></p>
                      <p className="text-xs font-bold text-on-surface">Ş: <span className="font-mono text-secondary bg-secondary/5 px-2 py-0.5 rounded">{teacher.password}</span></p>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{teacher.department || 'Genel'}</span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{getStudentCount(teacher.id)}</span>
                        <span className="text-[10px] text-on-surface-variant uppercase font-bold">Öğrenci</span>
                      </div>
                      <div className="flex items-center gap-2 text-tertiary">
                        <Calendar className="w-3 h-3" />
                        <span className="text-sm font-bold">{getWeeklyMeetingCount(teacher.id)}</span>
                        <span className="text-[10px] uppercase font-bold">Görüşme</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <button 
                      onClick={() => toggleStatus(teacher.id)}
                      title="Durumu değiştirmek için tıklayın"
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 ${teacher.status === 'Aktif' ? 'bg-tertiary/10 text-tertiary border border-tertiary/20' : 'bg-outline-variant/20 text-outline border border-outline-variant/30'}`}
                    >
                      {teacher.status || 'Aktif'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <a 
                        href={`mailto:${teacher.email}?subject=${encodeURIComponent('Giriş Bilgileri - Scholar Pulse')}&body=${encodeURIComponent(`Merhaba ${teacher.name},\n\nSistem giriş bilgileriniz:\n- Kullanıcı Adı: ${teacher.username}\n- Şifre: ${teacher.password}\n\nİyi çalışmalar.`)}`}
                        title="E-posta Gönder"
                        className="p-2 rounded-xl hover:bg-white transition-colors text-outline hover:text-primary"
                      >
                        <Mail className="w-5 h-5" />
                      </a>
                      <button 
                        onClick={() => setEditingTeacher({ ...teacher })}
                        title="Öğretmeni Düzenle"
                        className="p-2 rounded-xl hover:bg-white transition-colors text-outline hover:text-primary"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingTeacher(teacher);
                          setShowDeleteConfirm(true);
                        }}
                        title="Öğretmeni Sil"
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors text-outline hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-6 bg-surface-container-low flex justify-between items-center text-xs text-on-surface-variant font-bold">
          <span>Toplam {teachers.length} öğretmen listeleniyor</span>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-1 px-4 rounded bg-primary text-white shadow-lg shadow-primary/20">1</button>
            <button className="p-1 rounded hover:bg-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Edit Teacher Modal */}
      <AnimatePresence>
        {editingTeacher && (
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
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-on-surface">Öğretmen Bilgilerini Düzenle</h4>
                    <p className="text-xs text-on-surface-variant">{editingTeacher.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingTeacher(null)}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ad Soyad</label>
                  <input 
                    type="text"
                    required
                    value={editingTeacher.name}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Kullanıcı Adı</label>
                    <input 
                      type="text"
                      required
                      value={editingTeacher.username}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, username: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Şifre</label>
                    <input 
                      type="text"
                      required
                      value={editingTeacher.password}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Departman / Branş</label>
                    <input 
                      type="text"
                      required
                      value={editingTeacher.department}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, department: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Durum</label>
                    <select
                      value={editingTeacher.status}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, status: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">E-Posta</label>
                  <input 
                    type="email"
                    required
                    value={editingTeacher.email}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingTeacher(null)}
                    className="flex-1 py-3.5 bg-surface-container-high text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-highest transition-colors"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && deletingTeacher && (
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
              className="bg-surface-container-lowest w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-on-surface">Öğretmeni Sil?</h4>
                <p className="text-sm text-on-surface-variant">
                  <strong className="text-on-surface">{deletingTeacher.name}</strong> isimli öğretmeni sistemden silmek istediğinize emin misiniz?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingTeacher(null);
                  }}
                  className="flex-1 py-4 bg-surface-container-high text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-highest transition-colors"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={handleDeleteTeacher}
                  className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-tertiary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-50"
          >
            <CheckCircle2 className="w-6 h-6" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
