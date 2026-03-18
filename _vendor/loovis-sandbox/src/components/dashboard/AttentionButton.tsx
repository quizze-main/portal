import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttentionButtonProps {
  count: number;
  totalAmount: number;
  className?: string;
}

export const AttentionButton = ({ count, totalAmount, className }: AttentionButtonProps) => {
  const navigate = useNavigate();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  return (
    <button
      onClick={() => navigate('/require-attention')}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl",
        "bg-gradient-to-r from-rose-500 to-pink-500",
        "hover:from-rose-600 hover:to-pink-600",
        "transition-all duration-200 shadow-lg hover:shadow-xl",
        "active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <span className="text-base font-semibold text-white">
          Требуют внимания
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-xs text-white/80">{formatAmount(totalAmount)}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/80" />
      </div>
    </button>
  );
};
