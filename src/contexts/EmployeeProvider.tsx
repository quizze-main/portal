import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { internalApiClient, Employee, type LoovisStoreOption, type UserSettingsResponse } from '@/lib/internalApiClient';
import { NotRegistered } from '@/pages/NotRegistered';
import { PinCodeModal } from '@/components/PinCodeModal';
import { Spinner } from '@/components/Spinner';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { authDemo } from '@/lib/authClient';
import { ymParams } from '@/lib/metrics';
import { isLeaderDashboardEligible, isCareManager } from '@/lib/roleUtils';
import { mapStoreNameToBranchId } from '@/lib/salaryAccess';
import { getAvailablePositions } from '@/data/branchData';

// Ensure Telegram types are available
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initDataUnsafe?: {
          user?: {
            username: string;
            id: number;
          };
        };
      };
    };
  }
}

const tg = window.Telegram?.WebApp;

interface EmployeeContextType {
  employee: Employee | null;
  reloadEmployee: () => void;
  storeId: string | null;
  setActiveStoreId: (storeId: string | null) => void;
  storeOptions: LoovisStoreOption[];
  /** Флаг: данные о storeOptions уже загружены (loadLoovisRole завершён) */
  storeOptionsLoaded: boolean;
  loovisRole: string | null;
  hasAllBranchesAccess: boolean;
  canUseLeaderDashboard: boolean;
  canUseSalaryCalculator: boolean;
  canEditSalaryCalculator: boolean;
  userSettings: UserSettingsResponse | null;
  reloadUserSettings: () => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [departmentStoreId, setDepartmentStoreId] = useState<string | null>(null);
  const [storeOptions, setStoreOptions] = useState<LoovisStoreOption[]>([]);
  const [storeOptionsLoaded, setStoreOptionsLoaded] = useState(false);
  const [loovisRole, setLoovisRole] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [usernameToLoad, setUsernameToLoad] = useState<string | undefined>(tg?.initDataUnsafe?.user?.username);
  const [isPinModalOpen, setPinModalOpen] = useState(false);

  const reloadUserSettings = useCallback(() => {
    if (!employee?.name) {
      setUserSettings(null);
      return;
    }
    void (async () => {
      const s = await internalApiClient.getUserSettings();
      setUserSettings(s);
    })();
  }, [employee?.name]);

  const loadEmployee = useCallback(async (isReload = false) => {
    // При перезагрузке всегда используем username из Telegram
    const username = isReload ? tg?.initDataUnsafe?.user?.username : usernameToLoad;

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    if (!username) {
      setIsNotFound(true);
      setEmployee(null); // Сбрасываем данные при отсутствии username
      setLoading(false);
      return;
    }

    try {
      // Получаем chat_id из Telegram WebApp если доступен
      const chatId = tg?.initDataUnsafe?.user?.id;
      const employeeData = await internalApiClient.findEmployeeByTelegramUsername(username, chatId);
      if (employeeData) {
        // Формируем ФИО (employeeid)
        const employeename = `${employeeData.employee_name} (${employeeData.name})`;
        // Авторизация через Telegram WebApp
        const telegramUser = tg?.initDataUnsafe?.user;
        if (telegramUser) {
          await internalApiClient.authenticateTelegram(telegramUser, employeename);
        }
        setEmployee(employeeData);
      } else {
        setIsNotFound(true);
        setEmployee(null); // Сбрасываем данные если сотрудник не найден
      }
    } catch (err) {
      setError("Ошибка при загрузке данных сотрудника.");
      setEmployee(null); // Сбрасываем данные при ошибке
      console.error("❌ Ошибка загрузки сотрудника:", err);
    } finally {
      setLoading(false);
    }
  }, [usernameToLoad]);
  
  const reloadEmployee = useCallback(() => {
    // Сбрасываем демо-режим и перезагружаем по TG username
    setEmployee(null); // Сбрасываем старые данные
    setUsernameToLoad(tg?.initDataUnsafe?.user?.username);
    loadEmployee(true);
  }, [loadEmployee]);

