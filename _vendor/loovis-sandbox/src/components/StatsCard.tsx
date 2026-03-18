import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export function StatsCard({ icon, title, children }: StatsCardProps) {
  return (
    <div className="bg-card rounded-xl p-3 shadow-card border-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-primary rounded flex items-center justify-center text-primary-foreground">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground text-xs">{title}</h3>
      </div>
      {children}
    </div>
  );
}