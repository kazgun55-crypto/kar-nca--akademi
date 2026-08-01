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
  LogIn,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Timer,
  Calendar
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Genel Bakış', path: '/', roles: ['admin'] },
  { icon: ShieldCheck, label: 'Öğretmen Yönetimi', path: '/teachers', roles: ['admin'] },
  { icon: Users, label: 'Öğrencilerim', path: '/my-students', roles: ['teacher'] },
  { icon: Users, label: 'Öğrenci Dizini', path: '/students', roles: ['admin'] },
  { icon: UserCircle, label: 'Öğrenci Portalı', path: '/portal', roles: ['student'] },
  { icon: ClipboardCheck, label: 'Deneme Gir', path: '/enter-trial', roles: ['student'] },
  { icon: GraduationCap, label: 'Sınıf Yönetimi', path: '/classes', roles: ['admin'] },
  { icon: BookOpen, label: 'Ödev Akışı', path: '/assignments', roles: ['student'] },
  { icon: BarChart3, label: 'Analiz', path: '/analytics', roles: ['student'] },
  { icon: Settings, label: 'Ayarlar', path: '/settings', roles: ['admin', 'teacher', 'student'] },
];

export function Sidebar() {
  const userRole = localStorage.getItem('userRole') || 'student';
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

  return (
    <aside className="h-screen w-72 left-0 top-0 sticky bg-surface-container-low flex flex-col py-8 gap-2 hidden md:flex">
      <div className="px-8 mb-4">
        <h1 className="font-manrope font-bold text-primary text-2xl tracking-tight">Scholar Pulse</h1>
        <p className="text-on-surface opacity-60 text-xs mt-1 font-medium">
          {userRole === 'admin' ? 'Yönetici Paneli' : userRole === 'teacher' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'}
        </p>
      </div>

      {(userRole === 'admin' || userRole === 'teacher') && (
        <div className="mx-6 mb-4 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border border-outline-variant/10 rounded-2xl space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-primary" /> Sınav Sayaçları
          </p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-outline-variant/5">
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-tight">LGS</p>
              <p className="text-xs font-black text-primary">{lgsDays} Gün</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-outline-variant/5">
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-tight">YKS</p>
              <p className="text-xs font-black text-secondary">{yksDays} Gün</p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex-grow">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 py-3 px-6 transition-all duration-300 ease-in-out",
              isActive 
                ? "bg-primary text-white rounded-r-full -ml-4 pl-10 font-bold shadow-lg shadow-primary/20" 
                : "text-on-surface opacity-60 hover:bg-surface-container-high hover:opacity-100"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 mt-auto">
        {(userRole === 'admin' || userRole === 'teacher') && (
          <NavLink 
            to="/students/new"
            className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 px-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Öğrenci</span>
          </NavLink>
        )}
        
        <div className="mt-6 border-t border-outline-variant/15 pt-4">
          <a href="#" className="flex items-center gap-3 text-on-surface py-2 opacity-60 hover:opacity-100 transition-opacity">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm">Yardım Merkezi</span>
          </a>
          <button 
            type="button"
            onClick={() => {
              logoutFirebase();
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 text-on-surface py-2 opacity-60 hover:opacity-100 transition-opacity text-left"
          >
            <LogIn className="w-5 h-5" />
            <span className="text-sm">Çıkış Yap</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