  // Отправляем employee_id в Яндекс.Метрику, когда данные сотрудника загружены или изменились
  useEffect(() => {
    if (employee?.name && employee.employee_name) {
      ymParams({ emploee_id: `${employee.employee_name} (${employee.name})` });
    }
  }, [employee?.name]);

  // 🔹 Получаем custom_store_id департамента и сохраняем в состоянии
  useEffect(() => {
    const fetchDepartmentStoreId = async () => {
      if (!employee?.department) return;
      try {
        const dep = await internalApiClient.getDepartmentById(employee.department);
        if (dep?.custom_store_id) {
          console.log('Custom Store ID:', dep.custom_store_id);
          setDepartmentStoreId(dep.custom_store_id);
          // Fallback: если loovis роли не дали storeOptions — используем storeId из департамента
          setStoreId((prev) => prev ?? dep.custom_store_id);
        } else {
          console.warn('custom_store_id не найден для департамента', employee.department);
        }
      } catch (err) {
        console.error('Ошибка загрузки custom_store_id:', err);
      }
    };

    fetchDepartmentStoreId();
  }, [employee?.department]);

  // 🔹 Новый приоритетный источник доступа: loovis_get_employee_role (storeOptions + loovisRole)
  useEffect(() => {
    let cancelled = false;

    // Сбрасываем флаг, пока грузим данные
    setStoreOptionsLoaded(false);

    const loadLoovisRole = async () => {
      if (!employee?.name) {
        // Если нет employee — тоже считаем «загрузку» завершённой (нет данных)
        setStoreOptionsLoaded(true);
        return;
      }

      try {
        const resp = await internalApiClient.getLoovisEmployeeRole();
        if (cancelled) return;

        const role = resp?.loovis_role ?? null;
        const options = Array.isArray(resp?.stores) ? resp!.stores : [];

        setLoovisRole(role);
        // LIS-R-00000:
        // - для менеджера заботы: ничего нового (stores игнорируем)
        // - для руководителя клуба/клиники: доступ как у руководителя "как раньше" (на свой клуб)
        if (role === 'LIS-R-00000') {
          setStoreOptions([]);
          // Если department->custom_store_id по какой-то причине не подгрузился, но в ответе есть 1 store —
          // используем его как fallback на "свой клуб".
          const fallbackStore = options?.[0]?.store_id ? String(options[0].store_id) : null;
          if (fallbackStore) {
            setStoreId((prev) => prev ?? fallbackStore);
          }
          return;
        }

        setStoreOptions(options);

        // Если сервер вернул хотя бы один custom_store_id — это главный источник прав.
        if (options.length > 0) {
          const key = `store.selected.${String(employee.name)}`;
          let saved: string | null = null;
          try { saved = localStorage.getItem(key); } catch { saved = null; }

          const savedValid = saved ? options.some((o) => o.store_id === saved) : false;
          const currentValid = storeId ? options.some((o) => o.store_id === storeId) : false;

          const next =
            (savedValid ? saved : null) ||
            (currentValid ? storeId : null) ||
            options[0].store_id;

          setStoreId((prev) => (prev === next ? prev : next));
          return;
        }

        // Если storeOptions нет — оставляем текущий storeId (или падаем на Department.custom_store_id)
        if (!storeId && departmentStoreId) {
          setStoreId(departmentStoreId);
        }
      } finally {
        if (!cancelled) {
          setStoreOptionsLoaded(true);
        }
      }
    };

    loadLoovisRole();
    return () => {
      cancelled = true;
    };
    // storeId НЕ добавляем в deps, чтобы не перезапрашивать роль на каждый выбор клуба
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.name, departmentStoreId]);

