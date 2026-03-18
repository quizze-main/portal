import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { internalApiClient, Employee, TaskDraft } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { EmployeeSelector } from '@/components/EmployeeSelector';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { EmployeeAvatar } from "@/components/ui/avatar";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  /** If true, author block is hidden because author is defined by context */
  authorIsContextual?: boolean;
}

export const AddTaskModal = ({ isOpen, onClose, onTaskCreated, authorIsContextual = false }: AddTaskModalProps) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { employee } = useEmployee();

  // Autofocus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        document.getElementById('task-title-input')?.focus();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Load draft from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      let draftData: string | null = null;
      try { draftData = localStorage.getItem('task_draft'); } catch { draftData = null; }
      if (draftData) {
        try {
          const parsedDraft: TaskDraft = JSON.parse(draftData);
          if (parsedDraft.subject) setSubject(parsedDraft.subject);
          if (parsedDraft.description) setDescription(parsedDraft.description);
          if (parsedDraft.assignee_id) loadEmployeeById(parsedDraft.assignee_id);
        } catch {
          // Corrupted draft – ignore
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && (subject || description || selectedEmployee)) {
      const draft: TaskDraft = {
        subject,
        description,
        assignee_id: selectedEmployee?.name || '',
        assignee_name: selectedEmployee?.employee_name || ''
      };
      try { localStorage.setItem('task_draft', JSON.stringify(draft)); } catch {}
    }
  }, [subject, description, selectedEmployee, isOpen]);

  // Блокируем скролл фона, когда открыт полноэкранный список сотрудников
  useEffect(() => {
    if (showEmployeeList) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showEmployeeList]);

  const loadEmployeeById = async (employeeId: string) => {
    try {
      const employee = await internalApiClient.getEmployeeById(employeeId);
      if (employee) {
        setSelectedEmployee(employee);
      }
    } catch (err) {
      console.error('Ошибка загрузки сотрудника:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!subject.trim() || !selectedEmployee || !employee) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const newTask = await internalApiClient.createTask(
        subject.trim(),
        description.trim(),
        selectedEmployee.name,
        employee.name
      );

      if (newTask) {
        try { localStorage.removeItem('task_draft'); } catch {}
        setSubject('');
        setDescription('');
        setSelectedEmployee(null);
        setShowEmployeeList(false);
        onClose();
        onTaskCreated();
      } else {
        setError('Ошибка создания задачи');
      }
    } catch (err) {
      setError('Ошибка создания задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    try { localStorage.removeItem('task_draft'); } catch {}
    setSubject('');
    setDescription('');
    setSelectedEmployee(null);
    setShowEmployeeList(false);
    setError(null);
    setIsDescriptionExpanded(false);
    onClose();
  };

  // Autosize title textarea (must be declared before any early returns to keep hook order stable)
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [subject, isOpen]);

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose}>
      <Card className="w-full max-w-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <Textarea
              id="task-title-input"
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
              <div className="flex items-center justify-between">
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
                placeholder="Описание задачи (необязательно)"
                className="w-full min-h-[80px] resize-none text-sm mt-2"
                rows={isDescriptionExpanded ? 12 : 3}
              />

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
                        placeholder="Описание задачи (необязательно)"
                        className="w-full h-full resize-none text-base p-4 border-0 focus:ring-0 focus:border-0"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Исполнитель задачи */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Исполнитель *</label>
              <div
                className="flex items-center gap-2 p-3 border dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setShowEmployeeList(!showEmployeeList)}
              >
                {selectedEmployee ? (
                  <>
                    <EmployeeAvatar
                      name={selectedEmployee.employee_name}
                      image={selectedEmployee.image}
                      size="sm"
                      fallbackColor="blue"
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#1a1a1a] dark:text-gray-200 leading-tight">{selectedEmployee.employee_name}</div>
                      <div className="text-xs text-[#6b6b6b] dark:text-gray-400 leading-tight">{selectedEmployee.designation}</div>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Выбери исполнителя *</span>
                )}
                <ChevronDown
                  size={16}
                  className={`ml-auto text-gray-400 transition-transform ${showEmployeeList ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
            {/* Удалён дубликат селектора исполнителя */}
          </div>

          {!showEmployeeList && (
          <div className="flex gap-2 mt-6">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateTask}
              className="flex-1"
              disabled={loading || !subject.trim() || !selectedEmployee}
            >
              {loading ? 'Создание...' : 'Создать'}
            </Button>
          </div>
          )}
        </CardContent>
      </Card>

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