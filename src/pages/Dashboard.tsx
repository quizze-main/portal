import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle, RefreshCw, Plus, Eye, EyeOff, List } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useState } from "react";
import { useEmployee } from "@/contexts/EmployeeProvider";
import { useTasks } from "@/hooks/useTasks";
import { AddTaskModal } from "@/components/AddTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import type { Task } from "@/lib/internalApiClient";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LeaderDashboardHome } from "@/components/leader-dashboard/LeaderDashboardHome";
import { ManagerPersonalDashboard } from "@/components/dashboard/ManagerPersonalDashboard";
import { getDashboardPositionCategory } from "@/lib/roleUtils";

export const Dashboard = () => {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const { employee, canUseLeaderDashboard } = useEmployee();
  const { tasks, loading: tasksLoading, error: tasksError, toggleTaskStatus, reloadTasks } = useTasks();
  const navigate = useNavigate();

  const displayName = employee?.employee_name || 'Друг';
  const firstName = displayName ? displayName.split(' ')[0] : 'Друг';

  const positionCategory = getDashboardPositionCategory(employee?.designation);
  const isManagerRole = ['manager', 'senior_manager', 'manager_5_2', 'manager_2_2', 'universal_manager', 'optometrist'].includes(positionCategory);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };

  // === Фильтрация задач для блока «Задачи на сегодня» ===
  const today = new Date();
  const isSameDay = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const dashboardTasks = tasks.filter((task) => {
    if (task.status !== 'Completed') return true;

    let completedAtLocal: string | null = null;
    try { completedAtLocal = localStorage.getItem(`task_completed_at_${task.name}`); } catch { completedAtLocal = null; }
    if (!completedAtLocal) return false;

    const completedDate = new Date(completedAtLocal);
    return isSameDay(completedDate);
  });

  const filteredTasks = hideCompleted
    ? dashboardTasks.filter((task) => task.status !== 'Completed')
    : dashboardTasks;

  const isGlobalLoading = tasksLoading && tasks.length === 0;
  const globalError = tasksError;

  return (
    <div className="p-4 space-y-4 sm:space-y-6 max-w-full sm:max-w-md mx-auto">
      {/* Header */}
      <PageHeader title="Дашборд" subtitle={`Добро пожаловать, ${firstName}!`} />
      {isGlobalLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Spinner size="xl" />
        </div>
      ) : globalError ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-lg text-red-500 dark:text-red-400">Ошибка: {globalError}</div>
        </div>
      ) : (
        <>
          {/* Leader dashboard — full-width */}
          {canUseLeaderDashboard && (
            <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
              <LeaderDashboardHome />
            </div>
          )}

          {/* Manager Personal Dashboard */}
          {!canUseLeaderDashboard && isManagerRole && (
            <ManagerPersonalDashboard />
          )}

          {/* Tasks */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[20px] font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <CheckCircle size={20} className="text-orange-500" />
                Задачи на сегодня
                {tasksLoading && (
                  <RefreshCw size={16} className="text-gray-500 animate-spin" />
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate('/all-tasks')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Показать все задачи"
                  >
                    <List size={16} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title={hideCompleted ? "Показать выполненные" : "Скрыть выполненные"}
                  >
                    {hideCompleted ? <EyeOff size={16} className="text-gray-500 dark:text-gray-400" /> : <Eye size={16} className="text-gray-500 dark:text-gray-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={reloadTasks}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Обновить задачи"
                  >
                    <RefreshCw size={16} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksError && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{tasksError}</p>
                </div>
              )}

              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg animate-pulse">
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : filteredTasks.length > 0 ? (
                <>
                  <ul className="space-y-3 mb-4">
                    {filteredTasks.slice(0, 5).map((task) => (
                      <li key={task.name} className="flex items-center space-x-3 p-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleTaskStatus(task);
                          }}
                          className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <div
                          className="flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded transition-colors min-w-0"
                          onClick={() => handleTaskClick(task)}
                        >
                          <span
                            className={`text-sm text-gray-700 dark:text-gray-300 block ${
                              task.status === 'Completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''
                            }`}
                          >
                            {task.subject}
                          </span>
                          {task.description && (
                            <span
                              className={`text-xs text-gray-500 dark:text-gray-400 block mt-1 w-full overflow-hidden text-ellipsis whitespace-nowrap ${
                                task.status === 'Completed' ? 'line-through text-gray-400 dark:text-gray-500' : ''
                              }`}
                              title={task.description}
                            >
                              {task.description}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filteredTasks.length > 5 && (
                    <Button
                      onClick={() => navigate('/all-tasks')}
                      className="w-full mt-2 mb-4"
                      variant="outline"
                    >
                      Показать все задачи ({filteredTasks.length})
                    </Button>
                  )}
                  <button type="button"
                    onClick={() => setShowAddTaskModal(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Plus size={20} />
                    <span className="font-medium">Добавить задачу</span>
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Нет открытых задач</p>
                  <button type="button"
                    onClick={() => setShowAddTaskModal(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Plus size={20} />
                    <span className="font-medium">Создать первую задачу</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Task Modal */}
          <AddTaskModal
            isOpen={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
            onTaskCreated={reloadTasks}
          />

          {/* Task Detail Modal */}
          <TaskDetailModal
            isOpen={showTaskDetailModal}
            task={selectedTask}
            onClose={() => {
              setShowTaskDetailModal(false);
              setSelectedTask(null);
            }}
            onTaskUpdated={reloadTasks}
          />
        </>
      )}
    </div>
  );
};
