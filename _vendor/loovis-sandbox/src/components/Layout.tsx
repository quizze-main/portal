import { ReactNode, useState } from 'react';
import { Menu, FileText, BookOpen, Bot, GraduationCap, MessageSquare, X, Hammer, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-main font-sans">
      {/* Header */}
      <header className="bg-header text-header-foreground px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-medium">LoovIS Portal</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </header>

      {/* Burger Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div 
            className="fixed top-0 right-0 h-full w-64 bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-medium">Меню</h2>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              <NavLink 
                to="/health-passport"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <Heart className="w-5 h-5" />
                <span>Паспорт здоровья</span>
              </NavLink>
              <NavLink 
                to="/crm"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <Hammer className="w-5 h-5" />
                <span>Крафтерная</span>
              </NavLink>
              <NavLink 
                to="/reviews"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <MessageSquare className="w-5 h-5" />
                <span>Отзывы</span>
              </NavLink>
              <NavLink 
                to="/training"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <GraduationCap className="w-5 h-5" />
                <span>Обучение</span>
              </NavLink>
              <NavLink 
                to="/ai-chat"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <Bot className="w-5 h-5" />
                <span>AI Помощник</span>
              </NavLink>
              <NavLink 
                to="/standards"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <FileText className="w-5 h-5" />
                <span>Стандарты</span>
              </NavLink>
              <NavLink 
                to="/knowledge"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`
                }
              >
                <BookOpen className="w-5 h-5" />
                <span>База знаний</span>
              </NavLink>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
}