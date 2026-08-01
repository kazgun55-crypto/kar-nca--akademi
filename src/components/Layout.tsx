import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, LayoutDashboard, Users, UserCircle, ClipboardCheck, BarChart3, Settings, ShieldCheck, BookOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const userRole = localStorage.getItem('userRole') || 'student';
  const currentUserName = localStorage.getItem('currentUserName') || 'Kullanıcı';

  // Bottom Nav items depending on role
  const getBottomNavItems = () => {
    if (userRole === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Genel Bakış', path: '/' },
        { icon: ShieldCheck, label: 'Öğretmenler', path: '/teachers' },
        { icon: Users, label: 'Öğrenciler', path: '/students' },
        { icon: Settings, label: 'Ayarlar', path: '/settings' },
      ];
    } else if (userRole === 'teacher') {
      return [
        { icon: Users, label: 'Öğrencilerim', path: '/my-students' },
        { icon: Settings, label: 'Ayarlar', path: '/settings' },
      ];
    } else {
      return [
        { icon: UserCircle, label: 'Portal', path: '/portal' },
        { icon: ClipboardCheck, label: 'Deneme Gir', path: '/enter-trial' },
        { icon: BarChart3, label: 'Analiz', path: '/analytics' },
        { icon: BookOpen, label: 'Ödevler', path: '/assignments' },
      ];
    }
  };

  const bottomItems = getBottomNavItems();

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop Sticky Sidebar */}
      <Sidebar />

      <div className="flex-grow flex flex-col min-w-0">
        {/* Mobile Top Header (Sticky) */}
        <header className="md:hidden sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-outline-variant/10 px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors flex items-center justify-center"
              aria-label="Menüyü Aç"
            >
              <Menu className="w-5 h-5 text-primary" />
            </button>
            <div>
              <h2 className="font-manrope font-extrabold text-primary text-lg tracking-tight">Scholar Pulse</h2>
              <p className="text-[10px] text-on-surface-variant font-medium">
                {userRole === 'admin' ? 'Yönetici' : userRole === 'teacher' ? 'Öğretmen' : 'Öğrenci'}: {currentUserName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {userRole === 'admin' ? 'Yönetici' : userRole === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
            </span>
          </div>
        </header>

        {/* Mobile Drawer Slide-Over Modal */}
        <AnimatePresence>
          {isDrawerOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              />

              {/* Drawer Content */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-4/5 max-w-xs h-full z-10 shadow-2xl"
              >
                <Sidebar isMobile={true} onClose={() => setIsDrawerOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 md:p-8 pb-28 md:pb-8 space-y-6 md:space-y-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Fixed at bottom) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-outline-variant/15 px-2 py-2 flex items-center justify-around shadow-lg">
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all gap-1 text-[10px] font-bold",
                isActive 
                  ? "text-primary bg-primary/10 font-extrabold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all gap-1 text-[10px] font-bold text-on-surface-variant hover:text-on-surface"
          >
            <Menu className="w-5 h-5 text-primary" />
            <span>Menü</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
