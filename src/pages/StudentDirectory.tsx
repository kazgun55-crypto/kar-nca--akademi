import React, { useState, useEffect } from 'react';
import { MoreVertical, Eye, ChevronLeft, ChevronRight, Users, Trash2, Edit, AlertTriangle, CheckCircle2, X, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { saveStudentToFirestore, deleteStudentFromFirestore, subscribeStudents, subscribeTeachers } from '../lib/firestoreService';

export function StudentDirectory() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Edit & Delete Modal States
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubStudents = subscribeStudents((list) => {
      setStudents(list);
    });

    const unsubTeachers = subscribeTeachers((list) => {
      setTeachers(list);
    });

    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendMail = (student: any) => {
    const email = student.email || `${student.username}@okul.com`;
    const subject = encodeURIComponent('Öğrenci Giriş Bilgileri - Scholar Pulse');
    const body = encodeURIComponent(
      `Merhaba ${student.name},\n\nE-Okul / Scholar Pulse portalı giriş bilgileriniz aşağıdadır:\n\n` +
      `Kullanıcı Adı: ${student.username}\n` +
      `Şifre: ${student.password}\n\n` +
      `Giriş Yapmak İçin Portal Adresi: ${window.location.origin}\n\n` +
      `Başarılar dileriz!`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    showToast(`${student.name} için giriş bilgileri e-posta taslağı olarak açıldı.`);
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;

    await deleteStudentFromFirestore(deletingStudent.id);
    showToast(`${deletingStudent.name} sistemden silindi.`);
    setDeletingStudent(null);
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    await saveStudentToFirestore(editingStudent);
    showToast(`${editingStudent.name} bilgileri güncellendi.`);
    setEditingStudent(null);
  };

  const getTeacherName = (teacherId: string) => {
    if (!teacherId) return 'Atanmadı';
    const found = teachers.find(t => t.id === teacherId);
    return found ? found.name : 'Atanmadı';
  };

  const uniqueClasses = Array.from(new Set(students.map(s => s.grade)));

  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.grade === selectedClass);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-4xl font-extrabold tracking-tight text-on-surface">Öğrenci Listesi</h3>
          <p className="text-on-surface-variant font-medium font-sans">Tüm kayıtlı öğrencileri buradan görüntüleyin ve yönetin.</p>
        </div>
        <Link 
          to="/students/new"
          className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          <Users className="w-5 h-5" />
          Yeni Öğrenci Ekle
        </Link>
      </div>

      {/* Sınıf Filtreleri */}
      {uniqueClasses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedClass('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedClass === 'all'
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Tüm Sınıflar ({students.length})
          </button>
          {uniqueClasses.map((cls) => {
            const count = students.filter(s => s.grade === cls).length;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedClass === cls
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Ad Soyad</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Danışman Öğretmen</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Giriş Bilgileri</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Tamamlama Oranı</th>
                <th className="px-6 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider">Son Aktivite</th>
                <th className="px-8 py-5 text-on-surface-variant font-bold text-xs uppercase tracking-wider text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-surface-container-highest overflow-hidden ring-2 ring-white">
                        <img src={student.avatar || student.image || 'https://picsum.photos/seed/s1/100/100'} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{student.name}</p>
                        <p className="text-xs text-on-surface-variant">{student.grade}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-medium text-on-surface">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.teacherId ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {getTeacherName(student.teacherId)}
                    </span>
                  </td>
                  <td className="px-6 py-6 font-medium text-on-surface">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-on-surface">K: <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{student.username}</span></p>
                      <p className="text-xs font-bold text-on-surface">Ş: <span className="font-mono text-secondary bg-secondary/5 px-2 py-0.5 rounded">{student.password}</span></p>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-grow bg-surface-container-high h-1.5 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            (student.completion || 0) > 80 ? "bg-tertiary" : (student.completion || 0) > 50 ? "bg-primary" : "bg-secondary"
                          )} 
                          style={{ width: `${student.completion || 0}%` }} 
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-bold",
                        (student.completion || 0) > 80 ? "text-tertiary" : (student.completion || 0) > 50 ? "text-primary" : "text-secondary"
                      )}>
                        {student.completion || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-sm text-on-surface-variant font-medium">{student.lastActive || 'Henüz aktif değil'}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleSendMail(student)}
                        title="Giriş Bilgilerini E-Posta ile Gönder"
                        className="p-2 rounded-xl hover:bg-white transition-colors text-outline hover:text-secondary"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setEditingStudent({ ...student })}
                        title="Öğrenciyi Düzenle / Öğretmen Ata"
                        className="p-2 rounded-xl hover:bg-white transition-colors text-outline hover:text-primary"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingStudent(student);
                          setShowDeleteConfirm(true);
                        }}
                        title="Öğrenciyi Sil"
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
        
        <div className="px-8 py-4 bg-surface-container-low flex justify-between items-center text-xs text-on-surface-variant font-bold">
          <span>Toplam {filteredStudents.length} / {students.length} öğrenci listeleniyor</span>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-1 px-3 rounded bg-primary text-white">1</button>
            <button className="p-1 rounded hover:bg-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
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
                    <h4 className="text-xl font-bold text-on-surface">Öğrenci Düzenle & Danışman Ata</h4>
                    <p className="text-xs text-on-surface-variant">{editingStudent.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingStudent(null)}
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
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Sınıf</label>
                    <input 
                      type="text"
                      required
                      value={editingStudent.grade}
                      onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Danışman Öğretmen</label>
                    <select
                      value={editingStudent.teacherId || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, teacherId: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Danışman Yok --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.department || 'Öğretmen'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Kullanıcı Adı</label>
                    <input 
                      type="text"
                      required
                      value={editingStudent.username}
                      onChange={(e) => setEditingStudent({ ...editingStudent, username: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Şifre</label>
                    <input 
                      type="text"
                      required
                      value={editingStudent.password}
                      onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingStudent(null)}
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

      {/* Delete Student Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && deletingStudent && (
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
                <h4 className="text-2xl font-bold text-on-surface">Öğrenciyi Sil?</h4>
                <p className="text-sm text-on-surface-variant">
                  <strong className="text-on-surface">{deletingStudent.name}</strong> isimli öğrenciyi sistemden silmek istediğinize emin misiniz?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingStudent(null);
                  }}
                  className="flex-1 py-4 bg-surface-container-high text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-highest transition-colors"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={handleDeleteStudent}
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
