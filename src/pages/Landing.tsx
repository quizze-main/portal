import { useState } from 'react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingValueSplit } from '@/components/landing/LandingValueSplit';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingModules } from '@/components/landing/LandingModules';
import { LandingBenefits } from '@/components/landing/LandingBenefits';
import { LandingSocialProof } from '@/components/landing/LandingSocialProof';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingLayer2 } from '@/components/landing/LandingLayer2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

const TELEGRAM_LINK = 'https://t.me/overbrain_bot';

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 pt-16">
      <LandingNavbar onRequestDemo={() => setDemoOpen(true)} />
      <LandingHero onRequestDemo={() => setDemoOpen(true)} telegramLink={TELEGRAM_LINK} />
      <LandingModules onRequestDemo={() => setDemoOpen(true)} />
      <LandingValueSplit />
      <LandingLayer2 onRequestDemo={() => setDemoOpen(true)} />
      <LandingHowItWorks />
      <LandingBenefits />
      <LandingSocialProof />
      <LandingPricing onRequestDemo={() => setDemoOpen(true)} />
      <LandingCTA onRequestDemo={() => setDemoOpen(true)} telegramLink={TELEGRAM_LINK} />
      <LandingFooter />

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

function DemoRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onOpenChange(false);
    }, 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запросить демонстрацию</DialogTitle>
          <DialogDescription>
            Оставьте контакты — мы свяжемся в течение дня
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium">Заявка отправлена!</p>
            <p className="text-sm text-muted-foreground mt-1">Мы свяжемся с вами в ближайшее время</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company">Компания</Label>
              <Input id="company" placeholder="Название вашей сети" required />
            </div>
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" placeholder="Как к вам обращаться" required />
            </div>
            <div>
              <Label htmlFor="contact">Телефон или Telegram</Label>
              <Input id="contact" placeholder="+7... или @username" required />
            </div>
            <div>
              <Label htmlFor="message">Комментарий</Label>
              <Textarea id="message" placeholder="Расскажите о вашей сети (необязательно)" rows={3} />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Отправить заявку
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
