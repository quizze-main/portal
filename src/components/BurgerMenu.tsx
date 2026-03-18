import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Shield, CalendarDays } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useEmployee } from '@/contexts/EmployeeProvider';

export const BurgerMenu = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { canUseLeaderDashboard } = useEmployee();

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-3 z-40 p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-sm border border-white/30 dark:border-gray-700/30 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
        aria-label="Меню"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Меню</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              <Link
                to="/shift-schedule"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <CalendarDays className="w-5 h-5 text-blue-500" />
                График смен
              </Link>
              {canUseLeaderDashboard && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Shield className="w-5 h-5 text-orange-500" />
                  Админ-панель
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
