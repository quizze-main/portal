import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center space-x-2 select-none">
      <Sun 
        size={20} 
        className={`transition-colors duration-300 drop-shadow-sm ${
          !isDark ? 'text-yellow-400 glow-sun' : 'text-gray-400 dark:text-gray-500'
        }`}
      />
      <label className="relative inline-flex items-center cursor-pointer group focus:outline-none">
        <input
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
          className="sr-only"
        />
        <div 
          className={`w-12 h-7 rounded-full transition-colors duration-300 border border-gray-300 dark:border-gray-600 bg-gradient-to-r ${
            isDark ? 'from-blue-500 to-blue-700 shadow-[0_0_8px_2px_rgba(56,189,248,0.25)]' : 'from-yellow-200 to-yellow-400 shadow-[0_0_8px_2px_rgba(253,224,71,0.15)]'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 group-active:scale-110 ${
              isDark ? 'translate-x-5' : 'translate-x-0'
            }`}
            style={{ boxShadow: isDark ? '0 0 8px 2px #60a5fa55' : '0 0 8px 2px #fde04755' }}
          />
        </div>
      </label>
      <Moon 
        size={20} 
        className={`transition-colors duration-300 drop-shadow-sm ${
          isDark ? 'text-blue-400 dark:text-blue-300 glow-moon' : 'text-gray-400'
        }`}
      />
      <style>{`
        .glow-sun { text-shadow: 0 0 8px #fde04788; }
        .glow-moon { text-shadow: 0 0 8px #60a5fa88; }
      `}</style>
    </div>
  );
}; 