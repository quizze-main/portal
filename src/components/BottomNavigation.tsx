import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, Wallet } from "lucide-react";
import { useEmployee } from "@/contexts/EmployeeProvider";

export const BottomNavigation = () => {
  const location = useLocation();
  const { canUseSalaryCalculator } = useEmployee();

  const tabs = [
    { path: "/", icon: Home, label: "Дашборд" },
    ...(canUseSalaryCalculator ? [{ path: "/salary", icon: Wallet, label: "Мотивация" }] : []),
    { path: "/knowledge", icon: BookOpen, label: "База знаний" },
    { path: "/profile", icon: User, label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/30 dark:bg-gray-900/20 backdrop-blur-[7px] backdrop-saturate-150 border-t border-white/20 dark:border-white/10 px-2 py-2.5 shadow-md z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path ||
            (tab.path === "/knowledge" && location.pathname.startsWith("/knowledge")) ||
            (tab.path === "/salary" && (location.pathname === "/salary" || location.pathname.startsWith("/calculator")));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-all duration-300 relative group ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/30 scale-105 shadow-lg ring-2 ring-blue-200 dark:ring-blue-700"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
              }`}
              style={{ minWidth: 56 }}
            >
              <Icon size={isActive ? 22 : 18} strokeWidth={isActive ? 2.2 : 1.8} className="transition-all duration-300" />
              <span className={`text-xs mt-0.5 font-medium transition-all duration-300 text-center ${isActive ? 'font-semibold' : ''}`} style={{lineHeight: '1.1'}}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
