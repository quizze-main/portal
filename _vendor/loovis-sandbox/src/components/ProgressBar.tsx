interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: 'success' | 'primary' | 'warning';
}

export function ProgressBar({ value, max, className = '', color = 'success' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={`w-full bg-progress rounded-full h-2 ${className}`}>
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${
          color === 'success' ? 'bg-progress-success' : 
          color === 'warning' ? 'bg-warning' : 'bg-primary'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}