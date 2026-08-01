import { cn } from '@/src/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'primary' | 'secondary' | 'tertiary';
  progress?: number;
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary', progress }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    secondary: 'text-secondary bg-secondary/10',
    tertiary: 'text-tertiary bg-tertiary/10',
  };

  const barColorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    tertiary: 'bg-tertiary',
  };

  return (
    <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-ambient border border-outline-variant/10 flex flex-col justify-between space-y-4">
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn("text-xs font-bold px-2 py-1 rounded-full", colorClasses[color])}>
            {trend}
          </span>
        )}
      </div>
      
      <div>
        <p className="text-on-surface-variant font-medium text-sm uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black text-on-surface tracking-tight">{value}</p>
      </div>

      {progress !== undefined && (
        <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-1000", barColorClasses[color])} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}