  // 🔹 Preload user settings from Frappe so dashboards can apply layout immediately on first open
  useEffect(() => {
    if (!employee?.name) {
      setUserSettings(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await internalApiClient.getUserSettings();
      if (cancelled) return;
      setUserSettings(s);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [employee?.name]);

  const setActiveStoreId = useCallback((nextStoreId: string | null) => {
    setStoreId(nextStoreId);
    if (!employee?.name) return;
    const key = `store.selected.${String(employee.name)}`;
    try {
      if (nextStoreId) localStorage.setItem(key, nextStoreId);
      else localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }, [employee?.name]);

  // LIS-R-00001 может приходить как:
  // - "на свой клуб/клинику" (обычно 1 store)
  // - "на все клубы" (много stores)
  // Поэтому "все филиалы" определяем по наличию множества storeOptions.
  const hasAllBranchesAccess = loovisRole === 'LIS-R-00001' && storeOptions.length > 1;
  const isStandardAccess = loovisRole === 'LIS-R-00000';

  // Фиче-флаг: новый дашборд доступен только для руководителей определённых клубов.
  const NEW_DASHBOARD_ALLOWED_STORE_IDS = new Set(['1000000008', '1000000052', '1000000009']);
  // Филиалы где ВСЕ сотрудники (включая менеджеров заботы) имеют доступ к новому дашборду
  const FULL_DASHBOARD_ACCESS_STORE_IDS = new Set(['1000000009']); // Калининград
  const isLeaderByDesignation = isLeaderDashboardEligible(employee?.designation);

  // Собираем все store_id доступные пользователю
  const userStoreIds = (() => {
    const ids = new Set<string>();
    if (storeId) ids.add(String(storeId).trim());
    if (!isStandardAccess) {
      for (const s of storeOptions) {
        if (s?.store_id) ids.add(String(s.store_id).trim());
      }
    }
    return ids;
  })();

  const allowedByStore = (() => {
    for (const id of userStoreIds) {
      if (NEW_DASHBOARD_ALLOWED_STORE_IDS.has(id)) return true;
    }
    return false;
  })();

  // Проверяем, является ли сотрудник менеджером заботы из филиала с расширенным доступом
  const isCareManagerWithFullAccess = (() => {
    if (!isCareManager(employee?.designation)) return false;
    for (const id of userStoreIds) {
      if (FULL_DASHBOARD_ACCESS_STORE_IDS.has(id)) return true;
    }
    return false;
  })();

  // Итог:
  // - LIS-R-00001 + все клубы: доступен новый дашборд всем (независимо от должности)
  // - Калининград (1000000009): доступ только менеджерам заботы (старшие, ведущие и т.д.)
  // - LIS-R-00001 + 1 клуб: ведём себя как обычный доступ на свой клуб (storeId из ответа)
  // - LIS-R-00000 + руководитель: новый дашборд только если storeId в allowlist
  // - остальные роли: новый дашборд только если руководитель и есть доступный store из allowlist
  const canUseLeaderDashboard =
    hasAllBranchesAccess ||
    isCareManagerWithFullAccess ||
    (loovisRole === 'LIS-R-00001' && storeOptions.length === 1 && isLeaderByDesignation) ||
    (isLeaderByDesignation && allowedByStore && loovisRole !== 'LIS-R-00001');

  // Salary calculator access:
  // - full access: LIS-R-00001 with all branches OR leaders (any club/clinic leader by designation)
  // - менеджеры заботы: доступ везде (все филиалы)
  // - оптометристы: доступ если в branchData есть позиция 'optometrist', КРОМЕ СПБ (1000000008)
  const SPB_STORE_ID = '1000000008';

  // Normalize designation to be resilient to:
  // - extra whitespace / suffixes ("- LR")
  // - "ё" vs "е"
  // - accidental latin homoglyphs inside cyrillic words (e.g. "оптoметрист" with latin "o")
  const normalizeDesignation = (raw: string): string => {
    const latinToCyr = new Map<string, string>([
      ['a', 'а'],
      ['c', 'с'],
      ['e', 'е'],
      ['k', 'к'],
      ['m', 'м'],
      ['o', 'о'],
      ['p', 'р'],
      ['t', 'т'],
      ['x', 'х'],
      ['y', 'у'],
      ['b', 'в'],
      ['h', 'н'],
    ]);
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s*-\s*lr\s*$/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[acekmoptxybh]/g, (ch) => latinToCyr.get(ch) ?? ch);
  };

  const designationRaw = employee?.designation ?? '';
  const designationNorm = normalizeDesignation(designationRaw);
  const isCareManagerByDesignation = /(менеджер)\s*(по\s*)?забот/.test(designationNorm);
  const isOptometrist = designationNorm.includes('оптометрист');
  const normalizedStoreId = String(storeId ?? '').trim();
  const isSPB = normalizedStoreId === SPB_STORE_ID;

  // Получаем branchId из имени текущего store для проверки конфига
  const currentStoreName = storeOptions.find(s => String(s.store_id) === normalizedStoreId)?.name ?? '';
  const branchId = mapStoreNameToBranchId(currentStoreName);
  // Проверяем есть ли оптометрист в конфиге калькулятора для этого филиала
  const branchHasOptometrist = branchId
    ? getAvailablePositions(branchId).some(p => p.id === 'optometrist')
    : false;

  const canEditSalaryCalculator = hasAllBranchesAccess || isLeaderByDesignation;
  const canUseSalaryCalculator =
    canEditSalaryCalculator ||
    isCareManagerByDesignation ||  // менеджеры заботы — везде
    (isOptometrist && !isSPB && branchHasOptometrist);  // оптометристы — если не СПБ и есть в конфиге branchData

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);
  
  const handlePinSuccess = async (pin: string): Promise<boolean> => {
    try {
      const resp = await authDemo(pin);
      if (!resp.ok) {
        return false;
      }
      setUsernameToLoad("fedulovdm");
      setPinModalOpen(false);
      return true;
    } catch (authError) {
      console.error('Ошибка авторизации в демо-режиме:', authError);
      return false;
    }
  };

  // Dev auto-login: skip PIN modal entirely (hooks must be before any conditional returns)
  const [devAutoLoginAttempted, setDevAutoLoginAttempted] = useState(false);
  useEffect(() => {
    if (
      isNotFound &&
      !employee &&
      !loading &&
      !devAutoLoginAttempted &&
      import.meta.env.VITE_DEV_AUTO_LOGIN === 'true'
    ) {
      setDevAutoLoginAttempted(true);
      fetch('/api/auth/dev-auto', { method: 'POST', credentials: 'include' })
        .then((r) => {
          if (r.ok) {
            setUsernameToLoad('fedulovdm');
          }
        })
        .catch(() => {});
    }
  }, [isNotFound, employee, loading, devAutoLoginAttempted]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isNotFound && !employee) {
    // Still waiting for dev auto-login to complete
    if (import.meta.env.VITE_DEV_AUTO_LOGIN === 'true' && !devAutoLoginAttempted) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      );
    }
    if (isPinModalOpen) {
      return (
        <ModalWrapper isOpen={isPinModalOpen} onClose={() => setPinModalOpen(false)}>
          <PinCodeModal
            isOpen={isPinModalOpen}
            onClose={() => setPinModalOpen(false)}
            onPinSuccess={handlePinSuccess}
          />
        </ModalWrapper>
      );
    } else {
      return <NotRegistered onEnterDemoMode={() => setPinModalOpen(true)} />;
    }
  }
  
  if (error) {
     return (
        <div className="flex items-center justify-center h-full text-center p-4">
            <p className="text-red-500">{error}</p>
        </div>
     );
  }

  if (employee) {
    return (
      <EmployeeContext.Provider value={{ employee, reloadEmployee, storeId, setActiveStoreId, storeOptions, storeOptionsLoaded, loovisRole, hasAllBranchesAccess, canUseLeaderDashboard, canUseSalaryCalculator, canEditSalaryCalculator, userSettings, reloadUserSettings }}>
        {children}
      </EmployeeContext.Provider>
    );
  }
  
  return null; // Should not be reached in normal flow
}; 
