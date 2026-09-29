import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Star, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  BookMarked, 
  Sparkles, 
  FileText, 
  User, 
  Bookmark, 
  X, 
  Filter,
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StudentBook, 
  saveStudentBook, 
  deleteStudentBook, 
  subscribeStudentBooks,
  subscribeStudents 
} from '../lib/firestoreService';

const BOOK_GENRES = [
  'Dünya Klasikleri',
  'Türk Edebiyatı',
  'Roman',
  'Bilim & Teknoloji',
  'Tarih & Biyografi',
  'Felsefe & Düşünce',
  'Kişisel Gelişim',
  'Polisiye & Gerilim',
  'Bilim Kurgu & Fantastik',
  'Şiir & Tiyatro',
  'Eğitim & Ders',
  'Diğer'
];

export function Library() {
  const userRole = localStorage.getItem('userRole') || 'student';
  const currentUserId = localStorage.getItem('currentUserId') || '1';
  const currentUserName = localStorage.getItem('currentUserName') || 'Öğrenci';

  // For teachers/admins to inspect a student's library
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentUserId);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  
  // Books state
  const [books, setBooks] = useState<StudentBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'reading' | 'dropped'>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    pageCount: '',
    currentPage: '',
    genre: 'Dünya Klasikleri',
    status: 'read' as 'read' | 'reading' | 'dropped',
    rating: 5,
    notes: '',
    finishDate: new Date().toISOString().split('T')[0]
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // If teacher or admin, load available students to allow viewing their library
  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'admin') {
      const unsub = subscribeStudents((allList) => {
        if (userRole === 'teacher') {
          // Strictly only this teacher's students
          const teacherUsername = (localStorage.getItem('currentUserUsername') || '').toLowerCase();
          const teacherName = (localStorage.getItem('currentUserName') || '').toLowerCase();
          const myStudents = allList.filter((s: any) => {
            if (!s.teacherId) return false;
            const sTid = String(s.teacherId).trim();
            if (sTid === currentUserId) return true;
            if (teacherUsername && sTid.toLowerCase() === teacherUsername) return true;
            if (currentUserId === 'teacher_gokce' || teacherUsername === 'gokce' || teacherName.includes('gökçe') || teacherName.includes('gokce')) {
              return sTid === 'teacher_gokce' || sTid === '2';
            }
            if (currentUserId === '1' || teacherUsername === 'ahmet_y' || teacherName.includes('ahmet')) {
              return sTid === '1' || sTid === 'ahmet_y';
            }
            return false;
          });
          setAvailableStudents(myStudents);
          if (myStudents.length > 0 && selectedStudentId === currentUserId) {
            setSelectedStudentId(myStudents[0].id);
          }
        } else {
          // Admin can see all students
          setAvailableStudents(allList);
          if (allList.length > 0 && selectedStudentId === currentUserId) {
            setSelectedStudentId(allList[0].id);
          }
        }
      });
      return () => unsub();
    }
  }, [userRole, currentUserId]);

  // Subscribe to real-time books of active target student
  useEffect(() => {
    const targetId = (userRole === 'student') ? currentUserId : selectedStudentId;
    if (!targetId) return;

    setLoading(true);
    const unsub = subscribeStudentBooks(targetId, (freshBooks) => {
      setBooks(freshBooks);
      setLoading(false);
    });

    return () => unsub();
  }, [userRole, currentUserId, selectedStudentId]);

  const targetStudentId = (userRole === 'student') ? currentUserId : selectedStudentId;

  // Pre-seed sample popular books if student library is completely empty
  const handleAddSampleBooks = async () => {
    setIsSubmitting(true);
    const samples = [
      {
        title: 'Kürk Mantolu Madonna',
        author: 'Sabahattin Ali',
        pageCount: 160,
        genre: 'Türk Edebiyatı',
        status: 'read' as const,
        rating: 5,
        notes: 'Raif Efendi ve Maria Puder arasındaki derin ve etkileyici bağ. İnsanın iç dünyasını harika anlatıyor.',
        finishDate: '2026-09-15'
      },
      {
        title: 'Simyacı',
        author: 'Paulo Coelho',
        pageCount: 188,
        genre: 'Roman',
        status: 'read' as const,
        rating: 5,
        notes: 'Kişisel menkıbesini arayan Endülüslü çoban Santiago\'nun büyüleyici yolculuğu.',
        finishDate: '2026-08-20'
      },
      {
        title: '1984',
        author: 'George Orwell',
        pageCount: 352,
        currentPage: 210,
        genre: 'Bilim Kurgu & Fantastik',
        status: 'reading' as const,
        rating: 5,
        notes: 'Büyük Birader ve distopik denetim toplumu üzerine sarsıcı bir başyapıt.',
        finishDate: ''
      }
    ];

    for (const sample of samples) {
      await saveStudentBook(targetStudentId, sample);
    }
    setIsSubmitting(false);
    showToast('Örnek kitaplar kütüphanenize eklendi! 📚');
  };

  const handleOpenAddModal = (bookToEdit?: StudentBook) => {
    if (bookToEdit) {
      setEditingBookId(bookToEdit.id);
      setFormData({
        title: bookToEdit.title,
        author: bookToEdit.author,
        pageCount: String(bookToEdit.pageCount),
        currentPage: bookToEdit.currentPage ? String(bookToEdit.currentPage) : '',
        genre: bookToEdit.genre || 'Dünya Klasikleri',
        status: bookToEdit.status,
        rating: bookToEdit.rating || 5,
        notes: bookToEdit.notes || '',
        finishDate: bookToEdit.finishDate || new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingBookId(null);
      setFormData({
        title: '',
        author: '',
        pageCount: '',
        currentPage: '',
        genre: 'Dünya Klasikleri',
        status: 'read',
        rating: 5,
        notes: '',
        finishDate: new Date().toISOString().split('T')[0]
      });
    }
    setShowAddModal(true);
  };

  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.pageCount) {
      return;
    }

    setIsSubmitting(true);
    try {
      const pageCountNum = parseInt(formData.pageCount, 10) || 0;
      const currentPageNum = formData.currentPage ? parseInt(formData.currentPage, 10) : undefined;

      await saveStudentBook(targetStudentId, {
        ...(editingBookId ? { id: editingBookId } : {}),
        studentId: targetStudentId,
        title: formData.title.trim(),
        author: formData.author.trim(),
        pageCount: pageCountNum,
        currentPage: formData.status === 'reading' ? currentPageNum : undefined,
        genre: formData.genre,
        status: formData.status,
        rating: formData.rating,
        notes: formData.notes.trim(),
        finishDate: formData.status === 'read' ? formData.finishDate : ''
      });

      setShowAddModal(false);
      showToast(editingBookId ? 'Kitap başarıyla güncellendi! 📖' : 'Yeni kitap kütüphanenize eklendi! 🎉');
    } catch (err) {
      console.error('Kitap kaydetme hatası:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!window.confirm(`"${bookTitle}" adlı kitabı kütüphanenizden silmek istediğinize emin misiniz?`)) {
      return;
    }

    await deleteStudentBook(targetStudentId, bookId);
    showToast(`"${bookTitle}" kütüphaneden silindi.`);
  };

  // Metrics
  const readBooks = books.filter(b => b.status === 'read');
  const readingBooks = books.filter(b => b.status === 'reading');
  const totalPagesRead = books.reduce((acc, b) => {
    if (b.status === 'read') return acc + (b.pageCount || 0);
    if (b.status === 'reading') return acc + (b.currentPage || 0);
    return acc;
  }, 0);

  // Filtered books
  const filteredBooks = books.filter(b => {
    const matchesSearch = 
      (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesGenre = genreFilter === 'all' || b.genre === genreFilter;

    return matchesSearch && matchesStatus && matchesGenre;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 font-bold text-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-bold mb-2">
            <BookMarked className="w-4 h-4" />
            <span>Öğrenci Kütüphanesi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-manrope font-extrabold text-on-surface">
            {userRole === 'student' ? 'Okuduğum Kitaplar' : 'Öğrenci Kitaplığı & Okuma Geçmişi'}
          </h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            {userRole === 'student' 
              ? 'Okuduğunuz ve okumakta olduğunuz kitapları kaydedin, sayfa hedeflerinizi ve entelektüel gelişiminizi takip edin.'
              : 'Öğrencinizin okuma alışkanlıklarını, tamamladığı kitapları ve notlarını görüntüleyin.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Teacher / Admin Student Selector */}
          {(userRole === 'teacher' || userRole === 'admin') && availableStudents.length > 0 && (
            <div className="relative">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="pl-4 pr-10 py-3 bg-surface-container-high rounded-full text-xs font-bold text-on-surface border border-outline-variant/20 focus:ring-2 focus:ring-primary outline-none"
              >
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    👤 {s.name} ({s.grade || 'Öğrenci'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => handleOpenAddModal()}
            className="px-6 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kitap Ekle</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-outline-variant/10 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Okunan Kitap</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">{readBooks.length}</p>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold">Tamamlanan eserler</p>
        </div>

        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-outline-variant/10 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Toplam Okunan</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-primary mt-1">{totalPagesRead.toLocaleString('tr-TR')}</p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">Sayfa okundu</p>
        </div>

        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-outline-variant/10 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Şu An Okunuyor</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 mt-1">{readingBooks.length}</p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">Devam eden kitaplar</p>
        </div>

        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-3xl border border-outline-variant/10 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kütüphane Durumu</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{books.length}</p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-medium">Toplam kayıtlı eser</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kitap veya yazar adı ile ara..."
              className="w-full pl-11 pr-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="px-4 py-3 bg-surface-container-high rounded-2xl text-xs font-bold text-on-surface border-none outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tüm Türler</option>
              {BOOK_GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-outline-variant/10">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tüm Kitaplar ({books.length})
          </button>
          <button
            onClick={() => setStatusFilter('read')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'read'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Okundu</span>
            <span className="opacity-80 text-[10px]">({readBooks.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('reading')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'reading'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Şu An Okunuyor</span>
            <span className="opacity-80 text-[10px]">({readingBooks.length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('dropped')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'dropped'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Yarıda Bırakılanlar ({books.filter(b => b.status === 'dropped').length})
          </button>
        </div>
      </div>

      {/* Book List / Cards Grid */}
      {loading ? (
        <div className="text-center py-20 bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
          <BookOpen className="w-8 h-8 mx-auto text-primary animate-bounce mb-3" />
          <p className="text-sm font-bold text-on-surface">Kütüphane yükleniyor...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-16 px-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
            <BookMarked className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-on-surface">
            {books.length === 0 ? 'Kütüphanenizde Henüz Kitap Bulunmuyor' : 'Filtreye Uygun Kitap Bulunamadı'}
          </h4>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            {books.length === 0 
              ? 'Okuduğunuz veya okumaya başladığınız kitapları sisteme kaydederek okuma hedeflerinizi düzenli takip edebilirsiniz.'
              : 'Arama kriterlerinizi değiştirerek veya filtreleri temizleyerek diğer kitaplara ulaşabilirsiniz.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-6 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Kitabımı Ekle</span>
            </button>
            {books.length === 0 && (
              <button
                onClick={handleAddSampleBooks}
                disabled={isSubmitting}
                className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold rounded-full transition-all text-xs flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Örnek Kitaplar Ekle</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const isRead = book.status === 'read';
            const isReading = book.status === 'reading';
            const progress = (isReading && book.currentPage && book.pageCount) 
              ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
              : isRead ? 100 : 0;

            return (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Status indicator bar on top */}
                <div 
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isRead ? 'bg-emerald-500' : isReading ? 'bg-sky-500' : 'bg-amber-500'
                  }`} 
                />

                <div className="space-y-4">
                  {/* Top Bar: Genre & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant truncate">
                      {book.genre || 'Roman'}
                    </span>

                    <span 
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isRead 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : isReading 
                          ? 'bg-sky-50 text-sky-700 border-sky-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isRead ? '✓ Okundu' : isReading ? '📖 Okunuyor' : '⏸ Bırakıldı'}
                    </span>
                  </div>

                  {/* Book Title & Author */}
                  <div>
                    <h3 className="text-xl font-manrope font-extrabold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-outline" />
                      <span>{book.author}</span>
                    </p>
                  </div>

                  {/* Reading Progress bar if currently reading */}
                  {isReading && (
                    <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-sky-700">İlerleme: {book.currentPage || 0} / {book.pageCount} Sayfa</span>
                        <span className="text-sky-800 font-black">%{progress}</span>
                      </div>
                      <div className="w-full h-2 bg-sky-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Book Details: Page count, finish date, rating */}
                  <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-between text-xs text-on-surface-variant">
                    <span className="font-bold flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 text-primary" />
                      {book.pageCount} Sayfa
                    </span>

                    {book.rating && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < book.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes / Quote if exists */}
                  {book.notes && (
                    <div className="p-3 bg-surface-container-high/60 rounded-2xl text-xs text-on-surface-variant italic leading-relaxed line-clamp-3">
                      "{book.notes}"
                    </div>
                  )}

                  {book.finishDate && isRead && (
                    <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>Tamamlandı: {book.finishDate}</span>
                    </p>
                  )}
                </div>

                {/* Actions: Edit & Delete */}
                <div className="pt-4 mt-4 border-t border-outline-variant/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenAddModal(book)}
                    className="px-3.5 py-1.5 text-xs font-bold text-on-surface hover:bg-surface-container-high rounded-xl transition-all"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id, book.title)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Kitabı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 space-y-6 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">
                      {editingBookId ? 'Kitap Bilgilerini Düzenle' : 'Kütüphaneye Yeni Kitap Ekle'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Okuduğunuz eserin detaylarını ve düşüncelerinizi kaydedin.
                    </p>
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

              <form onSubmit={handleSubmitBook} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Kitap Adı *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Örn: Suç ve Ceza, Simyacı, 1984..."
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Yazar *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Örn: Fyodor Dostoyevski"
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Kitap Türü / Kategori
                    </label>
                    <select
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    >
                      {BOOK_GENRES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Toplam Sayfa Sayısı *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.pageCount}
                      onChange={(e) => setFormData({ ...formData, pageCount: e.target.value })}
                      placeholder="Örn: 320"
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Okuma Durumu
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="read">✓ Okundu (Tamamlandı)</option>
                      <option value="reading">📖 Şu An Okunuyor</option>
                      <option value="dropped">⏸ Yarıda Bırakıldı</option>
                    </select>
                  </div>

                  {formData.status === 'reading' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                        Şu An Kaldığım Sayfa (İlerleme İçin)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formData.pageCount || 9999}
                        value={formData.currentPage}
                        onChange={(e) => setFormData({ ...formData, currentPage: e.target.value })}
                        placeholder="Örn: 125"
                        className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  {formData.status === 'read' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.finishDate}
                        onChange={(e) => setFormData({ ...formData, finishDate: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-container-high rounded-2xl font-bold text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Değerlendirme Puanım
                    </label>
                    <div className="flex items-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star 
                            className={`w-6 h-6 ${star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-on-surface ml-2">{formData.rating} / 5</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">
                      Kitap Hakkındaki Notlarım & Çıkarımlarım (Opsiyonel)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Kitaptan en çok etkilendiğiniz cümle, ana fikir veya karakter hakkındaki düşünceleriniz..."
                      className="w-full p-4 bg-surface-container-high rounded-2xl font-medium text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
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
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingBookId ? 'Değişiklikleri Kaydet' : 'Kitabı Kütüphaneye Ekle'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
