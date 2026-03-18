import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, X as XIcon, Plus } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployee } from "@/contexts/EmployeeProvider";
import { internalApiClient, Task, Employee } from "@/lib/internalApiClient";
import { useNavigate, useLocation } from "react-router-dom";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { AddTaskModal } from "@/components/AddTaskModal";
import { logger } from '@/lib/logger';
import { PageHeader } from "@/components/PageHeader";
import { applyPendingTaskStatuses, clearPendingTaskStatus, flushPendingTaskStatuses, setPendingTaskStatus } from "@/lib/taskStatusOutbox";

type StatusFilter = 'all' | 'Open' | 'Completed';
type RoleFilter = 'author' | 'assignee';

interface StatusFilterButtonProps {
  label: string;
  value: StatusFilter;
  currentFilter: StatusFilter;
  setFilter: (value: StatusFilter) => void;
}

interface RoleFilterButtonProps {
  label: string;
  value: RoleFilter;
  currentFilter: RoleFilter;
  setFilter: (value: RoleFilter) => void;
}

export const AllTasks = () => {
  const { employee } = useEmployee();
  const navigate = useNavigate();
  const location = useLocation();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Фильтры
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('assignee');

  // Модальное окно
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [employeesCache, setEmployeesCache] = useState<Record<string, Employee>>({});

  // Функция для получения сотрудника по id с кэшированием
  const getEmployee = async (id: string) => {
    if (!id) return null;
    if (employeesCache[id]) return employeesCache[id];
    try {
      const employee = await internalApiClient.getEmployeeById(id);
      if (employee) {
        setEmployeesCache(prev => ({ ...prev, [id]: employee }));
        return employee;
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  // Для отображения имени автора/исполнителя
  const [extraNames, setExtraNames] = useState<Record<string, string>>({});

  const loadFilteredTasks = async () => {
    if (!employee) return;
    setLoading(true);
    try {
      let tasks: Task[] = [];
      if (statusFilter === 'Open' && roleFilter === 'assignee') {
        tasks = await internalApiClient.getAllTasksForEmployee(employee.name || employee.user_id, 'Open', 'assignee');
      } else if (statusFilter === 'Open' && roleFilter === 'author') {
        tasks = await internalApiClient.getAllTasksForEmployee(employee.name || employee.user_id, 'Open', 'author');
      } else if (statusFilter === 'Completed' && roleFilter === 'assignee') {
        tasks = await internalApiClient.getAllTasksForEmployee(employee.name || employee.user_id, 'Completed', 'assignee');
      } else if (statusFilter === 'Completed' && roleFilter === 'author') {
        tasks = await internalApiClient.getAllTasksForEmployee(employee.name || employee.user_id, 'Completed', 'author');
      }
      // Поиск по названию и описанию на клиенте
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        tasks = tasks.filter(task =>
          task.subject.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
        );
      }
      setFilteredTasks(applyPendingTaskStatuses(tasks));
    } catch (error) {
      logger.error("❌ Ошибка загрузки задач:", error);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем список задач при изменении фильтров
  useEffect(() => {
    loadFilteredTasks();
    // eslint-disable-next-line
  }, [employee, statusFilter, roleFilter, searchQuery]);

  // После загрузки задач подтягиваем имена сотрудников (автора/исполнителя)
  useEffect(() => {
    const loadNamesForTasks = async () => {
      const ids = filteredTasks
        .map(task => (roleFilter === 'author' ? task.custom_assignee_employee : task.custom_author_employee))
        .filter(Boolean) as string[];
      const uniqueIds = Array.from(new Set(ids));
      const names: Record<string, string> = {};
      await Promise.all(uniqueIds.map(async (id) => {
        const emp = await getEmployee(id);
        if (emp) names[id] = emp.employee_name;
      }));
      setExtraNames(names);
    };

    if (filteredTasks.length > 0) {
      void loadNamesForTasks();
    } else {
      setExtraNames({});
    }
    // eslint-disable-next-line
  }, [filteredTasks, roleFilter]);

  // Досинхронизация pending статусов, даже если Dashboard не открыт
  useEffect(() => {
    if (!employee?.name) return;
    const flush = async () => {
      const res = await flushPendingTaskStatuses((taskName, status) => internalApiClient.updateTaskStatus(taskName, status));
      if (res.ok > 0) {
        await loadFilteredTasks();
      }
    };

    void flush();
    const onOnline = () => { void flush(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.name, statusFilter, roleFilter, searchQuery]);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    try {
      // Optimistic UI + outbox
      setFilteredTasks(prev => prev.map(t => (t.name === task.name ? { ...t, status: newStatus } : t)));
      setPendingTaskStatus(task.name, newStatus);

      // Обновляем/удаляем локальную отметку о выполнении
      if (newStatus === 'Completed') {
        try { localStorage.setItem(`task_completed_at_${task.name}`, new Date().toISOString()); } catch {}
      } else {
        try { localStorage.removeItem(`task_completed_at_${task.name}`); } catch {}
      }

      const success = await internalApiClient.updateTaskStatus(task.name, newStatus);
      if (success) {
        clearPendingTaskStatus(task.name);
      }
    } finally {
      // Не форсим перезагрузку: UI уже обновлён, а pending синкнется из Dashboard/useTasks при online
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  const handleTaskUpdated = () => {
    setShowTaskDetailModal(false);
    loadFilteredTasks();
  };

  // Открытие конкретной задачи из query-параметра openTask
  useEffect(() => {
    const openByParam = async () => {
      const params = new URLSearchParams(location.search);
      const openTaskName = params.get('openTask');
      if (!openTaskName) return;

      let taskToOpen: Task | null = filteredTasks.find(t => t.name === openTaskName) || null;
      if (!taskToOpen) {
        taskToOpen = await internalApiClient.getTaskByName(openTaskName);
      }
      if (taskToOpen) {
        setSelectedTask(taskToOpen);
        setShowTaskDetailModal(true);
        const newParams = new URLSearchParams(location.search);
        newParams.delete('openTask');
        navigate({ pathname: location.pathname, search: newParams.toString() }, { replace: true });
      }
    };
    void openByParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, filteredTasks.length]);
  
  const StatusFilterButton = ({ label, value, currentFilter, setFilter }: StatusFilterButtonProps) => (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        currentFilter === value ? 'bg-blue-600 text-white' : 'bg-white shadow-sm text-gray-700'
      }`}
      onClick={() => setFilter(value)}
      aria-pressed={currentFilter === value}
    >
      {label}
    </button>
  );

  const RoleFilterButton = ({ label, value, currentFilter, setFilter }: RoleFilterButtonProps) => (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        currentFilter === value ? 'bg-blue-600 text-white' : 'bg-white shadow-sm text-gray-700'
      }`}
      onClick={() => setFilter(value)}
      aria-pressed={currentFilter === value}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex flex-col items-center w-full px-4 md:px-6 py-4 md:py-6 space-y-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="px-2 self-start"
          onClick={() => {
            const idx = (window.history.state?.idx ?? 0);
            if (idx > 0 || window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/', { replace: true });
            }
          }}
        >
          ← Дашборд
        </Button>

        {/* Page title */}
        <PageHeader title="Все задачи" />

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 px-4 pb-4 w-full max-w-md">
          {/* Search */}
          <div className="relative bg-white/60 dark:bg-gray-900/40 backdrop-blur-[7px] backdrop-saturate-150 border border-white/10 rounded-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              ref={searchInputRef}
              placeholder="Поиск по задачам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-transparent pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setSearchQuery('');
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
                tabIndex={-1}
                aria-label="Очистить поиск"
              >
                <XIcon size={18} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2">
            {/* Статус задачи */}
            <div className="flex gap-2">
              <StatusFilterButton label="Открытые" value="Open" currentFilter={statusFilter} setFilter={setStatusFilter} />
              <StatusFilterButton label="Завершенные" value="Completed" currentFilter={statusFilter} setFilter={setStatusFilter} />
            </div>
            {/* Роль пользователя */}
            <div className="flex gap-2">
              <RoleFilterButton label="Мне назначены" value="assignee" currentFilter={roleFilter} setFilter={setRoleFilter} />
              <RoleFilterButton label="Я автор" value="author" currentFilter={roleFilter} setFilter={setRoleFilter} />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="px-4 pb-6 w-full max-w-md">
          <div className="space-y-3 min-h-[120px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-8 text-center">
                  <CheckCircle size={32} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Задачи не найдены</p>
                  <p className="text-xs text-gray-400 mt-1">Попробуй изменить фильтры</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {filteredTasks.map((task) => (
                  <li key={task.name} className="bg-white rounded-lg shadow-md px-4 py-3 flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className="flex-shrink-0 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={task.status === 'Completed'}
                        aria-label={task.status === 'Completed' ? 'Задача выполнена' : 'Отметить задачу как выполненную'}
                        onCheckedChange={() => {
                          if (task.status !== 'Completed') {
                            toggleTaskStatus(task);
                          }
                        }}
                        disabled={task.status === 'Completed'}
                        className="h-5 w-5 rounded border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                      />
                    </div>
                    {/* Task info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div
                        className={`text-base font-medium ${
                          task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {task.subject}
                      </div>
                      {roleFilter === 'author' && task.custom_assignee_employee && (
                        <div className="text-sm text-gray-500 mt-1">
                          Исполнитель: {extraNames[task.custom_assignee_employee] || '...'}
                        </div>
                      )}
                      {roleFilter === 'assignee' && task.custom_author_employee && (
                        <div className="text-sm text-gray-500 mt-1">
                          Автор: {extraNames[task.custom_author_employee] || '...'}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showTaskDetailModal}
        task={selectedTask}
        onClose={() => setShowTaskDetailModal(false)}
        onTaskUpdated={handleTaskUpdated}
      />
      {/* Floating Add Task Button */}
      <button
        onClick={() => setShowAddTaskModal(true)}
        className="fixed bottom-24 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-3xl transition-colors"
        aria-label="Добавить задачу"
      >
        <Plus size={32} />
      </button>
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onTaskCreated={loadFilteredTasks}
      />
    </>
  );
};
