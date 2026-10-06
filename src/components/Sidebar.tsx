import { NavLink } from 'react-router-dom';
import { logoutFirebase } from '@/src/lib/firestoreService';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  Plus, 
  HelpCircle,
  UserCircle,
  LogOut,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Timer,
  Calendar,
  Trophy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Genel Bakış', path: '/', roles: ['admin'] },
  { icon: Trophy, label: 'Performans Sıralaması', path: '/leaderboard', roles: ['admin'] },
  { icon: ShieldCheck, label: 'Öğretmen Yönetimi', path: '/teachers', roles: ['admin'] },
  { icon: Users, label: 'Öğrencilerim', path: '/my-students', roles: ['teacher'] },
  { icon: Calendar, label: 'Takvim & Görüşmeler', path: '/calendar', roles: ['teacher', 'admin'] },
  { icon: Users, label: 'Öğrenci Dizini', path: '/students', roles: ['admin'] },
  { icon: UserCircle, label: 'Öğrenci Portalı', path: '/portal', roles: ['student'] },
  { icon: BookOpen, label: 'Kütüphanem', path: '/library', roles: ['student', 'teacher', 'admin'] },
  { icon: ClipboardCheck, label: 'Deneme Gir', path: '/enter-trial', roles: ['student'] },
  { icon: GraduationCap, label: 'Sınıf Yönetimi', path: '/classes', roles: ['admin'] },
  { icon: BookOpen, label: 'Ödev Akışı', path: '/assignments', roles: ['student'] },
  { icon: BarChart3, label: 'Analiz', path: '/analytics', roles: ['student'] },
  { icon: Settings, label: 'Ayarlar', path: '/settings', roles: ['admin', 'teacher', 'student'] },
];

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const userRole = localStorage.getItem('userRole') || 'student';
  const currentUserName = localStorage.getItem('currentUserName') || 'Kullanıcı';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const calculateCountdownDays = (examType: 'LGS' | 'YKS') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let examYear = now.getFullYear();
    let examMonth = 5; // June is 5 (0-indexed)
    let examDay = examType === 'LGS' ? 6 : 19; // June 6 (LGS 2027) or June 19 (YKS 2027)
    
    let examDate = new Date(examYear, examMonth, examDay);
    if (today > examDate) {
      examDate = new Date(examYear + 1, examMonth, examDay);
    }
    
    const diffTime = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const lgsDays = calculateCountdownDays('LGS');
  const yksDays = calculateCountdownDays('YKS');

  const containerClasses = isMobile
    ? "h-full max-h-screen w-full bg-surface-container-low flex flex-col overflow-hidden"
    : "h-screen max-h-screen w-72 left-0 top-0 sticky bg-surface-container-low flex flex-col hidden md:flex overflow-hidden border-r border-outline-variant/10 shadow-xs";

  const handleLogout = () => {
    logoutFirebase();
    window.location.href = '/login';
  };

  return (
    <aside className={containerClasses}>
      {/* Sidebar Header (Fixed at top) */}
      <div className="shrink-0 px-6 py-4 md:pt-6 md:pb-3 flex items-center justify-between border-b border-outline-variant/10">
        <div className="min-w-0 pr-2">
          <h1 className="font-manrope font-bold text-primary text-xl md:text-2xl tracking-tight truncate">Scholar Pulse</h1>
          <p className="text-on-surface opacity-70 text-xs font-medium truncate">
            {userRole === 'admin' ? 'Yönetici Paneli' : userRole === 'teacher' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Header Logout Icon */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200/50"
            title="Hızlı Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {isMobile && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
              aria-label="Kapat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sınav Sayaçları (Fixed under header) */}
      {(userRole === 'admin' || userRole === 'teacher') && (
        <div className="shrink-0 mx-4 md:mx-5 my-3 p-3 bg-gradient-to-br from-primary/5 to-secondary/5 border border-outline-variant/10 rounded-2xl space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-primary" /> Sınav Sayaçları
          </p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/70 backdrop-blur-sm p-1.5 rounded-xl border border-outline-variant/5">
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-tight">LGS</p>
              <p className="text-xs font-black text-primary">{lgsDays} Gün</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-1.5 rounded-xl border border-outline-variant/5">
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-tight">YKS</p>
              <p className="text-xs font-black text-secondary">{yksDays} Gün</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation (Smooth scrollable middle area, never overflows viewport) */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-2 overscroll-contain">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (isMobile && onClose) onClose();
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all duration-200 text-sm font-medium",
              isActive 
                ? "bg-primary text-white font-bold shadow-md shadow-primary/20" 
                : "text-on-surface opacity-70 hover:bg-surface-container-high hover:opacity-100"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Pinned Bottom Area (ALWAYS VISIBLE and fits any screen height) */}
      <div className="shrink-0 mt-auto border-t border-outline-variant/15 p-4 bg-surface-container-low/95 backdrop-blur-xs space-y-2 z-10 shadow-xs">
        {(userRole === 'admin' || userRole === 'teacher') && (
          <NavLink 
            to="/students/new"
            onClick={() => {
              if (isMobile && onClose) onClose();
            }}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm shadow-primary/20 hover:opacity-95 active:scale-98 transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Öğrenci Ekle</span>
          </NavLink>
        )}
        
        {/* Prominent, high-visibility Çıkış Yap button */}
        <button 
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-between gap-2.5 text-rose-700 bg-rose-50/90 hover:bg-rose-100 active:scale-98 border border-rose-200/80 rounded-xl px-3.5 py-2.5 transition-all text-xs font-bold shadow-2xs group cursor-pointer"
          title="Oturumu Güvenli Sonlandır"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-600 transition-transform group-hover:-translate-x-0.5" />
            <span>Çıkış Yap</span>
          </div>
          <span className="text-[10px] font-semibold opacity-75 bg-white/90 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200/50">
            {currentUserName}
          </span>
        </button>

        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-on-surface-variant/70">
          <a href="#" className="flex items-center gap-1.5 hover:text-on-surface transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Yardım & Destek</span>
          </a>
          <span className="text-[10px] opacity-60">v2.4</span>
        </div>
      </div>
    </aside>
  );
}
