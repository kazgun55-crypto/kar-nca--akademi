import { Search, Bell, Settings as SettingsIcon } from 'lucide-react';

export function TopBar() {
  return (
    <header className="w-full top-0 sticky bg-surface/80 backdrop-blur-md flex justify-between items-center px-8 h-20 max-w-full z-10">
      <div className="flex items-center gap-4">
        <h2 className="font-manrope font-extrabold tracking-tight text-primary text-2xl md:hidden">Scholar Pulse</h2>
        <div className="hidden md:flex gap-6 ml-8">
          <a href="#" className="text-on-surface opacity-70 hover:opacity-100 transition-opacity duration-200 text-sm font-bold">Panel</a>
          <a href="#" className="text-primary font-bold border-b-2 border-primary pb-1 text-sm">Öğrenciler</a>
          <a href="#" className="text-on-surface opacity-70 hover:opacity-100 transition-opacity duration-200 text-sm font-bold">Müfredat</a>
          <a href="#" className="text-on-surface opacity-70 hover:opacity-100 transition-opacity duration-200 text-sm font-bold">Analiz</a>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input 
            type="text" 
            placeholder="Öğrenci ara..." 
            className="bg-surface-container-high border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors text-on-surface">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors text-on-surface">
            <SettingsIcon className="w-5 h-5" />
          </button>
          <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden ml-2 shadow-sm ring-2 ring-white">
            <img 
              src="https://picsum.photos/seed/teacher/100/100" 
              alt="Teacher Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
