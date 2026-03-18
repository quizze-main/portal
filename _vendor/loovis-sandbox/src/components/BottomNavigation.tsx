import { Home, User, Trophy, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-nav-border px-4 py-3 shadow-nav">
      <div className="flex items-center justify-around">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${
              isActive 
                ? 'text-nav-active bg-primary/10' 
                : 'text-muted-foreground'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span className="text-xs font-medium">Дашборд</span>
        </NavLink>

        <NavLink 
          to="/salary" 
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${
              isActive 
                ? 'text-nav-active bg-primary/10' 
                : 'text-muted-foreground'
            }`
          }
        >
          <Wallet className="w-4 h-4" />
          <span className="text-xs font-medium">Зарплата</span>
        </NavLink>

        <NavLink 
          to="/competition" 
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${
              isActive 
                ? 'text-nav-active bg-primary/10' 
                : 'text-muted-foreground'
            }`
          }
        >
          <Trophy className="w-4 h-4" />
          <span className="text-xs font-medium">Соревнования</span>
        </NavLink>

        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${
              isActive 
                ? 'text-nav-active bg-primary/10' 
                : 'text-muted-foreground'
            }`
          }
        >
          <User className="w-4 h-4" />
          <span className="text-xs font-medium">Профиль</span>
        </NavLink>
      </div>
    </nav>
  );
}