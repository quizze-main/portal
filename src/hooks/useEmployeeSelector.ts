import { useState, useCallback, useRef } from 'react';
import { internalApiClient, Employee } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';

interface UseEmployeeSelectorResult {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadEmployees: () => Promise<void>;
  searchEmployees: (query: string) => Promise<void>;
  getSortedEmployees: (list: Employee[]) => Employee[];
}

export function useEmployeeSelector(): UseEmployeeSelectorResult {
  const { employee } = useEmployee();
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Используем ref, чтобы отслеживать самый последний запрос поиска
  const latestQueryRef = useRef<string>('');

  // Таймер для debounce поискового запроса
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cache for the complete employee list to enable client-side searching without repeated network requests.
  const allEmployeesRef = useRef<Employee[] | null>(null);

  const getSortedEmployees = useCallback((list: Employee[]) => {
    if (!employee) return list;
    const others = list.filter(e => e.name !== employee.name);
    const selfInList = list.find(e => e.name === employee.name);
    if (selfInList) {
      return [selfInList, ...others];
    } else {
      return [employee, ...others];
    }
  }, [employee]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const currentEmployeeDepartment = employee?.department;
      const employeesData = await internalApiClient.getEmployeesByDepartment(currentEmployeeDepartment, 10);
      setEmployees(getSortedEmployees(employeesData));
    } catch (err) {
      setError('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  }, [employee, getSortedEmployees]);

  const searchEmployees = useCallback(
    async (query: string) => {
      // Сохраняем текущий запрос как самый свежий
      latestQueryRef.current = query;

      // Очищаем предыдущий таймер, если пользователь продолжает ввод
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Небольшая задержка, чтобы снизить количество запросов к серверу
      debounceTimer.current = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);

          // Ensure we have a full dataset to search through. Fetch once and cache.
          if (!allEmployeesRef.current) {
            try {
              // Prefer department-scoped list if department defined, otherwise fetch all.
              if (employee?.department) {
                allEmployeesRef.current = await internalApiClient.getEmployeesByDepartment(employee.department, 1000);
              } else {
                allEmployeesRef.current = await internalApiClient.getAllEmployees();
              }
            } catch (fetchErr) {
              console.error('Ошибка загрузки полного списка сотрудников для поиска', fetchErr);
              allEmployeesRef.current = [];
            }
          }

          // Локальная фильтрация с учётом регистра и любой части имени/фамилии.
          const normalized = query.trim().toLowerCase();
          let filtered: Employee[];
          if (normalized) {
            filtered = (allEmployeesRef.current || []).filter((emp) =>
              emp.employee_name.toLowerCase().includes(normalized)
            );
          } else {
            filtered = getSortedEmployees(allEmployeesRef.current || []);
          }

          // Если за время запроса пользователь изменил строку поиска, игнорируем устаревший ответ
          if (latestQueryRef.current !== query) return;

          setEmployees(filtered);
        } catch (err) {
          setError('Ошибка поиска сотрудников');
        } finally {
          // Проверяем, что ответ относится к актуальному запросу, прежде чем снимать loading
          if (latestQueryRef.current === query) {
            setLoading(false);
          }
        }
      }, 300); // 300 мс задержка
    },
    [employee, getSortedEmployees]
  );

  return {
    employees,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    loadEmployees,
    searchEmployees,
    getSortedEmployees,
  };
} 