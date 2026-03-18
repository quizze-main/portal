import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface Payment {
  month: string;
  amount: number;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽';
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between py-3 px-4 bg-card rounded-xl shadow-card hover:bg-muted/50 transition-colors">
        <span className="text-sm font-medium text-foreground">
          История выплат ({payments.length})
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 bg-card rounded-xl shadow-card overflow-hidden">
          {payments.map((payment, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 px-4 border-b border-border last:border-0"
            >
              <span className="text-xs text-muted-foreground">{payment.month}</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(payment.amount)}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
