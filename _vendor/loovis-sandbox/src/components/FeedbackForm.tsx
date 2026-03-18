import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackType: 'positive' | 'negative';
}

const departments = [
  'HR отдел',
  'IT отдел', 
  'Маркетинг',
  'Продажи',
  'Финансы',
  'Логистика',
  'Закупки',
  'Клиентский сервис'
];

export function FeedbackForm({ isOpen, onClose, feedbackType }: FeedbackFormProps) {
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!department || !message.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: feedbackType === 'positive' ? "Благодарность отправлена" : "Обратная связь отправлена",
      description: `Ваше сообщение передано в ${department}`,
    });

    setDepartment('');
    setMessage('');
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              {feedbackType === 'positive' ? (
                <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 text-success-foreground" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                  <ThumbsDown className="w-4 h-4 text-destructive-foreground" />
                </div>
              )}
              {feedbackType === 'positive' ? 'Благодарность' : 'Обратная связь'}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="department">Отдел</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите отдел" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              {feedbackType === 'positive' ? 'Ваша благодарность' : 'Ваша обратная связь'}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={feedbackType === 'positive' 
                ? "Расскажите, за что вы благодарны..." 
                : "Опишите проблему или предложение..."
              }
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              className="flex-1"
              variant={feedbackType === 'positive' ? 'default' : 'destructive'}
            >
              <Send className="w-4 h-4 mr-2" />
              Отправить
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}