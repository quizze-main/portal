import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OverbrainLogo } from './OverbrainLogo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowLeft } from 'lucide-react';

interface LandingNavbarProps {
  onRequestDemo: () => void;
}

const navLinks = [
  { label: 'Преимущества', href: '#benefits' },
  { label: 'Как это работает', href: '#how-it-works' },
  { label: 'Модули', href: '#modules' },
];

function scrollToSection(href: string) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function LandingNavbar({ onRequestDemo }: LandingNavbarProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isModulePage = location.pathname.startsWith('/landing/module/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 dark:bg-gray-950/35 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ WebkitBackdropFilter: 'blur(32px) saturate(200%)', backdropFilter: 'blur(32px) saturate(200%)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between">
        {isModulePage ? (
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <OverbrainLogo size="sm" />
          </button>
        ) : (
          <OverbrainLogo size="sm" />
        )}

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {!isModulePage && navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {link.label}
            </button>
          ))}
          <Button
            size="sm"
            onClick={onRequestDemo}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 shadow-sm transition-all duration-200"
          >
            Запросить демо
          </Button>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            size="sm"
            onClick={onRequestDemo}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-3"
          >
            Демо
          </Button>
          {!isModulePage && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[260px]">
                <div className="mt-8 flex flex-col gap-1">
                  <OverbrainLogo size="md" className="mb-6" />
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => { scrollToSection(link.href); setOpen(false); }}
                      className="text-left text-[15px] text-gray-700 dark:text-gray-300 hover:text-gray-900 py-3 border-b border-gray-100 dark:border-gray-800"
                    >
                      {link.label}
                    </button>
                  ))}
                  <Button
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    onClick={() => { onRequestDemo(); setOpen(false); }}
                  >
                    Запросить демонстрацию
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}
