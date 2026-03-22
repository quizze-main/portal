import { OverbrainLogo } from './OverbrainLogo';
import { Link } from 'react-router-dom';
import { MODULES } from './moduleData';
import { MessageCircle } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-gray-200/20 dark:border-white/5 bg-gray-950 px-6 py-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
          <div className="md:w-[260px] shrink-0">
            <OverbrainLogo size="sm" className="mb-3" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Платформа Layer 2 для розничных сетей. Подключается к вашей ERP, CRM и аналитике.
            </p>
            <a
              href="https://t.me/overbrain_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Telegram
            </a>
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Модули</h4>
            <div className="columns-2 sm:columns-3 gap-x-6 gap-y-0">
              {MODULES.map((mod) => (
                <Link
                  key={mod.slug}
                  to={`/landing/module/${mod.slug}`}
                  className="block text-sm text-gray-500 hover:text-white transition-colors py-1"
                >
                  {mod.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/80 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">&copy; 2026 Overbrain. Все права защищены.</p>
          <div className="flex items-center gap-6">
            <Link to="/landing" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Главная
            </Link>
            <a href="https://t.me/overbrain_bot" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Поддержка
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
