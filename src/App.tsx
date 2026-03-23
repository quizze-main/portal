import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { Dashboard } from "./pages/Dashboard";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeDetail } from "./pages/KnowledgeDetail";
import { Profile } from "./pages/Profile";
import { AllTasks } from "./pages/AllTasks";
import SalaryCalculatorPage from "./pages/SalaryCalculatorPage";
import BranchCalculatorPage from "./pages/BranchCalculatorPage";
import { BottomNavigation } from "./components/BottomNavigation";
import Reviews from "./pages/Reviews";
import { EmployeeProvider, useEmployee } from "./contexts/EmployeeProvider";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { useEffect, useState } from 'react';
import AttentionDeals from "./pages/AttentionDeals";
import { SwipeBack } from "./components/SwipeBack";
import { useYandexMetrika } from "./hooks/useYandexMetrika";
import { YANDEX_METRIKA_ID } from "@/lib/metrics";
import { InAppSse } from "@/components/InAppSse";
import { RequireClubManager } from "@/components/RequireClubManager";
import LeaderMetricDetail from "@/pages/leader-dashboard/MetricDetail";
import LeaderManagerDetail from "@/pages/leader-dashboard/ManagerDetail";
import LeaderReviewsDetail from "@/pages/leader-dashboard/ReviewsDetail";
import OptometristDetail from "@/pages/leader-dashboard/OptometristDetail";
import { Admin } from "./pages/Admin";
import { ManualDataEntry } from "./pages/ManualDataEntry";
import ShiftSchedulePage from "./pages/ShiftSchedule";
import { BurgerMenu } from "./components/BurgerMenu";
import AdminSalary from "./pages/AdminSalary";
import { RequireAccountant } from "./components/RequireAccountant";
import { DeployVersionBadge } from "./components/DeployVersionBadge";

const LandingPage = lazy(() => import('./pages/Landing'));
const LandingModuleDetailPage = lazy(() => import('./pages/LandingModuleDetail'));

const queryClient = new QueryClient();

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

const YandexMetrikaUserId = () => {
  const { employee } = useEmployee();
  useEffect(() => {
    if (window.ym && employee?.name) {
      window.ym(YANDEX_METRIKA_ID, 'params', { user_id: employee.name });
    }
  }, [employee]);
  return null;
};

const YandexMetrikaPageHit = () => {
  useYandexMetrika();
  return null;
};

