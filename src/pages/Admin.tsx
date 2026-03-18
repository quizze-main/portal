import React, { useState } from 'react';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  BookOpen,
  BarChart3,

  Building2,
  Send,
  Settings,
  Shield,
} from 'lucide-react';
import { useAdminIntegrations } from '@/hooks/useAdminIntegrations';
import { IntegrationCard } from '@/components/admin/IntegrationCard';
import { AdminSectionPlaceholder } from '@/components/admin/AdminSectionPlaceholder';
import { AdminKnowledge } from '@/components/admin/AdminKnowledge';
import { AdminOrg } from '@/components/admin/AdminOrg';
import { AdminMailings } from '@/components/admin/AdminMailings';
import { AdminDashboard } from '@/components/admin/AdminDashboard';


const categoryOrder = ['core', 'external', 'data_source', 'logging', 'dev'];
const categoryTitles: Record<string, string> = {
  core: 'Core',
  external: 'External',
  data_source: 'Data Sources',
  logging: 'Logging',
  dev: 'Dev / Infra',
};

const sections = [
  { id: 'knowledge', label: 'База знаний', icon: BookOpen, description: 'Статьи, коллекции и права доступа', group: 'content' },
  { id: 'dashboard', label: 'Дашборд', icon: BarChart3, description: 'Метрики, пороговые значения, шаблоны', group: 'analytics' },

  { id: 'org', label: 'Орг структура', icon: Building2, description: 'Департаменты, филиалы, роли', group: 'management' },
  { id: 'mailings', label: 'Рассылки', icon: Send, description: 'Telegram, шаблоны, аналитика', group: 'management' },
  { id: 'system', label: 'Система', icon: Settings, description: 'API-интеграции и статус', group: 'system' },
] as const;

const sectionGroups = [
  { key: 'content', label: 'Контент' },
  { key: 'analytics', label: 'Аналитика' },
  { key: 'management', label: 'Управление' },
  { key: 'system', label: 'Система' },
];

type SectionId = (typeof sections)[number]['id'];

export const Admin: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('system');
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminIntegrations();

  const grouped = React.useMemo(() => {
    if (!data?.integrations) return {};
    const map: Record<string, any[]> = {};
    for (const item of data.integrations) {
      (map[item.category] ??= []).push(item);
    }
    return map;
  }, [data]);

  const active = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="flex flex-1 min-h-0 bg-muted/40">
      {/* ── Sidebar ── */}
      <aside className="w-14 sm:w-52 lg:w-60 shrink-0 bg-card border-r flex flex-col overflow-y-auto">
        {/* Logo / Title */}
        <div className="hidden sm:flex items-center gap-2.5 px-5 py-4 border-b">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Админ-панель</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Управление системой</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 sm:px-3 space-y-4">
          {sectionGroups.map((group) => {
            const groupSections = sections.filter((s) => s.group === group.key);
            if (groupSections.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {groupSections.map(({ id, label, icon: Icon }) => {
                    const isActive = activeSection === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        title={label}
                        className={`w-full flex items-center gap-2.5 px-2.5 sm:px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] shrink-0 mx-auto sm:mx-0 ${isActive ? 'text-primary' : ''}`} />
                        <span className="hidden sm:inline truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Section Header */}
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b">
          <div className="px-5 sm:px-8 lg:px-10 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <active.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{active.label}</h2>
                <p className="text-sm text-muted-foreground">{active.description}</p>
              </div>
            </div>
            {active.id === 'system' && (
              <div className="flex items-center gap-3">
                {data?.checkedAt && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Проверено: {new Date(data.checkedAt).toLocaleTimeString()}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Section Content */}
        <div className="px-5 sm:px-8 lg:px-10 py-6 pb-24">
          {active.id === 'system' ? (
            <>
              {isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {isError && (
                <div className="text-center text-red-500 py-8">
                  Ошибка: {(error as Error)?.message || 'Не удалось загрузить данные'}
                </div>
              )}

              {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {categoryOrder.map((cat) => {
                    const items = grouped[cat];
                    if (!items?.length) return null;
                    return (
                      <section key={cat}>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          {categoryTitles[cat] || cat}
                        </h3>
                        <div className="space-y-3">
                          {items.map((item) => (
                            <IntegrationCard key={item.id} data={item} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          ) : active.id === 'knowledge' ? (
            <AdminKnowledge />
          ) : active.id === 'org' ? (
            <AdminOrg />
          ) : active.id === 'dashboard' ? (
            <AdminDashboard />
          ) : active.id === 'mailings' ? (
            <AdminMailings />
          ) : (
            <AdminSectionPlaceholder
              icon={<active.icon className="w-12 h-12" />}
              title={active.label}
              description={active.description}
            />
          )}
        </div>
      </main>
    </div>
  );
};
