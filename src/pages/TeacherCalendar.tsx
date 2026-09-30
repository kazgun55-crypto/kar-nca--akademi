import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus, 
  CheckCircle2, 
  Bell, 
  AlertCircle, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Sparkles,
  CalendarCheck,
  RotateCw,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TeacherMeeting, 
  saveTeacherMeeting, 
  completeTeacherMeeting, 
  deleteTeacherMeeting, 
  subscribeTeacherMeetings,
  subscribeStudents 
} from '../lib/firestoreService';

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const MEETING_TYPES = [
  { id: 'coaching', label: 'Birebir Koçluk Görüşmesi', color: 'bg-primary/10 text-primary border-primary/20' },
  { id: 'exam_analysis', label: 'Deneme & Hata Analizi', color: 'bg-secondary/10 text-secondary border-secondary/20' },
  { id: 'homework_check', label: 'Haftalık Ödev & İlerleme Kontrolü', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'parent_meeting', label: 'Veli Bilgilendirme Görüşmesi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'general', label: 'Genel Değerlendirme', color: 'bg-slate-100 text-slate-700 border-slate-200' }
];

export function TeacherCalendar() {
  const currentUserId = localStorage.getItem('currentUserId') || 'teacher_gokce';
  const currentUserName = localStorage.getItem('currentUserName') || 'Öğretmen';
  const currentUserUsername = (localStorage.getItem('currentUserUsername') || '').toLowerCase();

  const [meetings, setMeetings] = useState<TeacherMeeting[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedMeetingToComplete, setSelectedMeetingToComplete] = useState<TeacherMeeting | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    title: 'Haftalık Birebir Koçluk Görüşmesi',
    type: 'coaching' as 'coaching' | 'exam_analysis' | 'homework_check' | 'parent_meeting' | 'general',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    notes: '',
    recurringWeekly: true
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load teacher's own students strictly
  useEffect(() => {
    const unsubStudents = subscribeStudents((allList) => {
      const myStudents = allList.filter((s: any) => {
        if (!s.teacherId) return false;
        const sTid = String(s.teacherId).trim();
        if (sTid === currentUserId) return true;
        if (currentUserUsername && sTid.toLowerCase() === currentUserUsername) return true;
        if (currentUserId === 'teacher_gokce' || currentUserUsername === 'gokce' || currentUserName.toLowerCase().includes('gökçe') || currentUserName.toLowerCase().includes('gokce')) {
          return sTid === 'teacher_gokce' || sTid === '2';
        }
        if (currentUserId === '1' || currentUserUsername === 'ahmet_y' || currentUserName.toLowerCase().includes('ahmet')) {
          return sTid === '1' || sTid === 'ahmet_y';
        }
        return false;
      });
      setStudents(myStudents);
      if (myStudents.length > 0 && !formData.studentId) {
        setFormData(prev => ({ ...prev, studentId: myStudents[0].id }));
      }
    });

    const unsubMeetings = subscribeTeacherMeetings(currentUserId, (list) => {
      setMeetings(list);
    });

    return () => {
      unsubStudents();
      unsubMeetings();
    };
  }, [currentUserId, currentUserUsername, currentUserName]);

  // Determine today's date & day
  const todayStr = new Date().toISOString().split('T')[0];
  const dayIndex = new Date().getDay();
  const todayDayName = DAYS_TR[dayIndex === 0 ? 6 : dayIndex - 1];

  // Recurring 7-day reminder detection:
  // 1) Meetings scheduled for today
  // 2) Or recurring meetings where last meeting was held around 7 days ago on this same weekday
  const dueReminders = meetings.filter(m => {
    if (m.isCompleted) return false;
    // Today's date
    if (m.date === todayStr) return true;
    // Approaching within next 2 days
    const mDate = new Date(m.date);
    const today = new Date(todayStr);
    const diffDays = Math.ceil((mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  });

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) {
      alert('Lütfen bir öğrenci seçiniz.');
      return;
    }

    const targetStudent = students.find(s => s.id === formData.studentId);
    const meetingDate = new Date(formData.date);
    const mDayIndex = meetingDate.getDay();
    const dayOfWeek = DAYS_TR[mDayIndex === 0 ? 6 : mDayIndex - 1];

    await saveTeacherMeeting({
      teacherId: currentUserId,
      studentId: formData.studentId,
      studentName: targetStudent?.name || 'Öğrenci',
      studentGrade: targetStudent?.grade || '12. Sınıf',
      title: formData.title,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      dayOfWeek,
      isCompleted: false,
      notes: formData.notes,
      recurringWeekly: formData.recurringWeekly
    });

    setShowAddModal(false);
    showToast('Görüşme takvime eklendi ve haftalık hatırlatma ayarlandı! 📅');
  };

  const handleOpenCompleteModal = (meeting: TeacherMeeting) => {
    setSelectedMeetingToComplete(meeting);
    setCompletionNotes('');
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedMeetingToComplete) return;

    await completeTeacherMeeting(selectedMeetingToComplete, completionNotes);
    setShowCompleteModal(false);
    setSelectedMeetingToComplete(null);
    showToast('Görüşme tamamlandı olarak kaydedildi! Bir sonraki hafta için hatırlatma hazırlandı. 🔔');
  };

  const handleDelete = async (meetingId: string) => {
    if (!window.confirm('Bu görüşmeyi takvimden silmek istediğinize emin misiniz?')) return;
    await deleteTeacherMeeting(meetingId, currentUserId);
    showToast('Görüşme silindi.');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 font-bold text-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-bold mb-2">
            <CalendarIcon className="w-4 h-4" />
            <span>Danışman Öğretmen Takvimi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-manrope font-extrabold text-on-surface">
            Haftalık Görüşme & Plan Takvimi
          </h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Öğrencilerinizle haftalık birebir görüşmelerinizi planlayın. Bir öğrenciyle görüşüldüğünde diğer hafta aynı gün için otomatik hatırlatıcı devreye girer.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Görüşme Planla</span>
        </button>
      </div>

      {/* RECURRING 7-DAY REMINDERS BANNER */}
      {dueReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-primary/10 border-2 border-amber-500/30 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                Haftalık Görüşme Hatırlatıcıları ({dueReminders.length})
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800">
                  Zamanı Geldi / Yaklaşıyor
                </span>
              </h4>
              <p className="text-xs text-on-surface-variant font-medium">
                Öğrenciyle haftalık takip döngüsü gereği görüşme günü geldi. Görüşmeyi yapıp notlarınızı kaydedebilirsiniz.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {dueReminders.map(m => {
              const isToday = m.date === todayStr;
              return (
                <div 
                  key={m.id} 
                  className="p-4 bg-white rounded-2xl border border-amber-500/20 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-on-surface">{m.studentName}</span>
                        {m.studentGrade && (
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md">
                            {m.studentGrade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-primary font-bold mt-0.5">{m.title}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isToday ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isToday ? '● Bugün' : m.date}
                    </span>
                  </div>

                  {m.notes && (
                    <p className="text-[11px] text-on-surface-variant italic line-clamp-2 bg-surface-container-low p-2 rounded-xl">
                      "{m.notes}"
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 text-xs">
                    <span className="font-bold text-on-surface-variant flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {m.time} ({m.dayOfWeek})
                    </span>

                    <button
                      onClick={() => handleOpenCompleteModal(m)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Görüşüldü / Not Al</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEKLY CALENDAR GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-on-surface">Haftalık Görüşme Planı</h3>
          </div>
          <span className="text-xs font-bold text-on-surface-variant">
            Bugün: <span className="text-primary font-black">{todayDayName}, {todayStr}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {DAYS_TR.map(dayName => {
            const isCurrentDay = dayName === todayDayName;
            const dayMeetings = meetings.filter(m => m.dayOfWeek === dayName && !m.isCompleted);

            return (
              <div
                key={dayName}
                className={`bg-surface-container-lowest rounded-3xl p-4 border transition-all flex flex-col justify-between min-h-[220px] ${
                  isCurrentDay 
                    ? 'border-primary ring-2 ring-primary/20 shadow-md bg-gradient-to-b from-primary/5 to-surface-container-lowest' 
                    : 'border-outline-variant/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isCurrentDay ? 'text-primary' : 'text-on-surface'
                    }`}>
                      {dayName}
                    </span>
                    {isCurrentDay && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayMeetings.length === 0 ? (
                      <p className="text-[11px] text-on-surface-variant/60 font-medium py-6 text-center">
                        Plan yok
                      </p>
                    ) : (
                      dayMeetings.map(m => (
                        <div
                          key={m.id}
                          className="p-3 bg-surface-container-high rounded-2xl space-y-1.5 border border-outline-variant/10 text-left hover:scale-[1.02] transition-transform"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-black text-primary flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {m.time}
                            </span>
                            {m.recurringWeekly && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5" title="Haftalık Düzenli">
                                <RotateCw className="w-2.5 h-2.5" />
                                7G
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-on-surface leading-tight line-clamp-1">{m.studentName}</p>
                          <p className="text-[10px] text-on-surface-variant line-clamp-1">{m.title}</p>
                          
                          <div className="pt-1 flex items-center justify-between border-t border-outline-variant/10">
                            <button
                              onClick={() => handleOpenCompleteModal(m)}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              Tamamla
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      title: 'Haftalık Koçluk Görüşmesi'
                    }));
                    setShowAddModal(true);
                  }}
                  className="w-full py-2 mt-3 border border-dashed border-outline-variant/20 hover:border-primary text-outline hover:text-primary rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ekle</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPLETED SESSIONS HISTORY */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-xl text-on-surface">Tamamlanan Görüşmeler & Not Geçmişi</h4>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Öğrencilerle yapılan görüşmelerde alınan pedagojik notlar ve sonraki hafta takipleri.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {meetings.filter(m => m.isCompleted).length} Görüşme Yapıldı
          </span>
        </div>

        {meetings.filter(m => m.isCompleted).length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-outline/50" />
            <p className="text-sm font-bold">Henüz tamamlanan görüşme kaydı bulunmuyor.</p>
            <p className="text-xs">Görüşme yaptıkça "Görüşüldü / Not Al" butonunu kullanarak notlarınızı burada arşivleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.filter(m => m.isCompleted).map(m => (
              <div key={m.id} className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-on-surface">{m.studentName}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Tamamlandı
                  </span>
                </div>
                <p className="text-xs font-bold text-primary">{m.title}</p>
                <div className="text-[11px] text-on-surface-variant space-y-1">
                  <p>📅 Tarih: {m.date} ({m.dayOfWeek}) - {m.time}</p>
                </div>
                {m.notes && (
                  <div className="p-3 bg-white rounded-2xl text-xs text-on-surface leading-relaxed">
                    {m.notes}
                  </div>
                )}
                {m.recurringWeekly && (
                  <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    Haftalık döngüde bir sonraki görüşme otomatik kuruldu.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / SCHEDULE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6 my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Yeni Görüşme & Plan Ekle</h3>
                    <p className="text-xs text-on-surface-variant">Öğrencinizle birebir koçluk veya analiz seansı planlayın.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Öğrenci Seçin *
                  </label>
                  <select
                    required
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Öğrenci seçiniz</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        👤 {s.name} ({s.grade || '12. Sınıf'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Görüşme Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Örn: Haftalık Koçluk & Deneme Hata Analizi"
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Tarih *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Saat *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Görüşme Türü
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
                  >
                    {MEETING_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Görüşme Gündemi & Ön Notlar (Opsiyonel)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Bu görüşmede odaklanılacak konular, deneme netleri, telafi ödevleri..."
                    className="w-full p-4 bg-surface-container-high rounded-2xl text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* 7-DAY RECURRING REMINDER CHECKBOX */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-on-surface">Haftalık Düzenli Tekrar Et (7 Gün Sonra Hatırlat)</p>
                      <p className="text-[10px] text-on-surface-variant">Görüşme yapıldığında bir sonraki haftanın aynı gününe otomatik hatırlatma kurulur.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.recurringWeekly}
                    onChange={e => setFormData({ ...formData, recurringWeekly: e.target.checked })}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Görüşmeyi Planla</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPLETE MEETING & LOG NOTES MODAL */}
      <AnimatePresence>
        {showCompleteModal && selectedMeetingToComplete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Görüşmeyi Tamamla & Not Al</h3>
                    <p className="text-xs text-on-surface-variant">{selectedMeetingToComplete.studentName} ile yapılan görüşme</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-container-high rounded-2xl text-xs space-y-1">
                  <p className="font-bold text-on-surface">{selectedMeetingToComplete.title}</p>
                  <p className="text-on-surface-variant">Tarih: {selectedMeetingToComplete.date} ({selectedMeetingToComplete.dayOfWeek}) - {selectedMeetingToComplete.time}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                    Görüşme Sonucu & Öğrenci Durum Notu *
                  </label>
                  <textarea
                    rows={4}
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    placeholder="Öğrencinin bu haftaki motivasyonu, deneme net analizi, tespit edilen konu eksikleri ve bir sonraki haftaya kadar yapması kararlaştırılan hedefler..."
                    className="w-full p-4 bg-surface-container-high rounded-2xl text-xs font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {selectedMeetingToComplete.recurringWeekly && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <RotateCw className="w-4 h-4 shrink-0" />
                    <span>Bu görüşme onaylandığında 7 gün sonra (aynı gün) için otomatik haftalık takip hatırlatması oluşturulacaktır.</span>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
                    className="px-6 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmComplete}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Görüşmeyi Kaydet & Tamamla</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