const RequireSalaryCalculator = ({ children }: { children: JSX.Element }) => {
  const { canUseSalaryCalculator } = useEmployee();
  if (!canUseSalaryCalculator) return <Navigate to="/" replace />;
  return children;
};
function TelegramStartParamHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const parseAndStore = (raw: string | null | undefined) => {
      if (!raw) return null;
      const startParam = String(raw);
      // v2: task_<rawTaskName> (check first — raw task names like TASK-00012 match base64url charset)
      let mTaskV2 = /^task_(TASK-.+)$/.exec(startParam);
      if (mTaskV2) {
        return `/all-tasks?openTask=${encodeURIComponent(mTaskV2[1])}`;
      }
      // v3: task_<base64url(taskName)>
      let mTask = /^task_([A-Za-z0-9_-]+)$/.exec(startParam);
      if (mTask) {
        const fromBase64Url = (s: string) => {
          s = s.replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4 !== 0) s += '=';
          try { return atob(s); } catch { return s; }
        };
        const taskName = fromBase64Url(mTask[1]);
        return `/all-tasks?openTask=${encodeURIComponent(taskName)}`;
      }
      // v3: kbdoc_<base64url(id)> / kbcol_<base64url(id)>
      let m = /^(kbdoc|kbcol)_([A-Za-z0-9_-]+)$/.exec(startParam);
      if (m) {
        const kind = m[1];
        let enc = m[2];
        const fromBase64Url = (s: string) => {
          s = s.replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4 !== 0) s += '=';
          try { return atob(s); } catch { return s; }
        };
        const id = fromBase64Url(enc);
        return kind === 'kbdoc'
          ? `/knowledge/${encodeURIComponent(id)}`
          : `/knowledge/collection/${encodeURIComponent(id)}`;
      }
      // v2: task_<taskName> (raw, non-TASK- prefix — fallback)
      m = /^task_([^:]+)$/.exec(startParam);
      if (m && !m[1].match(/^[A-Za-z0-9_-]+$/) ) {
        const name = m[1];
        return `/all-tasks?openTask=${encodeURIComponent(name)}`;
      }
      // v2: kb_doc_<id> / kb_col_<id>
      m = /^kb_(doc|col)_(.+)$/.exec(startParam);
      if (m) {
        const kind = m[1];
        let id = m[2];
        if (/^[0-9a-fA-F]{32}$/.test(id)) {
          id = `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
        }
        return kind === 'doc'
          ? `/knowledge/${encodeURIComponent(id)}`
          : `/knowledge/collection/${encodeURIComponent(id)}`;
      }
      // v1: task:<taskName>
      m = /^task:(.+)$/.exec(startParam);
      if (m) {
        const name = m[1];
        return `/all-tasks?openTask=${encodeURIComponent(name)}`;
      }
      // v1: kb:doc:<id> / kb:col:<id>
      m = /^kb:(doc|col):(.+)$/.exec(startParam);
      if (m) {
        const kind = m[1];
        const id = m[2];
        return kind === 'doc'
          ? `/knowledge/${encodeURIComponent(id)}`
          : `/knowledge/collection/${encodeURIComponent(id)}`;
      }
      return null;
    };

    const tryRead = () => {
      // Если уже обработали — не перезаписываем снова
      try {
        if (sessionStorage.getItem('kbStartHandled') === '1') return false;
      } catch {}
      const query = new URLSearchParams(window.location.search);
      let raw = query.get('tgWebAppStartParam');
      if (!raw && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
        raw = window.Telegram.WebApp.initDataUnsafe.start_param;
      }
      const target = parseAndStore(raw);
      if (target) {
        try {
          sessionStorage.setItem('kbStartTarget', target);
          sessionStorage.setItem('kbStartHandled', '1');
        } catch {}
        return true;
      }
      return false;
    };

    // Первая попытка
    if (tryRead()) return;
    // Несколько повторов, чтобы дождаться initData в Telegram
    const timeouts: number[] = [] as any;
    [100, 250, 500, 1000, 1500].forEach((ms) => {
      const t = window.setTimeout(() => { if (!cancelled) tryRead(); }, ms);
      timeouts.push(t);
    });
    return () => {
      cancelled = true;
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [navigate]);
  return null;
}

function StartAfterAuthNavigator() {
  const { employee } = useEmployee();
  const navigate = useNavigate();
  useEffect(() => {
    if (!employee) return;
    try {
      const tryNavigate = () => {
        const t = sessionStorage.getItem('kbStartTarget');
        if (t) {
          navigate(t, { replace: true });
          sessionStorage.removeItem('kbStartTarget');
          try { sessionStorage.setItem('kbStartHandled', '1'); } catch {}
          return true;
        }
        return false;
      };
      if (tryNavigate()) return;
      // Пытаемся ещё раз немного позже — чтобы успел сохраниться старт-параметр
      const t1 = setTimeout(() => { tryNavigate(); }, 150);
      const t2 = setTimeout(() => { tryNavigate(); }, 400);
      const t3 = setTimeout(() => { tryNavigate(); }, 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } catch {}
  }, [employee, navigate]);
  return null;
}


function getInstallInstruction() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      title: 'Установить на экран iPhone',
      text: 'Откройте меню Safari (иконка  fe0f5d2 внизу), выберите «На экран "Домой"».'
    };
  }
  if (/Android/i.test(ua)) {
    return {
      title: 'Установить на Android',
      text: 'Откройте меню браузера (⋮ или ☰), выберите «Установить приложение» или «Добавить на главный экран».'
    };
  }
  return {
    title: 'Установить приложение',
    text: 'Добавьте это приложение на домашний экран через меню браузера.'
  };
}

function InstallAppInstructionModal() {
  const [hidden, setHidden] = useState(false);
  const [show, setShow] = useState(false);
  const [instruction, setInstruction] = useState(getInstallInstruction());

  useEffect(() => {
    try {
      if (localStorage.getItem('hideInstallAppInstruction') === '1') {
        setHidden(true);
      } else {
        setShow(true);
      }
    } catch {
      // Если storage недоступен, не показываем модалку, чтобы избежать падений
      setHidden(true);
      setShow(false);
    }
  }, []);

  const handleHide = () => {
    setHidden(true);
    setShow(false);
    try { localStorage.setItem('hideInstallAppInstruction', '1'); } catch {}
  };

  if (hidden || !show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(30, 41, 59, 0.18)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.25)',
        color: '#222',
        borderRadius: 20,
        padding: '30px 22px 22px 22px',
        boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)',
        maxWidth: 350,
        width: '92%',
        textAlign: 'center',
        fontFamily: 'inherit',
        position: 'relative',
        border: '1.5px solid rgba(79,70,229,0.13)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}>
        <button
          onClick={handleHide}
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'rgba(255,255,255,0.5)',
            border: 'none',
            color: '#444',
            fontSize: 22,
            cursor: 'pointer',
            opacity: 0.7,
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          title="Скрыть инструкцию"
          aria-label="Скрыть инструкцию"
        >×</button>
        <img src="/icon-192.png" alt="App Icon" style={{width: 64, height: 64, borderRadius: 16, margin: '0 auto 12px auto', boxShadow: '0 2px 12px rgba(79,70,229,0.10)'}} />
        <div style={{fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#2d2d2d', letterSpacing: 0.1}}> {instruction.title} </div>
        <div style={{fontSize: 15, opacity: 0.93, color: '#333', lineHeight: 1.5}}>{instruction.text}</div>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <div className="h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col transition-colors duration-300">
      <main className={`flex-grow ${isAdmin ? 'flex flex-col overflow-hidden' : 'overflow-y-auto pb-24'}`}>
        {children}
      </main>
      <BurgerMenu />
      <BottomNavigation />
    </div>
  );
}

const App = () => {
  const { isTelegramWebApp, version, clearCache } = useServiceWorker();

  // Логируем информацию о Service Worker
  useEffect(() => {
    console.log('🔧 App Info:', {
      isTelegramWebApp,
      swVersion: version,
      buildTime: __BUILD_TIME__
    });
  }, [isTelegramWebApp, version]);

    return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing pages — outside EmployeeProvider, no auth required */}
              <Route path="/landing" element={
                <Suspense fallback={<div className="min-h-screen" />}>
                  <LandingPage />
                </Suspense>
              } />
              <Route path="/landing/module/:slug" element={
                <Suspense fallback={<div className="min-h-screen" />}>
                  <LandingModuleDetailPage />
                </Suspense>
              } />
              {/* All other routes — wrapped in EmployeeProvider + AppShell */}
              <Route path="/*" element={
                <EmployeeProvider>
                  <InAppSse />
                  <YandexMetrikaUserId />
                  <SwipeBack />
                  <YandexMetrikaPageHit />
                  <TelegramStartParamHandler />
                  <StartAfterAuthNavigator />
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route
                        path="/dashboard/reviews-detail"
                        element={
                          <RequireClubManager>
                            <LeaderReviewsDetail />
                          </RequireClubManager>
                        }
                      />
                      <Route
                        path="/dashboard/metric/:metricId"
                        element={
                          <RequireClubManager>
                            <LeaderMetricDetail />
                          </RequireClubManager>
                        }
                      />
                      <Route
                        path="/dashboard/manager/:managerId"
                        element={
                          <RequireClubManager>
                            <LeaderManagerDetail />
                          </RequireClubManager>
                        }
                      />
                      <Route
                        path="/dashboard/optometrist/:optometristId"
                        element={
                          <RequireClubManager>
                            <OptometristDetail />
                          </RequireClubManager>
                        }
                      />
                      <Route path="/knowledge" element={<KnowledgeBase />} />
                      <Route path="/knowledge/collection/:id" element={<KnowledgeDetail />} />
                      <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
                      <Route path="/salary" element={<Navigate to="/calculator" replace />} />
                      <Route path="/calculator" element={<RequireSalaryCalculator><SalaryCalculatorPage /></RequireSalaryCalculator>} />
                      <Route path="/calculator/:branchId" element={<RequireSalaryCalculator><BranchCalculatorPage /></RequireSalaryCalculator>} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/all-tasks" element={<AllTasks />} />
                      <Route path="/attention-deals" element={<AttentionDeals />} />
                      <Route path="/admin" element={<RequireClubManager><Admin /></RequireClubManager>} />
                      <Route path="/admin/salary" element={<RequireAccountant><AdminSalary /></RequireAccountant>} />
                      <Route path="/manual-data" element={<RequireClubManager><ManualDataEntry /></RequireClubManager>} />
                      <Route path="/shift-schedule" element={<ShiftSchedulePage />} />
                    </Routes>
                  </AppShell>
                  <InstallAppInstructionModal />
                </EmployeeProvider>
              } />
            </Routes>
          <DeployVersionBadge />
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
