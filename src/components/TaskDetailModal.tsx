import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { internalApiClient, Employee, Task } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { EmployeeSelector } from '@/components/EmployeeSelector';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { EmployeeAvatar } from "@/components/ui/avatar";

interface TaskDetailModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetailModal = ({ isOpen, task, onClose, onTaskUpdated }: TaskDetailModalProps) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [authorEmployee, setAuthorEmployee] = useState<Employee | null>(null);
  const [originalValues, setOriginalValues] = useState({ subject: '', description: '', assigneeId: '', authorId: '' });
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showAuthorList, setShowAuthorList] = useState(false);
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const { employee } = useEmployee();

  useEffect(() => {
    if (isOpen && task) {
      setSubject(task.subject);
      setDescription(task.description || '');
      setError(null);
      
      // Сохраняем оригинальные значения для сравнения
      setOriginalValues({
        subject: task.subject,
        description: task.description || '',
        assigneeId: task.custom_assignee_employee || '',
        authorId: task.custom_author_employee || '',
      });
      
      // Загружаем данные автора и исполнителя
      if (task.custom_author_employee) {
        loadEmployeeById(task.custom_author_employee, setAuthorEmployee);
      }
      if (task.custom_assignee_employee) {
        loadEmployeeById(task.custom_assignee_employee, setSelectedEmployee);
      }
    }
  }, [isOpen, task]);

  // Проверяем, изменились ли поля
  const hasChanges = () => {
    return (
      subject !== originalValues.subject ||
      description !== originalValues.description ||
      selectedEmployee?.name !== originalValues.assigneeId ||
      authorEmployee?.name !== originalValues.authorId
    );
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const currentEmployeeDepartment = employee?.department;
      const employeesData = await internalApiClient.getEmployeesByDepartment(currentEmployeeDepartment);
      setEmployees(employeesData);
    } catch (err) {
      setError('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeById = async (employeeId: string, setter: (emp: Employee | null) => void) => {
    try {
      const employee = await internalApiClient.getEmployeeById(employeeId);
      if (employee) {
        setter(employee);
      }
    } catch (err) {
      console.error('Ошибка загрузки сотрудника:', err);
    }
  };

  const searchEmployees = async (query: string) => {
    if (!query.trim()) {
      loadEmployees();
      return;
    }

    try {
      setSearching(true);
      const currentEmployeeDepartment = employee?.department;
      const searchResults = await internalApiClient.searchEmployees(query, currentEmployeeDepartment);
      
      if (query) {
        setEmployees(searchResults);
      } else {
        setEmployees(employees);
      }
    } catch (err) {
      setError('Ошибка поиска сотрудников');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!task || !subject.trim() || !selectedEmployee || !authorEmployee) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updates: Partial<Task> = {
        subject: subject.trim(),
        custom_assignee_employee: selectedEmployee.name,
        custom_author_employee: authorEmployee.name,
      };
      
      if (description.trim()) {
        updates.description = description.trim();
      } else {
        updates.description = '';
      }
      
      const success = await internalApiClient.updateTask(task.name, updates);

      if (success) {
        onTaskUpdated();
        handleClose();
      } else {
        setError('Ошибка обновления задачи');
      }
    } catch (err) {
      setError('Ошибка обновления задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setDescription('');
    setSelectedEmployee(null);
    setError(null);
    setOriginalValues({ subject: '', description: '', assigneeId: '', authorId: '' });
    setIsDescriptionExpanded(false);
    setAuthorEmployee(null);
    setShowAuthorList(false);
    setAuthorSearchQuery('');
    onClose();
  };

  const handleReturnToWork = async () => {
    if (!task) return;
    try {
      setLoading(true);
      const success = await internalApiClient.updateTaskStatus(task.name, 'Open');
      if (success) {
        toast({ title: 'Задача возвращена в работу' });
        onTaskUpdated();
        handleClose();
      }
    } catch (err) {
      console.error('Ошибка возврата задачи в работу:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      setLoading(true);
      const success = await internalApiClient.updateTaskStatus(task.name, 'Completed');
      if (success) {
        toast({ title: 'Задача закрыта' });
        onTaskUpdated();
        handleClose();
      }
    } catch (err) {
      console.error('Ошибка закрытия задачи:', err);
    } finally {
      setLoading(false);
    }
  };

  // Autosize title textarea
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [subject, isOpen]);

  if (!isOpen || !task) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose}>
      <Card className="w-full max-w-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <Textarea
              ref={titleRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Название задачи"
              rows={1}
              className="min-h-0 h-auto overflow-hidden resize-none text-lg leading-snug font-semibold border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none dark:text-gray-100"
            />
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-300">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Описание задачи */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Описание</label>
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  title={isDescriptionExpanded ? "Свернуть" : "Развернуть"}
                >
                  {isDescriptionExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание задачи"
                className="w-full min-h-[80px] resize-none text-sm"
                rows={3}
              />
            </div>

            {/* Полноэкранный режим для описания */}
            {isDescriptionExpanded && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                <div className="w-full max-w-4xl h-full max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">Редактирование описания</h3>
                    <button
                      onClick={() => setIsDescriptionExpanded(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Свернуть"
                    >
                      <Minimize2 size={20} />
                    </button>
                  </div>
                  <div className="flex-1 p-4">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Описание задачи"
                      className="w-full h-full resize-none text-base p-4 border-0 focus:ring-0 focus:border-0"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Автор задачи */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Автор *</label>
              <div className="relative">
                <div 
                  className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowAuthorList(true)}
                >
                  {authorEmployee ? (
                    <> 
                      <EmployeeAvatar
                        name={authorEmployee.employee_name}
                        image={authorEmployee.image}
                        size="sm"
                        fallbackColor="green"
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-[#1a1a1a] dark:text-gray-200">{authorEmployee.employee_name}</span>
                        <span className="text-xs text-[#6b6b6b] dark:text-gray-400">{authorEmployee.designation}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-500">Выбери автора</span>
                  )}
                  <ChevronDown 
                    size={16} 
                    className={`ml-auto text-gray-400 transition-transform ${showAuthorList ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Исполнитель задачи */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Исполнитель *</label>
              <div className="relative">
                <div 
                  className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowEmployeeList(true)}
                >
                  {selectedEmployee ? (
                    <> 
                      <EmployeeAvatar
                        name={selectedEmployee.employee_name}
                        image={selectedEmployee.image}
                        size="sm"
                        fallbackColor="blue"
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-[#1a1a1a] dark:text-gray-200">{selectedEmployee.employee_name}</span>
                        <span className="text-xs text-[#6b6b6b] dark:text-gray-400">{selectedEmployee.designation}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-500">Выбери исполнителя</span>
                  )}
                  <ChevronDown 
                    size={16} 
                    className={`ml-auto text-gray-400 transition-transform ${showEmployeeList ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки сохранения (показываем только при изменениях) */}
          {hasChanges() && !showEmployeeList && !showAuthorList && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={loading || !subject.trim() || !selectedEmployee || !authorEmployee}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          )}

          {/* Кнопка "Вернуть в работу" для выполненной задачи */}
          {!showEmployeeList && !showAuthorList && task.status === 'Completed' && (
            <Button
              onClick={handleReturnToWork}
              variant="secondary"
              className="w-full mt-2"
              disabled={loading}
            >
              ↩ Вернуть в работу
            </Button>
          )}

          {/* Кнопка "Закрыть задачу" для открытой/незакрытой задачи */}
          {!showEmployeeList && !showAuthorList && task.status !== 'Completed' && (
            <Button
              onClick={handleCompleteTask}
              className="w-full mt-2"
              disabled={loading}
            >
              ✅ Закрыть задачу
            </Button>
          )}
        </CardContent>
      </Card>

      <EmployeeSelector
        isOpen={showAuthorList}
        title="Выбери автора"
        onClose={() => setShowAuthorList(false)}
        onSelect={(emp) => {
          setAuthorEmployee(emp);
          setShowAuthorList(false);
        }}
        fallbackColor="green"
      />

      <EmployeeSelector
        isOpen={showEmployeeList}
        title="Выбери исполнителя"
        onClose={() => setShowEmployeeList(false)}
        onSelect={(emp) => {
          setSelectedEmployee(emp);
          setShowEmployeeList(false);
        }}
        fallbackColor="blue"
      />
    </ModalWrapper>
  );
}; 