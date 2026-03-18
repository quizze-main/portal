import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Search, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Input } from "@/components/ui/input";
import { EmployeeAvatar } from "@/components/ui/avatar";
import { useEmployeeSelector } from "@/hooks/useEmployeeSelector";
import { Employee } from "@/lib/internalApiClient";

interface EmployeeSelectorProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when user taps outside or presses close */
  onClose: () => void;
  /** Called after employee is selected */
  onSelect: (employee: Employee) => void;
  /** Overlay title (defaults to generic Russian text) */
  title?: string;
  /** Fallback avatar colour */
  fallbackColor?: "blue" | "green" | "purple" | "amber" | "red" | "gray";
}

export const EmployeeSelector = ({
  isOpen,
  onClose,
  onSelect,
  title = "Выбери сотрудника",
  fallbackColor = "blue",
}: EmployeeSelectorProps) => {
  const {
    employees,
    loading,
    searchQuery,
    setSearchQuery,
    loadEmployees,
    searchEmployees,
  } = useEmployeeSelector();

  // Use same-origin proxy for reliable image loading in iOS Telegram WebView.
  const getEmployeeImageSrc = (emp: Employee) => {
    const id = emp?.name ? String(emp.name) : "";
    if (!id) return emp.image || "";
    // cache-bust when employee.image changes
    const v = emp.image ? encodeURIComponent(String(emp.image)) : "";
    return `/api/frappe/employees/${encodeURIComponent(id)}/image${v ? `?v=${v}` : ""}`;
  };

  const [keyboardGap, setKeyboardGap] = useState(0);

  // Listen for virtual keyboard showing/hiding to adjust bottom padding
  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || !window.visualViewport) return;

    const updateGap = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardGap(gap);
    };

    updateGap();
    window.visualViewport.addEventListener("resize", updateGap);
    return () => window.visualViewport.removeEventListener("resize", updateGap);
  }, [isOpen]);

  // Load initial list when overlay opens
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen, loadEmployees]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    searchEmployees(value);
  };

  // Apply additional client-side filtering to support flexible, case-insensitive search by any
  // part of the employee’s name. This makes the search tolerant to different word orders,
  // partial input (prefixes) and character case.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEmployees = normalizedQuery
    ? employees.filter((emp) => emp.employee_name.toLowerCase().includes(normalizedQuery))
    : employees;

  if (!isOpen) return null;

  const overlay = (
    <div className="fixed inset-0 z-[400] bg-white dark:bg-gray-800 flex flex-col animate-fade">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <span className="text-base font-semibold">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b dark:border-gray-700">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск сотрудников..."
            className="pl-10 pr-10 border dark:bg-gray-700 dark:text-gray-200"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: `${keyboardGap + 24}px` }}
      >
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Spinner size="md" />
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div>
            {filteredEmployees.map((emp) => (
              <button
                key={emp.name}
                onClick={() => onSelect(emp)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b last:border-b-0"
              >
                <EmployeeAvatar
                  name={emp.employee_name}
                  image={getEmployeeImageSrc(emp)}
                  size="sm"
                  fallbackColor={fallbackColor}
                />
                <div className="flex flex-col leading-tight">
                  <div className="text-sm font-semibold text-[#1a1a1a] dark:text-gray-200">
                    {emp.employee_name}
                  </div>
                  <div className="text-xs text-[#6b6b6b] dark:text-gray-400">
                    {emp.designation}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? "Сотрудники не найдены" : "Нет доступных сотрудников"}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}; 