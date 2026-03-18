import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, CalendarDays, ChevronRight, AlertTriangle, Star, ThumbsUp, Hand, ThumbsDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Employee, internalApiClient } from "@/lib/internalApiClient";
import { useEmployee } from "@/contexts/EmployeeProvider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/Spinner";

type TrendPoint = { label: string; values: number[] };

export interface ReviewsContentProps {
  embedded?: boolean;
  onBack?: () => void;
}

export function ReviewsContent({ embedded, onBack }: ReviewsContentProps) {
  const navigate = useNavigate();
  const { employee, canUseLeaderDashboard } = useEmployee();

  // Centered page header
  const title = "Отзывы клиентов";
  const subtitle = "Подробная статистика по отзывам";

  // Filters (date + employee like on dashboard)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [selectedManager, setSelectedManager] = useState<Employee | null>(null);

  const isClubManager = canUseLeaderDashboard;

  // Загрузка реальных сотрудников (менеджеров заботы) для фильтра
  useEffect(() => {
    const loadManagers = async () => {
      if (!employee) return;
      try {
        const list = await internalApiClient.getEmployeesByDepartment(employee.department, 1000);
        const careManagers = list.filter((emp) => emp.designation?.toLowerCase().includes('менеджер заботы'));
        setManagers(careManagers);
      } catch (err) {
        console.error('Ошибка загрузки списка менеджеров заботы', err);
        setManagers([]);
      }
    };
    loadManagers();
  }, [employee]);

  // Week helpers: treat selected date as week [Mon..Sun]
  const startOfWeek = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (date.getDay() + 6) % 7; // 0..6, where 0 is Monday
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfWeek = (d: Date) => {
    const start = startOfWeek(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);

  // date helper used across computations
  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  // ==== Mock API-shaped data for reviews (replace with real API later) ====
  type ApiWeekly = {
    first_date_of_week: string; // YYYY-MM-DD (Monday)
    order_count: number;
    good_count: number;
    normal_count: number;
    bad_count: number;
    feedback_count: number;
  };
  type ApiEmployeeReviews = {
    employee_id: string | number;
    employee_name: string;
    results: ApiWeekly[];
  };
  const mockReviewsResponse: { data: ApiEmployeeReviews[] } = {
    data: [
      {
        employee_id: 'emp-1',
        employee_name: 'Елена Козлова',
        results: [
          { first_date_of_week: '2025-08-25', order_count: 300, good_count: 270, normal_count: 15, bad_count: 15, feedback_count: 300 },
          { first_date_of_week: '2025-09-01', order_count: 295, good_count: 260, normal_count: 20, bad_count: 15, feedback_count: 295 },
          { first_date_of_week: '2025-09-08', order_count: 288, good_count: 255, normal_count: 18, bad_count: 15, feedback_count: 288 },
          { first_date_of_week: '2025-09-15', order_count: 279, good_count: 248, normal_count: 17, bad_count: 14, feedback_count: 279 },
          { first_date_of_week: '2025-09-22', order_count: 303, good_count: 275, normal_count: 18, bad_count: 10, feedback_count: 303 },
        ],
      },
      {
        employee_id: 'emp-2',
        employee_name: 'Анна Петрова',
        results: [
          { first_date_of_week: '2025-08-25', order_count: 250, good_count: 210, normal_count: 25, bad_count: 15, feedback_count: 250 },
          { first_date_of_week: '2025-09-01', order_count: 242, good_count: 205, normal_count: 22, bad_count: 15, feedback_count: 242 },
          { first_date_of_week: '2025-09-08', order_count: 238, good_count: 198, normal_count: 28, bad_count: 12, feedback_count: 238 },
          { first_date_of_week: '2025-09-15', order_count: 231, good_count: 195, normal_count: 25, bad_count: 11, feedback_count: 231 },
          { first_date_of_week: '2025-09-22', order_count: 235, good_count: 200, normal_count: 24, bad_count: 11, feedback_count: 235 },
        ],
      },
      {
        employee_id: 'emp-3',
        employee_name: 'Михаил Сидоров',
        results: [
          { first_date_of_week: '2025-08-25', order_count: 220, good_count: 170, normal_count: 30, bad_count: 20, feedback_count: 220 },
          { first_date_of_week: '2025-09-01', order_count: 215, good_count: 168, normal_count: 28, bad_count: 19, feedback_count: 215 },
          { first_date_of_week: '2025-09-08', order_count: 210, good_count: 164, normal_count: 30, bad_count: 16, feedback_count: 210 },
          { first_date_of_week: '2025-09-15', order_count: 205, good_count: 160, normal_count: 31, bad_count: 14, feedback_count: 205 },
          { first_date_of_week: '2025-09-22', order_count: 208, good_count: 162, normal_count: 32, bad_count: 14, feedback_count: 208 },
        ],
      },
    ],
  };

  // Состояние реальных данных отзывов (агрегировано по неделям на клиента)
  const [reviewsData, setReviewsData] = useState<ApiEmployeeReviews[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Форматирование даты в YYYY-MM-DD (локальная таймзона)
  const formatDateForApi = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Трансформация произвольного списка отзывов в структуру как у mockReviewsResponse
  type RawFeedback = { id: string; employee_id?: string; employee_name?: string; created_at: string; rating?: number; sentiment?: 'good' | 'neutral' | 'bad'; comment?: string };
  const buildWeeklyKey = (isoDate: string) => {
    const d = new Date(isoDate);
    const start = startOfWeek(d);
    return formatDateForApi(start);
  };
  const toBuckets = (items: RawFeedback[]): ApiEmployeeReviews[] => {
    const byEmp: Record<string, { name: string; weeks: Record<string, ApiWeekly> }> = {};
    const classify = (f: RawFeedback): 'good' | 'normal' | 'bad' => {
      if (f.sentiment) return f.sentiment === 'neutral' ? 'normal' : f.sentiment;
      const r = Number(f.rating || 0);
      if (r >= 4) return 'good';
      if (r === 3) return 'normal';
      return 'bad';
    };
    items.forEach((f) => {
      const empId = String(f.employee_id || 'unknown');
      const empName = f.employee_name || empId;
      if (!byEmp[empId]) byEmp[empId] = { name: empName, weeks: {} };
      const wk = buildWeeklyKey(f.created_at);
      if (!byEmp[empId].weeks[wk]) byEmp[empId].weeks[wk] = { first_date_of_week: wk, order_count: 0, good_count: 0, normal_count: 0, bad_count: 0, feedback_count: 0 };
      const cls = classify(f);
      const bucket = byEmp[empId].weeks[wk];
      bucket.feedback_count += 1;
      if (cls === 'good') bucket.good_count += 1;
      else if (cls === 'normal') bucket.normal_count += 1;
      else bucket.bad_count += 1;
    });
    return Object.entries(byEmp).map(([id, { name, weeks }]) => ({
      employee_id: id,
      employee_name: name,
      results: Object.values(weeks).sort((a, b) => a.first_date_of_week.localeCompare(b.first_date_of_week)),
    }));
  };

  // Выбор employeeIds: клуб => все ID, иначе один ID
  const selectedEmployeeIds: string[] = useMemo(() => {
    const getId = (e?: Employee | null): string | undefined => e?.custom_itigris_user_id || e?.user_id;
    if (isClubManager && !selectedManager) {
      const ids = managers.map(m => getId(m)).filter(Boolean) as string[];
      if (ids.length > 0) return ids;
    }
    const single = getId(selectedManager || employee);
    return single ? [single] : [];
  }, [isClubManager, selectedManager, managers, employee]);

  // Дата диапазон: если выбрана неделя текущая — берём 4 недели (тек + 3 прошлых), иначе только выбранную неделю
  const todayWeekStart = startOfWeek(new Date());
  const isCurrentWeek = weekStart.getTime() === todayWeekStart.getTime();
  const fourWeeksStart = addDays(weekStart, -21);
  const rangeFrom = isCurrentWeek ? fourWeeksStart : weekStart;
  const rangeTo = weekEnd;

  // Загрузка отзывов
  useEffect(() => {
    const load = async () => {
      if (selectedEmployeeIds.length === 0) {
        setReviewsData(null);
        return;
      }
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const resp = await internalApiClient.getFeedbacks({
          employeeIds: selectedEmployeeIds,
          fromDate: formatDateForApi(rangeFrom),
          toDate: formatDateForApi(rangeTo),
        });
        const rawData = (resp as any)?.data;
        // Поддержка двух форматов ответа API:
        // 1) Агрегированный: [{ employee_id, employee_name, results: [{ first_date_of_week, good_count, normal_count|neutral_count, bad_count, feedback_count, order_count }] }]
        // 2) Не агрегированный: массив отдельных отзывов (RawFeedback)
        const mapWeekRow = (row: any): ApiWeekly => {
          const wk = String(row?.first_date_of_week || row?.week_start || row?.week || '');
          const good = Number(row?.good_count ?? row?.good ?? row?.positive_count ?? 0);
          const normal = Number(row?.normal_count ?? row?.neutral_count ?? row?.neutral ?? 0);
          const bad = Number(row?.bad_count ?? row?.negative_count ?? row?.bad ?? 0);
          const feedback = Number(row?.feedback_count ?? row?.feedbacks_count ?? good + normal + bad);
          const orders = Number(row?.order_count ?? row?.orders_count ?? 0);
          return { first_date_of_week: wk, order_count: orders, good_count: good, normal_count: normal, bad_count: bad, feedback_count: feedback };
        };
        let aggregated: ApiEmployeeReviews[] = [];
        if (Array.isArray(rawData) && rawData.length > 0 && Array.isArray(rawData[0]?.results)) {
          aggregated = (rawData as any[]).map((emp: any) => ({
            employee_id: String(emp?.employee_id ?? emp?.id ?? emp?.user_id ?? emp?.employee ?? ''),
            employee_name: String(emp?.employee_name ?? emp?.name ?? emp?.full_name ?? emp?.employee ?? ''),
            results: Array.isArray(emp?.results) ? emp.results.map(mapWeekRow) : []
          }));
        } else {
          const items: RawFeedback[] = Array.isArray(rawData) ? rawData as RawFeedback[] : [];
          aggregated = toBuckets(items);
        }
        // Нормализация: гарантируем, что для всех выбранных сотрудников и всех недель есть строки (0, если нет отзывов)
        const idOf = (e?: Employee | null) => e?.custom_itigris_user_id || e?.user_id;
        const idToName: Record<string, string> = {};
        managers.forEach(m => {
          const id = idOf(m);
          if (id) idToName[id] = m.employee_name;
        });
        const requiredWeeks = [0, 1, 2, 3].map(n => formatDateForApi(addDays(weekStart, -7 * n)));
        const byId: Record<string, ApiEmployeeReviews> = {};
        aggregated.forEach(e => { byId[String(e.employee_id)] = e; });
        selectedEmployeeIds.forEach(empId => {
          const key = String(empId);
          if (!byId[key]) {
            byId[key] = { employee_id: key, employee_name: idToName[key] || key, results: [] } as ApiEmployeeReviews;
          }
          const weeksSet = new Set(byId[key].results.map(r => r.first_date_of_week));
          requiredWeeks.forEach(wk => {
            if (!weeksSet.has(wk)) {
              byId[key].results.push({ first_date_of_week: wk, order_count: 0, good_count: 0, normal_count: 0, bad_count: 0, feedback_count: 0 });
            }
          });
          byId[key].results.sort((a, b) => a.first_date_of_week.localeCompare(b.first_date_of_week));
        });
        const normalized = Object.values(byId);
        setReviewsData(normalized);
      } catch (e: any) {
        setReviewsError(e?.message || 'Ошибка загрузки отзывов');
        setReviewsData(null);
      } finally {
        setReviewsLoading(false);
      }
    };
    load();
  }, [selectedEmployeeIds, rangeFrom.getTime(), rangeTo.getTime()]);

  const selectedName = isClubManager ? (selectedManager?.employee_name || undefined) : employee?.employee_name;
  const selectedEmployeeId = useMemo(() => {
    const getId = (e?: Employee | null): string | undefined => e?.custom_itigris_user_id || e?.user_id;
    return isClubManager ? getId(selectedManager) : getId(employee);
  }, [isClubManager, selectedManager, employee]);

  const formatWeek = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n * 100) / d) : 0);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const csiScore = (good: number, norm: number, bad: number) => {
    const total = good + norm + bad;
    if (total <= 0) return 0;
    const val = (good * 1 + norm * 0.5 - bad) / total;
    const pctVal = Math.round(val * 100);
    return Math.max(0, Math.min(100, pctVal));
  };
  const formatDelta = (v: number) => (v > 0 ? `+${v}%` : `${v}%`);

  const dataSource: ApiEmployeeReviews[] = reviewsData && reviewsData.length > 0 ? reviewsData : mockReviewsResponse.data;
  const getByIdOrName = (id?: string, name?: string) => dataSource.find(e => (id && String(e.employee_id) === String(id)) || (name && e.employee_name === name));
  const getWeekData = (rows: ApiWeekly[], weekKey: string) => rows.find(r => r.first_date_of_week === weekKey);

  const weekKey = formatWeek(weekStart);
  const prevWeekKey = formatWeek(addDays(weekStart, -7));

  // Team aggregate for a week
  const teamForWeek = (wk: string) => {
    const rows = dataSource.map(e => getWeekData(e.results, wk)).filter(Boolean) as ApiWeekly[];
    return rows.length
      ? {
          orders: sum(rows.map(r => r.order_count)),
          feedback: sum(rows.map(r => r.feedback_count)),
          good: sum(rows.map(r => r.good_count)),
          normal: sum(rows.map(r => r.normal_count)),
          bad: sum(rows.map(r => r.bad_count)),
        }
      : { orders: 0, feedback: 0, good: 0, normal: 0, bad: 0 };
  };

  // Summary for block 1
  const currentSummary = (() => {
    if (selectedName || selectedEmployeeId) {
      const emp = getByIdOrName(selectedEmployeeId, selectedName);
      const row = emp && getWeekData(emp.results, weekKey);
      const prev = emp && getWeekData(emp.results, prevWeekKey);
      const feedback = row?.feedback_count || 0;
      const good = row?.good_count || 0;
      const normal = row?.normal_count || 0;
      const bad = row?.bad_count || 0;
      const goodPct = pct(good, feedback);
      const normPct = pct(normal, feedback);
      const badPct = pct(bad, feedback);
      const prevGoodPct = pct(prev?.good_count || 0, prev?.feedback_count || 0);
      const prevNormPct = pct(prev?.normal_count || 0, prev?.feedback_count || 0);
      const prevBadPct = pct(prev?.bad_count || 0, prev?.feedback_count || 0);
      return {
        good: goodPct,
        neutral: normPct,
        bad: badPct,
        goodDelta: goodPct - prevGoodPct,
        neutralDelta: normPct - prevNormPct,
        badDelta: badPct - prevBadPct,
        total: feedback,
      };
    }
    const t = teamForWeek(weekKey);
    const tp = teamForWeek(prevWeekKey);
    const goodPct = pct(t.good, t.feedback);
    const normPct = pct(t.normal, t.feedback);
    const badPct = pct(t.bad, t.feedback);
    return {
      good: goodPct,
      neutral: normPct,
      bad: badPct,
      goodDelta: goodPct - pct(tp.good, tp.feedback),
      neutralDelta: normPct - pct(tp.normal, tp.feedback),
      badDelta: badPct - pct(tp.bad, tp.feedback),
      total: t.feedback,
    };
  })();

  // Chart data for block 2
  const lastWeeks = [4, 3, 2, 1, 0].map(n => formatWeek(addDays(weekStart, -7 * n)));
  const weekLabels: string[] = ['4 нед', '3 нед', '2 нед', '1 нед', 'Тек'];
  const computeCsi = (w: ApiWeekly) => csiScore(w.good_count, w.normal_count, w.bad_count);

  // Leader's multi-select of managers for chart (only for club manager view)
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);
  const [chartPickerOpen, setChartPickerOpen] = useState<boolean>(false);
  const [draftChartIds, setDraftChartIds] = useState<string[]>([]);
  useEffect(() => {
    if (isClubManager && !selectedManager) {
      setSelectedChartIds((prev) => {
        if (prev && prev.length > 0) {
          // keep only those still available, maintain order
          return prev.filter((id) => selectedEmployeeIds.includes(id));
        }
        return selectedEmployeeIds;
      });
      setDraftChartIds((prev) => {
        if (prev && prev.length > 0) {
          return prev.filter((id) => selectedEmployeeIds.includes(id));
        }
        return selectedEmployeeIds;
      });
    } else {
      setSelectedChartIds([]);
      setDraftChartIds([]);
    }
  }, [isClubManager, selectedManager, selectedEmployeeIds]);

  const trend = useMemo<TrendPoint[]>(() => {
    if (!selectedName) {
      // leader view: CSI per selected managers
      return lastWeeks.map((wk, i) => ({
        label: weekLabels[i],
        values: (selectedChartIds && selectedChartIds.length > 0 ? selectedChartIds : selectedEmployeeIds).map((id) => {
          const emp = dataSource.find((e) => String(e.employee_id) === String(id));
          if (!emp) return 0;
          const row = emp.results.find((r) => r.first_date_of_week === wk);
          return row ? computeCsi(row) : 0;
        }),
      }));
    }
    // selected manager: good/norm/bad trend
    const emp = getByIdOrName(selectedEmployeeId, selectedName);
    return lastWeeks.map((wk, i) => {
      const r = emp && getWeekData(emp.results, wk);
      const fb = r?.feedback_count || 0;
      return { label: weekLabels[i], values: [
        pct(r?.good_count || 0, fb),
        pct(r?.normal_count || 0, fb),
        pct(r?.bad_count || 0, fb),
      ] };
    });
  }, [selectedName, weekStart, selectedChartIds]);

  // Карта id -> имя для сотрудников (по загруженному списку менеджеров заботы и текущему пользователю)
  const idToNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    const getId = (e?: Employee | null) => e?.custom_itigris_user_id || e?.user_id;
    managers.forEach(m => {
      const id = getId(m);
      if (id) map[String(id)] = m.employee_name;
    });
    const selfId = getId(employee);
    if (selfId && employee?.employee_name) map[String(selfId)] = employee.employee_name;
    return map;
  }, [managers, employee]);

  // Динамические подписи к линиям для режима «Клуб»: показываем только имена, без fallback на id
  const teamLegendNames = useMemo(() => {
    if (!isClubManager || selectedManager) return [];
    const ids = (selectedChartIds && selectedChartIds.length > 0 ? selectedChartIds : selectedEmployeeIds) || [];
    return ids.map((id) => idToNameMap[String(id)] || dataSource.find(e => String(e.employee_id)===String(id))?.employee_name || '').filter(Boolean);
  }, [isClubManager, selectedManager, selectedChartIds, selectedEmployeeIds, idToNameMap, dataSource]);

  // Сортировка колонок по CSI (для руководителя клуба)
  const [csiSortOrder, setCsiSortOrder] = useState<'desc' | 'asc' | null>(null);
  const toggleCsiSort = () => setCsiSortOrder((prev) => (prev !== 'desc' ? 'desc' : 'asc'));

  // Порядок сотрудников для таблицы (у руководителя — строго по employeeIds)
  const orderedEmployees: ApiEmployeeReviews[] = useMemo(() => {
    if (!(isClubManager && !selectedManager)) return dataSource;
    if (!selectedEmployeeIds || selectedEmployeeIds.length === 0) return dataSource;
    const base = selectedEmployeeIds.map((id, idx) => {
      const found = dataSource.find(e => String(e.employee_id) === String(id));
      if (found) return found;
      return {
        employee_id: id,
        employee_name: idToNameMap[String(id)] || '',
        results: []
      } as ApiEmployeeReviews;
    });
    if (!csiSortOrder) return base;
    const scored = base.map((e, idx) => {
      const r = e.results.find(x => x.first_date_of_week === weekKey);
      const g = r?.good_count || 0; const n = r?.normal_count || 0; const b = r?.bad_count || 0;
      return { e, idx, score: csiScore(g, n, b) };
    });
    scored.sort((a, b) => {
      const diff = a.score === b.score ? a.idx - b.idx : b.score - a.score; // desc by default
      return csiSortOrder === 'desc' ? diff : -diff;
    });
    return scored.map(s => s.e);
  }, [isClubManager, selectedManager, selectedEmployeeIds, dataSource, idToNameMap, csiSortOrder, weekKey]);

  // Детальная разбивка по неделям убрана — период регулируется верхним фильтром

  // SVG chart helpers (with configurable Y range and colors)
  const Chart = ({
    data,
    minY = 0,
    maxY = 100,
    colors = ['stroke-green-500', 'stroke-blue-500', 'stroke-amber-500'],
    dotFills = ['fill-green-500', 'fill-blue-500', 'fill-amber-500'],
  }: {
    data: TrendPoint[];
    minY?: number;
    maxY?: number;
    colors?: string[];
    dotFills?: string[];
  }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; colorClass: string } | null>(null);
    const width = 320;
    const height = 190; // taller for better readability
    const padding = { left: 30, right: 12, top: 12, bottom: 28 };
    const xs = (i: number) => padding.left + (i * (width - padding.left - padding.right)) / (data.length - 1);
    const ys = (v: number) => {
      const clamped = Math.max(minY, Math.min(maxY, v));
      return padding.top + (height - padding.top - padding.bottom) * (1 - (clamped - minY) / (maxY - minY));
    };
    const seriesCount = data.reduce((m, p) => Math.max(m, p.values?.length || 0), 0);
    const toPathByIndex = (seriesIndex: number) => data.map((p, i) => {
      const val = (p.values && p.values[seriesIndex] != null) ? p.values[seriesIndex] : 0;
      return `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(val)}`;
    }).join(' ');
    const gridCount = 5;
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="text-gray-300" onClick={() => setTooltip(null)}>
        <rect x="0" y="0" width={width} height={height} rx="10" className="fill-white dark:fill-gray-900" />
        {Array.from({ length: gridCount }).map((_, i) => {
          const y = padding.top + i * ((height - padding.top - padding.bottom) / (gridCount - 1));
          const val = Math.round(maxY - ((maxY - minY) / (gridCount - 1)) * i);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
              <text x={padding.left - 6} y={y} textAnchor="end" dominantBaseline="middle" className="fill-gray-400 text-[9px]">{val}%</text>
            </g>
          );
        })}
        {Array.from({ length: seriesCount }).map((_, sIdx) => (
          <path key={`line-${sIdx}`} d={toPathByIndex(sIdx)} className={`${colors[sIdx % colors.length]} fill-none`} strokeWidth="2" />
        ))}
        {data.map((p, i) => (
          <g key={i}>
            {Array.from({ length: seriesCount }).map((_, sIdx) => {
              const val = (p.values && p.values[sIdx] != null) ? p.values[sIdx] : 0;
              const cx = xs(i);
              const cy = ys(val);
              const colorClass = (dotFills[sIdx % dotFills.length] as string).replace('fill-', 'text-');
              return (
                <g key={`pt-${i}-${sIdx}`}>
                  <circle cx={cx} cy={cy} r={10} fill="transparent" onClick={(e) => { e.stopPropagation(); setTooltip({ x: cx, y: cy, value: val as number, colorClass }); }} />
                  <circle cx={cx} cy={cy} r={5} className={dotFills[sIdx % dotFills.length]} onClick={(e) => { e.stopPropagation(); setTooltip({ x: cx, y: cy, value: val as number, colorClass }); }} />
                </g>
              );
            })}
            <text x={xs(i)} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[11px]">{p.label}</text>
          </g>
        ))}

        {tooltip && (() => {
          const label = `${Math.round(tooltip.value)}%`;
          const charW = 8;
          const padX = 10;
          const w = padX * 2 + label.length * charW;
          // Keep tooltip inside the SVG viewBox horizontally
          const minX = padding.left + w / 2;
          const maxX = width - padding.right - w / 2;
          const x = Math.max(minX, Math.min(maxX, tooltip.x));
          // Prefer showing above the point; if clipped, flip below
          const offset = 18;
          const halfH = 10; // tooltip rect half-height
          let y = tooltip.y - offset;
          if (y - halfH < 0) {
            y = tooltip.y + offset;
          }
          if (y + halfH > height) {
            y = height - halfH;
          }
          return (
            <g transform={`translate(${x}, ${y})`} className={tooltip.colorClass}>
              <rect x={-w/2} y={-halfH} width={w} height={halfH * 2} rx={8} className="fill-white stroke-current" />
              <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight={600 as unknown as number} fill="currentColor">{label}</text>
            </g>
          );
        })()}
      </svg>
    );
  };

  const RatingRow = ({ name, orders, reviews, good, neutral, bad, score, color }: { name: string; orders: number; reviews: number; good: string; neutral: string; bad: string; score: number; color: string }) => (
    <tr className="text-sm">
      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{name}</td>
      <td className="py-2 text-center">{orders}</td>
      <td className="py-2 text-center">{reviews}</td>
      <td className="py-2 text-center text-green-600">{good}</td>
      <td className="py-2 text-center text-amber-600">{neutral}</td>
      <td className="py-2 text-center text-red-600">{bad}</td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
          </div>
          <span className="w-10 text-right font-semibold">{score}</span>
        </div>
      </td>
    </tr>
  );

  // Mock negative reviews grouped by employee
  type NegReview = { id: string; orderId: string; author: string; date: string; text: string; rating: number; replied?: boolean };
  const negativeByEmployeeAll: Record<string, NegReview[]> = {
    "Михаил Сидоров": [
      { id: 'r1', orderId: '#E3006', author: 'Андрей Соколов', date: '11.01.2024', text: 'Немного долго ждал консультацию, но в итоге все хорошо.', rating: 2 },
      { id: 'r2', orderId: '#E3051', author: 'Ирина Иванова', date: '12.01.2024', text: 'Консультант был невнимателен к деталям заказа.', rating: 2 },
    ],
    "Анна Петрова": [
      { id: 'r3', orderId: '#E2999', author: 'Павел Кузнецов', date: '10.01.2024', text: 'Задержали выдачу заказа на 2 дня.', rating: 2 },
    ],
    "Елена Козлова": [
      { id: 'r4', orderId: '#E3111', author: 'Светлана Орлова', date: '09.01.2024', text: 'Не ответили на звонок, пришлось ждать.', rating: 2 },
    ],
  };

  // Apply manager filter to the negative list
  const negativeByEmployee = useMemo(() => {
    if (!selectedName) return negativeByEmployeeAll;
    // For non managers, always filter to their own name; for manager – to selection
    const list = negativeByEmployeeAll[selectedName] || [];
    return { [selectedName]: list } as Record<string, NegReview[]>;
  }, [selectedName]);

  const [replyOpenFor, setReplyOpenFor] = useState<NegReview | null>(null);
  const [repliedIds, setRepliedIds] = useState<Record<string, boolean>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const handleSubmitReply = () => {
    if (!replyOpenFor) return;
    setRepliedIds((prev) => ({ ...prev, [replyOpenFor.id]: true }));
    setReplyOpenFor(null);
  };
  const toggleExpand = (id: string) => setExpandedIds((p) => ({ ...p, [id]: !p[id] }));

  // Временный флаг: скрываем блок с негативными отзывами до появления API
  const showNegativeBlock = false;

  return (
    <section className="max-w-full sm:max-w-md mx-auto px-4 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 text-center">
      {!embedded && (
        <Button variant="ghost" size="sm" className="px-2" onClick={() => onBack ? onBack() : navigate(-1)}>
          ← Дашборд
        </Button>
      )}

      {!embedded && <PageHeader title={title} subtitle={subtitle} />}

      {/* Filters */}
      <div className="w-full flex flex-col gap-2 sm:gap-3 mb-2">
        <div className="w-full flex flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 focus:outline-none"
              >
                <CalendarIcon className="w-4 h-4" />
                {selectedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="center" className="p-0 border border-slate-200 rounded-lg shadow-sm bg-white mt-1 w-auto">
              <div className="text-center text-sm font-medium py-1 text-gray-600 border-b border-slate-200">
                {selectedDate.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'long' })}
              </div>
              <DatePicker
                mode="single"
                selected={selectedDate}
                onSelect={(date?: Date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                initialFocus
                className="rounded-md font-normal"
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(new Date());
              setDatePickerOpen(false);
            }}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none"
            title="Сегодня"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          {isClubManager && managers.length > 0 && (
            <Select
              value={selectedManager ? selectedManager.name : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedManager(null);
                } else {
                  const mgr = managers.find((m) => m.name === value);
                  setSelectedManager(mgr || null);
                }
              }}
            >
              <SelectTrigger className="h-8 min-w-[160px] text-xs px-3 rounded-full bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-0 ring-0">
                <SelectValue placeholder="Клуб" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Клуб</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.name} value={m.name}>{m.employee_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          Период недели: {weekStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} – {weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
        </div>
      </div>

      {/* Content / Error / Loading */}
      {reviewsLoading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : reviewsError ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Не удалось загрузить отзывы</h3>
          <p className="text-gray-600 text-sm mt-1">Проверьте подключение или попробуйте ещё раз.</p>
          <div className="mt-3">
            <Button onClick={() => setReviewsError(null)} className="mr-2">Скрыть</Button>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center max-w-md break-words">
            {reviewsError}
          </div>
        </div>
      ) : (
      <>
      {/* 1. Summary block */}
      <Card className="bg-white rounded-xl sm:rounded-2xl shadow border p-0 overflow-hidden">
        <CardHeader className="pb-0 pt-3 sm:pt-4 flex items-center justify-center">
          <CardTitle className="text-[18px] sm:text-[20px] font-semibold text-gray-900 flex items-center justify-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </span>
            <span>{isClubManager && !selectedManager ? 'Общая статистика команды' : 'Отзывы клиентов'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 pb-4">
          <div className="flex items-stretch gap-2 sm:gap-3 min-w-0">
            <div className="flex-1 min-w-0 bg-green-50 border border-green-200 rounded-lg px-2 py-2 flex items-center justify-center gap-2">
              <div className="flex flex-col items-center text-center leading-tight">
                <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                  Хорошо
                </span>
                <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">{currentSummary.good}%</span>
                <span className="text-[11px] sm:text-xs font-semibold text-green-700">{formatDelta(currentSummary.goodDelta)}</span>
              </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2 flex items-center justify-center gap-2">
              <div className="flex flex-col items-center text-center leading-tight">
                <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                  Норм
                </span>
                <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">{currentSummary.neutral}%</span>
                <span className="text-[11px] sm:text-xs font-semibold text-red-700">{formatDelta(currentSummary.neutralDelta)}</span>
              </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 bg-red-50 border border-red-200 rounded-lg px-2 py-2 flex items-center justify-center gap-2">
              <div className="flex flex-col items-center text-center leading-tight">
                <span className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1.5">
                  <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                  Плохо
                </span>
                <div className="flex items-baseline gap-1">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">{currentSummary.bad}%</span>
                <span className="text-[11px] sm:text-xs font-semibold text-green-700">{formatDelta(currentSummary.badDelta)}</span>
              </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] sm:text-[12px] text-gray-500 mt-1.5">
            {currentSummary.total} отзывов за неделю {weekStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}–{weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Trend chart block (adaptive by role/selection) */}
      <Card className="bg-white rounded-xl sm:rounded-2xl shadow border p-0 overflow-hidden">
        <CardHeader className="pb-0 pt-3 sm:pt-4 flex items-center justify-center">
          <CardTitle className="text-[18px] sm:text-[20px] font-semibold text-gray-900 text-center">
            {isClubManager && !selectedManager ? 'Динамика рейтинга команды' : 'Тренды оценок по неделям'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 pb-2">
          <div className="bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {isClubManager && !selectedManager ? (
              <Chart
                data={trend}
                minY={60}
                maxY={100}
                colors={["stroke-green-600","stroke-blue-600","stroke-amber-600","stroke-purple-600","stroke-rose-600","stroke-cyan-600"]}
                dotFills={["fill-green-600","fill-blue-600","fill-amber-600","fill-purple-600","fill-rose-600","fill-cyan-600"]}
              />
            ) : (
              <Chart
                data={trend}
                minY={0}
                maxY={100}
                colors={["stroke-green-600","stroke-gray-500","stroke-red-600"]}
                dotFills={["fill-green-600","fill-gray-500","fill-red-600"]}
              />
            )}
          </div>
          {isClubManager && !selectedManager && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DropdownMenu open={chartPickerOpen} onOpenChange={setChartPickerOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 rounded-full text-xs">Выбрать менеджеров</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-1">
                  {(selectedEmployeeIds || []).map((id) => {
                    const name = idToNameMap[String(id)] || dataSource.find(e => String(e.employee_id)===String(id))?.employee_name || String(id);
                    const checked = draftChartIds.includes(String(id));
                    return (
                      <DropdownMenuCheckboxItem
                        key={String(id)}
                        checked={checked}
                        onSelect={(e) => { e.preventDefault(); }}
                        onCheckedChange={(v) => {
                          setDraftChartIds((prev) => {
                            const set = new Set(prev);
                            if (v) set.add(String(id)); else set.delete(String(id));
                            return (selectedEmployeeIds || []).filter(x => set.has(String(x)));
                          });
                        }}
                        className="text-sm"
                      >
                        {name}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  <div className="mt-1 flex items-center justify-end gap-2 px-1 py-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { setDraftChartIds(selectedChartIds); setChartPickerOpen(false); }}>Отмена</Button>
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => { setSelectedChartIds(draftChartIds); setChartPickerOpen(false); }}>Сохранить</Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] sm:text-xs">
                {teamLegendNames.map((n, i) => (
                  <div key={`${n}-${i}`} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${["bg-green-600","bg-blue-600","bg-amber-600","bg-purple-600","bg-rose-600","bg-cyan-600"][i % 6]}`} />{n}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isClubManager || !!selectedManager ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-[11px] sm:text-xs">
              <>
                <div className="flex items-center gap-1 text-green-700"><span className="w-2 h-2 rounded-full bg-green-600" />Хорошо</div>
                <div className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-500" />Норм</div>
                <div className="flex items-center gap-1 text-red-700"><span className="w-2 h-2 rounded-full bg-red-600" />Плохо</div>
              </>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 3. Rating table */}
      <Card className="bg-white rounded-xl sm:rounded-2xl shadow border p-0 overflow-hidden">
          <CardHeader className="pb-0 pt-3 sm:pt-4 flex items-center justify-center">
            <CardTitle className="text-[18px] sm:text-[20px] font-semibold text-gray-900 text-center">{isClubManager && !selectedManager ? 'Рейтинг отзывов команды' : 'Разбивка по неделям'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 pb-4">
            {isClubManager && !selectedManager ? (
              <div className="overflow-x-auto">
                {/* chips with selected names removed by request */}
                <table className="min-w-[640px] w-full text-gray-700 dark:text-gray-200 border-separate border-spacing-y-[2px] mx-auto">
                  <thead className="text-[11px] sm:text-xs text-gray-600 bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Метрика</th>
                      {orderedEmployees.map((e) => (
                        <th key={e.employee_id as any} className="text-center px-2 py-1.5 font-medium">{e.employee_name || idToNameMap[String(e.employee_id)] || ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2">Заказы</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center">{r?.order_count ?? 0}</td>;
                      })}
                    </tr>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2">Отзывы</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center">{r?.feedback_count ?? 0}</td>;
                      })}
                    </tr>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2">Хорошо</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        const fb = r?.feedback_count || 0;
                        const g = r?.good_count || 0;
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center text-green-600">{pct(g, fb)}% ({g})</td>;
                      })}
                    </tr>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2">Норм</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        const fb = r?.feedback_count || 0;
                        const n = r?.normal_count || 0;
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center text-amber-600">{pct(n, fb)}% ({n})</td>;
                      })}
                    </tr>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2">Плохо</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        const fb = r?.feedback_count || 0;
                        const b = r?.bad_count || 0;
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center text-red-600">{pct(b, fb)}% ({b})</td>;
                      })}
                    </tr>
                    {/* Рейтинг CSI за текущую неделю */}
                    <tr className="text-sm bg-gray-50">
                      <td className="px-2 py-2 font-medium cursor-pointer select-none" title={csiSortOrder ? (csiSortOrder === 'desc' ? 'Отсортировано по убыванию' : 'Отсортировано по возрастанию') : 'Отсортировать'} onClick={toggleCsiSort}>Рейтинг CSI</td>
                      {(() => {
                        const csiByEmp = orderedEmployees.map((e) => {
                          const r = e.results.find(x => x.first_date_of_week === weekKey);
                          const g = r?.good_count || 0; const n = r?.normal_count || 0; const b = r?.bad_count || 0;
                          return { id: e.employee_id, value: csiScore(g, n, b) };
                        });
                        // Найдём ранги (чем выше CSI, тем выше место)
                        const sorted = [...csiByEmp].sort((a, b) => b.value - a.value);
                        const rankMap = new Map(sorted.map((e, idx) => [String(e.id), idx + 1]));
                        return orderedEmployees.map((e) => (
                          <td key={e.employee_id as any} className="px-2 py-2 text-center text-blue-600 font-semibold">
                            {rankMap.get(String(e.employee_id))}
                          </td>
                        ));
                      })()}
                    </tr>
                    <tr className="text-sm bg-white">
                      <td className="px-2 py-2 font-medium">Общий балл (CSI)</td>
                      {orderedEmployees.map((e) => {
                        const r = e.results.find(x => x.first_date_of_week === weekKey);
                        const g = r?.good_count || 0; const n = r?.normal_count || 0; const b = r?.bad_count || 0;
                        return <td key={e.employee_id as any} className="px-2 py-2 text-center text-blue-600 font-semibold">{csiScore(g, n, b)}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[560px] w-full text-gray-700 dark:text-gray-200 border-separate border-spacing-y-[2px]">
                  <thead className="text-[11px] sm:text-xs text-gray-600 bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Метрика</th>
                      {([0,1,2,3] as const).map((n) => (
                        <th key={n} className="text-center px-2 py-1.5 font-medium">{n===0? 'Текущая' : `-${n} нед`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const emp = getByIdOrName(selectedEmployeeId, selectedName);
                      const keys = [0,1,2,3].map((n) => formatWeek(addDays(weekStart, -7*n)));
                      const rows = keys.map(k => emp && getWeekData(emp.results, k));
                      return (
                        <>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2">Закрытые заказы</td>
                            {rows.map((r, i) => <td key={i} className="px-2 py-2 text-center">{r?.order_count ?? 0}</td>)}
                          </tr>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2">Всего отзывов</td>
                            {rows.map((r, i) => <td key={i} className="px-2 py-2 text-center">{r?.feedback_count ?? 0}</td>)}
                          </tr>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2">Хорошо</td>
                            {rows.map((r, i) => {
                              const fb = r?.feedback_count || 0; const g = r?.good_count || 0;
                              return <td key={i} className="px-2 py-2 text-center text-green-600">{pct(g, fb)}% ({g})</td>;
                            })}
                          </tr>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2">Норм</td>
                            {rows.map((r, i) => {
                              const fb = r?.feedback_count || 0; const n = r?.normal_count || 0;
                              return <td key={i} className="px-2 py-2 text-center text-amber-600">{pct(n, fb)}% ({n})</td>;
                            })}
                          </tr>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2">Плохо</td>
                            {rows.map((r, i) => {
                              const fb = r?.feedback_count || 0; const b = r?.bad_count || 0;
                              return <td key={i} className="px-2 py-2 text-center text-red-600">{pct(b, fb)}% ({b})</td>;
                            })}
                          </tr>
                          <tr className="text-sm bg-white">
                            <td className="px-2 py-2 font-medium">Общий балл (CSI)</td>
                            {rows.map((r, i) => {
                              const g = r?.good_count || 0; const n = r?.normal_count || 0; const b = r?.bad_count || 0;
                              return <td key={i} className="px-2 py-2 text-center text-blue-600 font-semibold">{csiScore(g, n, b)}</td>;
                            })}
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      {showNegativeBlock && isClubManager && !selectedManager && (
        <>
          {/* 4. Negative reviews by employee */}
          <Card className="bg-white rounded-xl sm:rounded-2xl shadow border p-0 overflow-hidden">
            <CardHeader className="pb-0 pt-3 sm:pt-4 flex flex-row items-center gap-2 space-y-0">
              <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5 text-white" /></div>
              <CardTitle className="text-[18px] sm:text-[20px] font-semibold text-gray-900">Негативные отзывы по сотрудникам</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-4">
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(negativeByEmployee).map(([employeeName, list]) => {
                  const total = list.length;
                  return (
                    <AccordionItem key={employeeName} value={employeeName} className="border-0">
                      <AccordionTrigger className="px-3 py-3 rounded-lg border bg-white hover:bg-gray-50 text-left">
                        <div className="flex w-full items-center">
                          <span className="flex-1 text-sm font-medium text-gray-900">{employeeName}</span>
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{total}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {list.map((r) => (
                          <div key={r.id} className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold">
                              <span>{r.orderId}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                              <span className="font-medium text-gray-900">{r.author} {repliedIds[r.id] && <span className="ml-2 text-green-600">✓</span>}</span>
                              <span>{r.date}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-amber-500">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-amber-400' : 'fill-transparent'}`} />
                              ))}
                              <span className="ml-1 text-xs text-gray-600">{r.rating}</span>
                            </div>
                            <div
                              className="mt-2 text-sm text-gray-700 cursor-pointer"
                              onClick={() => toggleExpand(r.id)}
                              style={expandedIds[r.id] ? undefined : ({ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties)}
                              title={expandedIds[r.id] ? undefined : 'Нажмите, чтобы развернуть'}
                            >
                              {r.text}
                            </div>
                            {!repliedIds[r.id] && (
                              <button
                                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                onClick={() => setReplyOpenFor(r)}
                              >
                                <span>💬 Ответить</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          <Dialog open={!!replyOpenFor} onOpenChange={(o) => !o && setReplyOpenFor(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ответ на отзыв</DialogTitle>
              </DialogHeader>
              {replyOpenFor && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{replyOpenFor.author}</span>
                    <span>{replyOpenFor.date}</span>
                  </div>
                  <div className="text-sm p-3 rounded-md bg-gray-50 border border-gray-200">
                    {replyOpenFor.text}
                  </div>
                  <Textarea placeholder="Ваш ответ клиенту" rows={5} />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setReplyOpenFor(null)}>Отмена</Button>
                    <Button onClick={handleSubmitReply}>Отправить</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      </>
      )}
    </section>
  );
}

/** Page wrapper — used by the route */
export default function Reviews() {
  return <ReviewsContent />;
}
