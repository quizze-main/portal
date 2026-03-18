import { useState, useEffect } from 'react';
import { internalApiClient, Task } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { logger } from '@/lib/logger';
import { ymReachGoal } from '@/lib/metrics';
import { applyPendingTaskStatuses, clearPendingTaskStatus, flushPendingTaskStatuses, setPendingTaskStatus } from '@/lib/taskStatusOutbox';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { employee } = useEmployee();

  const loadTasks = async () => {
    if (!employee?.name) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Загружаем все задачи, назначенные текущему пользователю (без фильтра по дате)
      const tasksData = await internalApiClient.getAllTasksForEmployee(employee.name, 'all', 'assignee');
      setTasks(applyPendingTaskStatuses(tasksData));
      setError(null);
    } catch (err) {
      setError('Ошибка загрузки задач');
      logger.error('❌ Ошибка загрузки задач:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    
    try {
      // Optimistic UI + outbox: сначала применяем локально и сохраняем в очередь
      setTasks(prevTasks =>
        prevTasks.map(t => (t.name === task.name ? { ...t, status: newStatus } : t))
      );
      setPendingTaskStatus(task.name, newStatus);

      // Сохраняем/удаляем локальную отметку о выполнении (для логики "показывать выполненные сегодня")
      if (newStatus === 'Completed') {
        try { localStorage.setItem(`task_completed_at_${task.name}`, new Date().toISOString()); } catch {}
      } else {
        try { localStorage.removeItem(`task_completed_at_${task.name}`); } catch {}
      }

      const success = await internalApiClient.updateTaskStatus(task.name, newStatus);
      if (success) {
        clearPendingTaskStatus(task.name);

        // Отправляем событие изменения статуса задачи в Яндекс.Метрику
        if (employee?.name && employee.employee_name) {
          ymReachGoal('task_status_changed', { employee_id: `${employee.employee_name} (${employee.name})`, status: newStatus });
        }
      } else {
        // Оставляем в outbox для повторной отправки
        setError('Ошибка обновления статуса задачи (сохранено локально, синхронизируем при появлении сети)');
      }
    } catch (err) {
      // Оставляем в outbox для повторной отправки
      setError('Ошибка обновления статуса задачи (сохранено локально, синхронизируем при появлении сети)');
      logger.error('❌ Ошибка обновления статуса задачи:', err);
    }
  };

  const createTask = async (subject: string, description: string, assigneeId: string) => {
    if (!employee?.name) {
      setError('Ошибка: не удалось определить текущего сотрудника');
      return false;
    }

    try {
      const newTask = await internalApiClient.createTask(subject, description, assigneeId, employee.name);
      if (newTask) {
        // Добавляем новую задачу в список
        setTasks(prevTasks => [newTask, ...prevTasks]);

        // Отправляем событие "создание задачи" в Яндекс.Метрику
        if (employee?.name && employee.employee_name) {
          ymReachGoal('task_created', { employee_id: `${employee.employee_name} (${employee.name})` });
        }

        return true;
      } else {
        setError('Ошибка создания задачи');
        return false;
      }
    } catch (err) {
      setError('Ошибка создания задачи');
      logger.error('❌ Ошибка создания задачи:', err);
      return false;
    }
  };

  const updateTask = async (taskName: string, updates: Partial<Task>) => {
    try {
      const success = await internalApiClient.updateTask(taskName, updates);
      if (success) {
        // Обновляем задачу в локальном состоянии
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.name === taskName 
              ? { ...t, ...updates }
              : t
          )
        );

        // Отправляем событие обновления задачи (например, изменение исполнителя)
        if (employee?.name && employee.employee_name) {
          ymReachGoal('task_updated', { employee_id: `${employee.employee_name} (${employee.name})` });
        }

        return true;
      } else {
        setError('Ошибка обновления задачи');
        return false;
      }
    } catch (err) {
      setError('Ошибка обновления задачи');
      logger.error('❌ Ошибка обновления задачи:', err);
      return false;
    }
  };

  useEffect(() => {
    loadTasks();
  }, [employee?.name]);

  // Пытаемся досинхронизировать pending-статусы на старте и при восстановлении сети
  useEffect(() => {
    if (!employee?.name) return;

    const flush = async () => {
      const res = await flushPendingTaskStatuses((taskName, status) => internalApiClient.updateTaskStatus(taskName, status));
      // Если что-то реально синкнулось — перезагрузим список (на случай серверных изменений кроме статуса)
      if (res.ok > 0) {
        await loadTasks();
      }
    };

    void flush();

    const onOnline = () => { void flush(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.name]);

  return {
    tasks,
    loading,
    error,
    toggleTaskStatus,
    createTask,
    updateTask,
    reloadTasks: loadTasks
  };
}; 