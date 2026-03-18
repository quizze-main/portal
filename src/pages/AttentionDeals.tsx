import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Hourglass, Clock, AlertTriangle } from "lucide-react";
import { OrderFilterCards, FilterKey, FilterCardData } from "@/components/OrderFilterCards";
import { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { useUnclosedOrders } from "@/hooks/useUnclosedOrders";
import { internalApiClient, type Employee } from "@/lib/internalApiClient";
import { useEmployee } from "@/contexts/EmployeeProvider";

// Маппинг приоритетов категорий, если заказ относится к нескольким группам
const pickReason = (groups: FilterKey[]): FilterKey => {
  if (groups.includes("old_stock")) return "old_stock";
  if (groups.includes("overdue")) return "overdue";
  return "near_deadline";
};

export interface AttentionDealsContentProps {
  embedded?: boolean;
  onBack?: () => void;
}

export function AttentionDealsContent({ embedded, onBack }: AttentionDealsContentProps) {
  const navigate = useNavigate();
  const { employee, canUseLeaderDashboard } = useEmployee();
  const isClubManager = canUseLeaderDashboard;
  const { data, loading, error, reload } = useUnclosedOrders();

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [showManagerList, setShowManagerList] = useState(false);
  const [careManagers, setCareManagers] = useState<Employee[]>([]);

  // Load only care managers for current department (for filtering list)
  useEffect(() => {
    const loadManagers = async () => {
      if (!employee) return;
      try {
        const list = await internalApiClient.getEmployeesByDepartment(employee.department, 200);
        const care = list.filter((emp) => emp.designation?.toLowerCase().includes('менеджер заботы'));
        setCareManagers(care);
      } catch {
        setCareManagers([]);
      }
    };
    loadManagers();
  }, [employee]);

  // Преобразуем заказы в удобный формат
  const orders = useMemo(() => {
    if (!data?.data) return [] as Array<{
      id: string;
      reason: FilterKey;
      date: string;
      amount: number;
      manager: string;
      managerId: string;
      ts: number;
    }>;

    return data.data.map((o) => ({
      id: o.id.replace(/[^0-9]/g, ""), // оставляем только цифры
      reason: pickReason(o.group_types as FilterKey[]),
      date: new Date(o.created_at).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      }),
      amount: parseFloat(o.order_sum || "0"),
      manager: o.manager_name || "",
      managerId: o.manager_id || "",
      ts: new Date(o.created_at).getTime(),
    }));
  }, [data?.data]);

  // Менеджеры только из текущих заказов
  const orderManagers = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    orders.forEach(o => {
      const id = String(o.managerId || '');
      if (!id) return;
      const name = o.manager || id;
      if (!byId.has(id)) byId.set(id, { id, name });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [orders]);

  // Выбранное имя менеджера для отображения
  const selectedManagerName = useMemo(() => {
    if (!selectedManagerId) return null;
    const found = orderManagers.find(m => m.id === selectedManagerId);
    return found?.name || null;
  }, [selectedManagerId, orderManagers]);

  // Сбрасываем выбранного менеджера, если его нет в списке по заказам
  useEffect(() => {
    if (!selectedManagerId) return;
    const allowedIds = new Set(orderManagers.map(m => m.id));
    if (!allowedIds.has(selectedManagerId)) {
      setSelectedManagerId(null);
    }
  }, [orderManagers, selectedManagerId]);

  // Рассчитываем данные для карточек
  const filterCardsData: FilterCardData[] = useMemo(() => {
    let base = orders;
    if (selectedManagerId) {
      base = base.filter((o) => o.managerId === selectedManagerId);
    }

    const calc = (key: FilterKey) => {
      const list = base.filter((o) => o.reason === key);
      const amount = list.reduce((sum, o) => sum + o.amount, 0);
      return { count: list.length, amount };
    };
    return [
      { key: "old_stock", ...calc("old_stock") },
      { key: "near_deadline", ...calc("near_deadline") },
      { key: "overdue", ...calc("overdue") },
    ];
  }, [orders, selectedManagerId]);

  const filteredOrders = useMemo(() => {
    let dataArr = orders;

    if (activeFilters.length > 0) {
      dataArr = dataArr.filter((o) => activeFilters.includes(o.reason));
    }

    if (selectedManagerId) {
      dataArr = dataArr.filter((o) => o.managerId === selectedManagerId);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      dataArr = dataArr.filter((o) => o.id.toLowerCase().includes(q));
    }

    // Client-side sorting: severity (overdue > near_deadline > old_stock), then by date (newest first)
    const weight: Record<FilterKey, number> = { overdue: 0, near_deadline: 1, old_stock: 2 } as const;
    return [...dataArr].sort((a, b) => {
      const w = weight[a.reason] - weight[b.reason];
      if (w !== 0) return w;
      return b.ts - a.ts;
    });
  }, [search, activeFilters, selectedManagerId, orders]);

  return (
    <section className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      {!embedded && (
        <>
          {/* Кнопка назад */}
          <Button variant="ghost" size="sm" className="px-2" onClick={() => onBack ? onBack() : navigate(-1)}>
            ← Дашборд
          </Button>
          {/* Заголовок */}
          <PageHeader
            title="Требуют внимания"
            subtitle="Заказы, требующие срочного внимания"
          />
        </>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-6">{error}</div>
      ) : (
        <>
          {/* Интерактивные карточки-фильтры */}
          <OrderFilterCards
            data={filterCardsData}
            onChange={setActiveFilters}
            defaultActive={[]}
            className="justify-center"
          />

          {/* Фильтр по менеджеру (только для РК) */}
          {isClubManager && orderManagers.length > 0 && (
            <div
              className="p-3 border dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 w-full max-w-sm mx-auto"
              onClick={() => setShowManagerList(true)}
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Менеджер:
              </span>
              <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedManagerName || "Клуб"}
              </span>
            </div>
          )}

          {/* Поиск */}
          <div className="relative w-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-[7px] backdrop-saturate-150 border border-white/10 rounded-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Поиск по номеру заказа"
              value={search}
              onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))}
              className="pr-10 rounded-md py-2 bg-transparent"
            />
          </div>

          {/* Таблица заказов – карточки */}
          <div className="max-w-[95%] mx-auto w-full">
            {/* Заголовок */}
            <div className="grid grid-cols-[1fr_auto] gap-x-4 items-center text-xs font-medium text-gray-500 mb-2 px-1">
              <span>№ Заказа / Проблема</span>
              <span className="text-right">Сумма / Создан</span>
            </div>

            <div className="space-y-3">
              {filteredOrders.map((o, idx) => {
                const IconComponent = {
                  old_stock: Hourglass,
                  near_deadline: Clock,
                  overdue: AlertTriangle,
                }[o.reason];

                const dotBg = {
                  old_stock: "bg-rose-500",
                  near_deadline: "bg-yellow-300",
                  overdue: "bg-orange-400",
                }[o.reason];

                return (
                  <div
                    key={`${o.id}-${idx}`}
                    className="bg-white rounded-md py-3 px-4 transition-transform duration-200 ease-in-out hover:shadow-md hover:scale-[1.01]"
                  >
                    {/* Двухколоночная сетка: слева номер и причина, справа сумма и дата */}
                    <div className={`grid grid-cols-[1fr_auto] ${isClubManager ? 'grid-rows-3' : 'grid-rows-2'} gap-x-4 gap-y-1 items-center`}>
                      {/* № заказа с иконкой */}
                      <div className="flex items-center gap-2 row-start-1 col-start-1">
                        <IconComponent className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-base shrink-0">
                          {o.id}
                        </span>
                      </div>

                      {/* Сумма */}
                      <span className="text-right font-semibold text-[15px] whitespace-nowrap row-start-1 col-start-2">
                        {o.amount.toLocaleString("ru-RU")} ₽
                      </span>

                      {/* Причина */}
                      <div className="row-start-2 col-start-1 flex items-center gap-2">
                        <span className={`w-[10px] h-[10px] rounded-full shrink-0 ${dotBg}`}></span>
                        <span className="text-sm text-gray-800">
                          {
                            {
                              old_stock: "Срок хранения превышен",
                              near_deadline: "Скоро дедлайн (<2 дней)",
                              overdue: "Просрочен",
                            }[o.reason]
                          }
                        </span>
                      </div>

                      {/* Дата */}
                      <span className={`text-right text-xs text-gray-400 ${isClubManager ? 'row-start-3' : 'row-start-2'} col-start-2 justify-self-end`}>
                        {o.date}
                      </span>

                      {/* ФИО менеджера (только для РК) */}
                      {isClubManager && (
                        <span className="text-xs text-gray-500 row-start-3 col-start-1">
                          {o.manager}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-500">Ничего не найдено</div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Менеджер Selector Overlay */}
      {showManagerList && (
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[110] bg-white dark:bg-gray-800 flex flex-col animate-fade">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <span className="text-base font-semibold">Выбери менеджера</span>
              <button
                type="button"
                onClick={() => setShowManagerList(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ×
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedManagerId(null);
                  setShowManagerList(false);
                }}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b"
              >
                Клуб
              </button>
              {orderManagers.map((mgr) => (
                <button
                  key={mgr.id}
                  onClick={() => {
                    setSelectedManagerId(mgr.id);
                    setShowManagerList(false);
                  }}
                  className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b"
                >
                  {mgr.name}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )
      )}
    </section>
  );
}

/** Page wrapper — used by the route */
export default function AttentionDeals() {
  return <AttentionDealsContent />;
}