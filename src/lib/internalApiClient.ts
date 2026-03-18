import { logger } from './logger';

const ignoreError = (_e?: unknown) => undefined;

// ========== SessionStorage cache для клиента (персистентный между обновлениями) ==========
const CLIENT_CACHE_TTL = 3 * 60 * 1000; // 3 минуты
const CACHE_PREFIX = 'api_';

interface CacheEntry<T> {
  d: T;  // data
  t: number;  // timestamp
}

function getApiCacheKey(endpoint: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}=${Array.isArray(params[k]) ? (params[k] as unknown[]).sort().join(',') : params[k]}`)
    .join('|');
  return CACHE_PREFIX + endpoint + '_' + sortedParams;
}

function getFromApiCache<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.t > CLIENT_CACHE_TTL) {
      sessionStorage.removeItem(key);
      return undefined;
    }
    return entry.d;
  } catch {
    return undefined;
  }
}

function setInApiCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { d: data, t: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full - cleanup old entries
    cleanupApiCache();
    try {
      const entry: CacheEntry<T> = { d: data, t: Date.now() };
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Still doesn't fit - ignore
    }
  }
}

function cleanupApiCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry<unknown> = JSON.parse(raw);
            if (now - entry.t > CLIENT_CACHE_TTL) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key!);
        }
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

// Cleanup on module load
if (typeof window !== 'undefined') {
  cleanupApiCache();
}

async function normalizeImageForUpload(file: File): Promise<File> {
  try {
    if (!file?.type || !String(file.type).startsWith('image/')) return file;
    // createImageBitmap supports EXIF orientation via imageOrientation option in modern browsers/webviews
    if (typeof createImageBitmap !== 'function') return file;

    // @ts-expect-error imageOrientation is supported in modern browsers, but TS lib dom typings may vary
    const bitmap: ImageBitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    const maxSide = 2048;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outType === 'image/jpeg' ? 0.92 : undefined;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outType, quality as any);
    });

    if (!blob) return file;

    const newName = (() => {
      const base = file.name?.replace(/\.[^.]+$/, '') || 'profile-photo';
      return outType === 'image/png' ? `${base}.png` : `${base}.jpg`;
    })();

    return new File([blob], newName, { type: outType });
  } catch (e) {
    // If anything fails (old webview), fallback to original file
    ignoreError(e);
    return file;
  }
}

interface Employee {
  user_id: string;
  designation: string;
  employee_name: string;
  custom_tg_username: string;
  custom_itigris_user_id?: string;
  // Optional derived schedule kind (backend may send it instead of raw Link ID)
  custom_employee_shift_format_kind?: '2/2' | '5/2';
  reports_to?: string;
  department?: string; // 🔹 ссылка на Department doctype
  store_id?: string; // store_id computed by BFF for by-stores endpoint
  name?: string;
  // branch удаляется — используем department
  image?: string;
  company_email?: string;
}

interface Manager {
  user_id: string;
  designation: string;
  employee_name: string;
  custom_tg_username?: string;
  image?: string;
}

interface Task {
  name: string;
  subject: string;
  status: string;
  custom_assignee_employee?: string;
  custom_author_employee?: string;
  description?: string;
  creation: string;
  modified: string;
  completed_on?: string;
}

interface WikiPage {
  name: string;
  title: string;
  content?: string;
  route?: string;
  published?: number;
  custom_preview_image?: string;
  custom_preview_description?: string;
  custom_designations?: string;
  custom_designations_list?: Array<{
    designation_link?: string;
    idx?: number;
    [key: string]: unknown;
  }>;
  owner?: string;
  custom_owner?: string;
}

interface TaskDraft {
  subject: string;
  description?: string;
  assignee_id: string;
  assignee_name: string;
}

// Outline API interfaces
interface OutlineDocument {
  id: string;
  title: string;
  emoji?: string;
  collection?: {
    id: string;
    name: string;
  };
  collectionId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: {
    name: string;
  };
  url?: string;
  revision?: number;
  parentDocumentId?: string;
}

interface OutlineSearchResult {
  document: OutlineDocument;
  context: string;
  ranking: number;
}

interface OutlineSearchResponse {
  results: OutlineSearchResult[];
  totalCount: number;
}

interface OutlineCollection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

// Интерфейс для структуры документа в коллекции
interface OutlineDocumentStructure {
  id: string;
  url: string;
  title: string;
  icon?: string;
  color?: string;
  children: OutlineDocumentStructure[];
}

interface OutlineCollectionStructure {
  data: OutlineDocumentStructure[];
}

interface FrappeResponse<T> {
  data: T[];
}

interface AnalyticsDashboardData {
  created_order_revenue?: string;
  created_orders_day_revenue?: {
    plan?: string;
    fact?: string;
    branch_plan?: string;
    branch_fact?: string;
  };
  created_orders_month_revenue?: {
    plan?: string;
    fact?: string;
    branch_plan?: string;
    branch_fact?: string;
    forecast_w_cdate?: string;
    forecast_wo_cdate?: string;
    branch_forecast_w_cdate?: string;
    branch_forecast_wo_cdate?: string;
  };
  closed_orders_day_revenue?: {
    plan?: string;
    fact?: string;
    branch_plan?: string;
    branch_fact?: string;
  };
  closed_orders_month_revenue?: {
    plan?: string;
    fact?: string;
    branch_plan?: string;
    branch_fact?: string;
    forecast_w_cdate?: string;
    forecast_wo_cdate?: string;
    branch_forecast_w_cdate?: string;
    branch_forecast_wo_cdate?: string;
  };
  unclosed_orders?: {
    count?: number;
    revenue?: string;
  };
  created_orders_goods?: Array<{
    type?: string;
    count?: number;
    average_price?: string;
  }>;
}

interface AnalyticsDashboardResponse {
  data?: AnalyticsDashboardData;
  [key: string]: unknown;
}

// === Feedbacks ===
interface FeedbackItem {
  id: string;
  employee_id?: string;
  employee_name?: string;
  created_at: string; // ISO date
  rating?: number; // 1..5
  sentiment?: 'good' | 'neutral' | 'bad';
  comment?: string;
}

interface FeedbacksResponse {
  data?: FeedbackItem[];
  total?: number;
  from_date?: string;
  to_date?: string;
}

// Типы причин незакрытых заказов
type OrderGroupType = "old_stock" | "near_deadline" | "overdue";

interface UnclosedOrder {
  group_types: OrderGroupType[];
  id: string;
  created_at: string;
  planned_date_of_readiness: string;
  status: string;
  order_sum: string;
  manager_id: string;
  manager_name: string;
}

interface UnclosedOrdersResponse {
  store_id?: string | null;
  employee_id?: string;
  count?: number;
  revenue?: string;
  data?: UnclosedOrder[];
}

// === Loovis access role (employee role + allowed stores) ===
export type LoovisStoreOption = {
  store_id: string;
  name: string;
  department_id?: string | null;
};

export type LoovisEmployeeRoleResponse = {
  employee_id: string;
  loovis_role: string | null;
  source: string | null;
  stores: LoovisStoreOption[];
};

// === LoovIs user settings (stored in Frappe DocType) ===
export type UserSettingsVariant = 'shared' | 'mobile_tg' | 'desktop_tg' | 'mobile_web' | 'desktop_web';

export type UserSettingsBlob = {
  scope: string;
  variant: UserSettingsVariant;
  payload_version?: number;
  payload_json?: string;
};

export type UserSettingsResponse = {
  employee_id: string;
  schema_version?: number;
  active_variant_mode?: 'shared_only' | 'per_variant' | string;
  last_client?: UserSettingsVariant | string | null;
  last_seen_at?: string | null;
  blobs?: UserSettingsBlob[];
  allowed_variants?: string[];
};

// === KB Provider types ===
interface KbProviderField {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
}

interface KbProviderConfig {
  label?: string;
  base_url?: string;
  api_key?: string;
  workspace_id?: string;
  space_key?: string;
  org_id?: string;
  is_active?: boolean;
  source?: string;
  last_test_at?: string | null;
  last_test_status?: string | null;
}

interface KbProviderInfo {
  type: string;
  label: string;
  fields: KbProviderField[];
  comingSoon: boolean;
  config: KbProviderConfig | null;
}

interface KbProvidersResponse {
  providers: Record<string, KbProviderInfo>;
}

interface KbTestResult {
  ok: boolean;
  message: string;
  latency?: number;
}

interface KbImportPreviewFile {
  filename: string;
  size: number;
  title: string;
  preview: string;
  lineCount: number;
}

interface KbImportPreviewResponse {
  files: KbImportPreviewFile[];
}

interface KbImportResult {
  created: number;
  errors: Array<{ filename: string; error: string }>;
}

interface KbArticle {
  name: string;
  title: string;
  published?: number;
  content?: string;
  creation?: string;
  modified?: string;
  collectionId?: string;
}

interface KbCollection {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
}

// === Dashboard Metric Config types ===
export interface ManualDataEntry {
  period: string;
  storeId?: string;
  fact: number;
  plan: number;
}

export type WidgetType = 'kpi_forecast' | 'kpi_deviation';

// V2 metric classification types
export type MetricType = 'absolute' | 'averaged' | 'percentage' | 'computed';
export type ValueType = 'currency' | 'count' | 'percentage' | 'ratio' | 'duration' | 'score';
export type AggregationMethod = 'sum' | 'weighted_average' | 'simple_average' | 'last' | 'min' | 'max';
export type PlanPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type PlanProRateMethod = 'working_days' | 'calendar_days' | 'none';

export interface MetricThresholds {
  critical?: number;
  good?: number;
}

export type FieldMappingEntityType = 'branch' | 'employee' | 'department' | 'designation' | 'custom' | 'client';

export interface FieldMapping {
  id: string;
  apiField: string;
  entityType: FieldMappingEntityType;
  label: string;
  values: Record<string, string>;
}

export interface MetricBinding {
  scope: 'network' | 'branch' | 'employee' | 'client';
  scopeId: string;
  planValue?: number;
  planPeriod?: PlanPeriod;
  enabled?: boolean;
  queryParamOverrides?: Array<{ key: string; value: string }>;
}

export interface MetricPlan {
  id: string;
  metricId: string;
  scope: 'network' | 'branch' | 'employee' | 'client';
  scopeId: string;
  period: string;
  planValue: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FactHistoryEntry {
  date: string;
  fact: number;
}

export interface FactHistoryMetric {
  name: string;
  color?: string;
  unit?: string;
  entries: FactHistoryEntry[];
}

export interface FactHistoryResponse {
  history: Record<string, FactHistoryMetric>;
  recentDates: string[];
  days: number;
}

export interface EmployeeFactsSummary {
  name: string;
  facts: Record<string, { fact: number }>;
  monthTotals: Record<string, number>;
  filled: boolean;
}

export interface BranchFactsSummary {
  facts: Record<string, { fact: number }>;
  monthTotals: Record<string, number>;
  filled: boolean;
  employees: Record<string, EmployeeFactsSummary>;
}

export interface FactsOverviewResponse {
  branches: Record<string, BranchFactsSummary>;
  totalsByMetric: Record<string, number>;
  date: string;
  metrics: Array<{ id: string; name: string; color?: string; unit?: string }>;
}

export interface DashboardMetricConfig {
  id: string;
  name: string;
  unit: string;
  forecastUnit: string;
  forecastLabel: 'forecast' | 'deviation' | 'remaining';
  widgetType: WidgetType;
  parentId?: string | null;
  source: 'tracker' | 'manual' | 'external_api' | 'computed';
  trackerCode?: string;
  externalUrl?: string;
  externalMethod?: string;
  externalHeaders?: Record<string, string>;
  jsonPathFact?: string;
  jsonPathPlan?: string;
  manualData?: ManualDataEntry[];
  color?: string;
  enabled: boolean;
  order: number;
  visibleToPositions?: string[];
  dataSourceId?: string | null;
  externalPath?: string;
  externalQueryParams?: Array<{ key: string; value: string }>;
  externalBody?: string | null;
  // V2 fields
  metricType?: MetricType;
  valueType?: ValueType;
  aggregation?: AggregationMethod;
  planPeriod?: PlanPeriod;
  planProRateMethod?: PlanProRateMethod;
  formula?: string;
  formulaDependencies?: string[];
  decimalPlaces?: number;
  thresholds?: MetricThresholds;
  bindings?: MetricBinding[];
  fieldMappings?: FieldMapping[];
  // V4: Loss/reserve config
  lossMode?: 'auto' | 'formula' | 'jsonpath' | 'disabled' | 'tracker';
  lossFormula?: string;
  jsonPathLoss?: string;
}

// V5: Ranking loss configuration
export interface RankingLossConfig {
  mode: 'metric' | 'formula' | 'auto' | 'disabled';
  metricCode: string;
  formula: string;
}

// V6: Dashboard widgets (rankings, charts, etc.)
export type DashboardWidgetType = 'ranking' | 'chart';

export interface RankingWidgetConfig {
  entityType: 'branch' | 'manager';
  metricCodes: string[];
  lossConfig: RankingLossConfig;
  /** Per-metric forecastLabel overrides (code → 'forecast' | 'deviation') */
  forecastLabelOverrides?: Record<string, 'forecast' | 'deviation'>;
}

export interface ChartMetricSeries {
  metricCode: string;
  chartType: 'bar' | 'line';
  color: string;
  /** Bar coloring: 'dynamic' = green/red by plan, 'static' = series color. Default: 'dynamic' */
  barStyle?: 'dynamic' | 'static';
}

export interface ChartWidgetConfig {
  /** Multi-metric series (new format) */
  metricSeries?: ChartMetricSeries[];
  subjectType?: 'store' | 'manager';
  isAggregated?: boolean;
  /** When true, renders as metric selector (dropdown with all metrics) */
  isMetricSelector?: boolean;
  /** @deprecated Single metric — kept for backward compat */
  metricCode?: string;
  /** @deprecated Old chart type — kept for backward compat */
  chartType?: 'bar' | 'percent';
}

/** Default color palette for chart series */
export const CHART_SERIES_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

/** Normalize legacy single-metric config to metricSeries format */
export function normalizeChartConfig(config: ChartWidgetConfig): ChartWidgetConfig & { metricSeries: ChartMetricSeries[] } {
  if (config.metricSeries && config.metricSeries.length > 0) {
    return config as ChartWidgetConfig & { metricSeries: ChartMetricSeries[] };
  }
  // Legacy migration: single metricCode → metricSeries[0]
  const code = config.metricCode || 'revenue_created';
  const chartType = config.chartType === 'percent' ? 'line' : 'bar';
  return {
    ...config,
    metricSeries: [{ metricCode: code, chartType, color: CHART_SERIES_COLORS[0] }],
  };
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  name: string;
  enabled: boolean;
  order: number;
  parentId?: string | null; // parent metric id; null = main dashboard
  config: RankingWidgetConfig | ChartWidgetConfig;
}

// === Data Source types ===
export type DataSourceAuthType = 'none' | 'bearer' | 'api_key_secret' | 'basic' | 'custom_headers';
export type DataSourcePaginationType = 'none' | 'offset' | 'cursor' | 'page';

export interface DataSourceAuthField {
  key: string;
  label: string;
  required: boolean;
  secret: boolean;
  placeholder: string;
}

export interface DataSourceAuthTypeDef {
  label: string;
  fields: DataSourceAuthField[];
}

export interface DataSourcePaginationField {
  key: string;
  label: string;
  placeholder: string;
  default: string;
}

export interface DataSourcePaginationTypeDef {
  label: string;
  fields: DataSourcePaginationField[];
}

export interface DataSourceConfig {
  id: string;
  label: string;
  baseUrl: string;
  authType: DataSourceAuthType;
  authConfig: Record<string, string>;
  paginationType: DataSourcePaginationType;
  paginationConfig: Record<string, string>;
  healthCheckPath: string;
  healthCheckMethod: string;
  timeout: number;
  enabled: boolean;
  builtIn: boolean;
  source: 'env' | 'manual';
  fieldMappings?: FieldMapping[];
  lastTestAt?: string;
  lastTestStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataSourceTestResult {
  ok: boolean;
  message: string;
  latency?: number;
}

export interface DataSourcesResponse {
  sources: DataSourceConfig[];
  authTypes: Record<DataSourceAuthType, DataSourceAuthTypeDef>;
  paginationTypes: Record<DataSourcePaginationType, DataSourcePaginationTypeDef>;
}

export interface MetricExtractionTestRequest {
  dataSourceId?: string;
  url?: string;
  path?: string;
  method?: string;
  queryParams?: Array<{ key: string; value: string }>;
  body?: string;
  headers?: Record<string, string>;
  jsonPathFact?: string;
  jsonPathPlan?: string;
}

export interface MetricExtractionTestResult {
  ok: boolean;
  error?: string;
  rawResponse?: unknown;
  rawResponseTruncated?: boolean;
  extractedFact?: unknown;
  extractedPlan?: unknown;
  factPath?: string;
  planPath?: string;
  latency?: number;
}

export interface DataSourceRequestResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  truncated?: boolean;
  latency?: number;
}

// === Metric Catalog types ===
export interface MetricTemplateConfig {
  source: string;
  dataSourceId?: string;
  trackerCode?: string;
  externalPath?: string;
  externalMethod?: string;
  externalQueryParams?: Array<{ key: string; value: string }>;
  jsonPathFact?: string;
  jsonPathPlan?: string;
  unit?: string;
  widgetType?: string;
  forecastLabel?: string;
  forecastUnit?: string;
  metricType?: string;
  valueType?: string;
}

export interface MetricTemplate {
  templateId: string;
  name: string;
  description: string;
  previewValue: number | null;
  alreadyExists?: boolean;
  config: MetricTemplateConfig;
}

export interface MetricCatalogCategory {
  name: string;
  icon: string;
  items: MetricTemplate[];
}

export interface MetricCatalogResponse {
  categories: MetricCatalogCategory[];
}

// === Motivation Config types ===
export interface MotivationKPITier {
  range: string;
  bonus: number;
  minPercent: number;
  maxPercent: number;
}

export interface MotivationKPIConfig {
  id: string;
  label: string;
  description: string;
  type?: 'tier' | 'multiplier';
  multiplierRate?: number;
  linkedMetricId?: string;
  tiers: MotivationKPITier[];
}

export type MotivationMatrix = Record<string, Record<string, number>>;

export interface MotivationBranchPositionConfig {
  branchId: string;
  positionId: string;
  trackerStoreId?: string;
  matrix: MotivationMatrix;
  kpis: MotivationKPIConfig[];
  baseSalary: number;
  personalPlan: number;
  clubPlan: number;
}

// ── Org Structure types ──

export interface AdminDepartment {
  name: string;
  department_name: string;
  custom_store_id?: string;
  parent_department?: string;
  is_group?: number;
}

export interface AdminEmployee {
  name: string;
  employee_name: string;
  first_name?: string;
  designation?: string;
  department?: string;
  reports_to?: string;
  custom_tg_username?: string;
  company_email?: string;
  image?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  gender?: string;
  status?: string;
}

export interface OrgTreeResponse {
  departments: AdminDepartment[];
  employees: AdminEmployee[];
}

export interface CreateDepartmentParams {
  department_name: string;
  parent_department?: string;
  custom_store_id?: string;
  is_group?: number;
}

export interface UpdateDepartmentParams {
  department_name?: string;
  parent_department?: string;
  custom_store_id?: string;
}

export interface CreateEmployeeParams {
  first_name: string;
  employee_name?: string;
  designation?: string;
  department?: string;
  reports_to?: string;
  custom_tg_username?: string;
  company_email?: string;
  date_of_birth: string;
  date_of_joining: string;
  gender: string;
}

export interface UpdateEmployeeParams {
  employee_name?: string;
  first_name?: string;
  designation?: string;
  department?: string;
  reports_to?: string;
  custom_tg_username?: string;
  company_email?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  gender?: string;
}

class InternalApiClient {
  private baseUrl = '/api/frappe';

  // Deduplicate concurrent getUserSettings calls to avoid connection pool exhaustion
  private _userSettingsInflight: Promise<UserSettingsResponse | null> | null = null;
  private _userSettingsCachedAt = 0;
  private _userSettingsCache: UserSettingsResponse | null = null;

  async getAllEmployees(): Promise<Employee[]> {
    try {
      const response = await fetch(`${this.baseUrl}/employees`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Employee> = await response.json();
      logger.info('📋 Получены активные сотрудники через internal API:', result.data);
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения сотрудников:', error);
      throw error;
    }
  }

  async findEmployeeByTelegramUsername(telegramUsername: string, chatId?: number): Promise<Employee | null> {
    try {
      const params = new URLSearchParams();
      if (chatId) {
        params.append('chat_id', chatId.toString());
      }

      const response = await fetch(`${this.baseUrl}/employees/find-by-telegram/${encodeURIComponent(telegramUsername)}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      const employee = result.data;
      
      if (employee) {
        logger.info('👤 Найден активный сотрудник через internal API:', employee);
        // Сохраняем имя сотрудника в localStorage
        try { localStorage.setItem('employee_name', employee.employee_name); } catch (e) { ignoreError(e); }
        try { localStorage.setItem('employee_data', JSON.stringify(employee)); } catch (e) { ignoreError(e); }
      } else {
        logger.info('❌ Активный сотрудник с Telegram username не найден:', telegramUsername);
      }
      
      return employee || null;
    } catch (error) {
      logger.error('❌ Ошибка поиска сотрудника:', error);
      return null;
    }
  }

  async getEmployeeById(employeeId: string): Promise<Employee | null> {
    try {
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      const employee = result.data;
      
      if (employee) {
        logger.info('👤 Получен сотрудник по ID через internal API:', employee);
      }
      
      return employee || null;
    } catch (error) {
      logger.error('❌ Ошибка получения сотрудника по ID:', error);
      return null;
    }
  }

  // === Departments ===
  /**
   * Получить документ Department по его ID и вернуть включая custom_store_id
   */
  async getDepartmentById(departmentId: string): Promise<{ custom_store_id?: string; name?: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/departments/${encodeURIComponent(departmentId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      const department = result.data;
      if (department) {
        logger.info('🏬 Получен департамент через internal API:', {
          departmentId,
          custom_store_id: department.custom_store_id,
        });
      }
      return department || null;
    } catch (error) {
      logger.error('❌ Ошибка получения департамента:', error);
      return null;
    }
  }

  async getLoovisEmployeeRole(): Promise<LoovisEmployeeRoleResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/loovis/employee-role`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        // 401/403 can happen when cookie is missing; treat as "no extra access"
        return null;
      }
      const result = (await response.json()) as LoovisEmployeeRoleResponse;
      return result || null;
    } catch (error) {
      logger.error('❌ Ошибка получения роли доступа (loovis_get_employee_role):', error);
      return null;
    }
  }

  async getEmployeesByStores(params: {
    storeIds?: string[];
    departmentIds?: string[];
    limit?: number;
    onlyManagers?: boolean;
  }): Promise<Employee[]> {
    try {
      const url = new URL(window.location.origin + `${this.baseUrl}/employees/by-stores`);
      (params.storeIds || []).forEach((id) => {
        if (id) url.searchParams.append('store_ids', String(id));
      });
      (params.departmentIds || []).forEach((id) => {
        if (id) url.searchParams.append('department_ids', String(id));
      });
      if (params.limit != null) url.searchParams.set('limit', String(params.limit));
      if (params.onlyManagers != null) url.searchParams.set('only_managers', params.onlyManagers ? 'true' : 'false');

      const response = await fetch(url.pathname + url.search, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`Employees by stores API error: ${response.status}${details ? ` - ${details}` : ''}`);
      }

      const result = (await response.json()) as { data?: Employee[] };
      return Array.isArray(result?.data) ? result.data : [];
    } catch (error) {
      logger.error('❌ Ошибка получения сотрудников по филиалам:', error);
      throw error;
    }
  }

  async getUserSettings(): Promise<UserSettingsResponse | null> {
    // Return short-lived cache (5s) to avoid flooding connections
    const now = Date.now();
    if (this._userSettingsCache !== undefined && now - this._userSettingsCachedAt < 5000) {
      return this._userSettingsCache;
    }
    // Deduplicate: if a request is already in-flight, reuse it
    if (this._userSettingsInflight) return this._userSettingsInflight;

    this._userSettingsInflight = this._fetchUserSettings();
    try {
      const result = await this._userSettingsInflight;
      this._userSettingsCache = result;
      this._userSettingsCachedAt = Date.now();
      return result;
    } finally {
      this._userSettingsInflight = null;
    }
  }

  private async _fetchUserSettings(): Promise<UserSettingsResponse | null> {
    try {
      const url = `${this.baseUrl}/user-settings?ts=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!response.ok) {
        return null;
      }
      const result = (await response.json()) as UserSettingsResponse;
      return result || null;
    } catch (error) {
      logger.error('❌ Ошибка получения пользовательских настроек (LoovIs user settings):', error);
      return null;
    }
  }

  async upsertUserSettings(params: { active_variant_mode?: string; last_client?: string; blobs: UserSettingsBlob[] }): Promise<UserSettingsResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/user-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          active_variant_mode: params.active_variant_mode,
          last_client: params.last_client,
          blobs: params.blobs || [],
        })
      });
      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }
      const result = (await response.json()) as UserSettingsResponse;
      return result || null;
    } catch (error) {
      logger.error('❌ Ошибка сохранения пользовательских настроек (LoovIs user settings):', error);
      return null;
    }
  }

  async getManagerByEmployeeId(employeeId: string): Promise<Manager | null> {
    try {
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/manager`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('👔 Получен руководитель через internal API:', result.data);
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения руководителя:', error);
      return null;
    }
  }

  async getTasksForEmployee(employeeId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tasks`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Task> = await response.json();
      logger.info('📋 Получены задачи через internal API:', result.data);
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения задач:', error);
      throw error;
    }
  }

  async getTasksForEmployeeToday(employeeId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tasks?days=1&role=assignee`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Task> = await response.json();
      logger.info('📋 Получены задачи на сегодня через internal API:', result.data);
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения задач на сегодня:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskName: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskName)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try {
            const j = JSON.parse(text);
            details = j?.details || j?.error || text;
          } catch {
            details = text;
          }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        const message = `Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`;
        logger.error(message);
        throw new Error(message);
      }

      const result = await response.json();
      logger.info('✅ Статус задачи обновлен через internal API:', { taskName, taskStatus: status });
      return true;
    } catch (error) {
      logger.error('❌ Ошибка обновления статуса задачи:', error);
      return false;
    }
  }

  async getEmployeesByDepartment(department?: string, limit: number = 10): Promise<Employee[]> {
    try {
      if (!department) {
        return this.getAllEmployees();
      }

      const response = await fetch(`${this.baseUrl}/employees/by-department/${encodeURIComponent(department)}?limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Employee> = await response.json();
      logger.info('👥 Получены сотрудники по департаменту через internal API:', { department, count: result.data.length });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения сотрудников по департаменту:', error);
      throw error;
    }
  }

  async getEmployeesWithExternalIds(): Promise<Array<{ name: string; employee_name: string; custom_itigris_user_id?: string; department?: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/employees-with-external-ids`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Internal API error: ${response.status}`);
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      logger.error('Error fetching employees with external IDs:', error);
      return [];
    }
  }

  async getLeaderDashboardManagerRanking(params: {
    storeIds: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    per_manager?: Record<string, Record<string, {
      fact_value: number;
      plan_value: number;
      forecast_value: number | null;
      loss_or_overperformance: number;
    }>>;
  }> {
    // Use the same BFF proxy as top widgets: /api/top-leader-metrics
    // but request raw Tracker payloads with by_managers=True.
    const metricCodes = [
      'revenue_created',
      'revenue_closed',
      'frames_count',
      'avg_glasses_price',
      'conversion_rate',
      'csi',
      'margin_rate',
    ];

    const url = new URL(window.location.origin + '/api/top-leader-metrics');
    // Keep query param order close to Tracker example:
    // date_from/date_to, store_ids..., metric_codes..., raw, and by_managers at the end.
    (params.storeIds || []).forEach((id) => {
      if (id) url.searchParams.append('store_ids', String(id));
    });
    if (params.dateFrom) url.searchParams.set('date_from', params.dateFrom);
    if (params.dateTo) url.searchParams.set('date_to', params.dateTo);
    metricCodes.forEach((c) => url.searchParams.append('metric_codes', c));
    url.searchParams.set('raw', '1');
    // IMPORTANT: must be last (as in Tracker example)
    url.searchParams.set('by_managers', 'True');

    const response = await fetch(url.pathname + url.search, { method: 'GET', credentials: 'include' });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Manager ranking API error: ${response.status}${details ? ` - ${details}` : ''}`);
    }

    const raw = (await response.json()) as { data?: any[] };
    const payloads = Array.isArray(raw?.data) ? raw.data : [];

    const toNumber = (v: any) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return Number.isFinite(v) ? v : null;
      const n = parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };

    const per_manager: Record<string, Record<string, any>> = {};
    for (const p of payloads) {
      const code = p?.code ? String(p.code) : '';
      if (!code) continue;
      const managers = p?.managers && typeof p.managers === 'object' ? p.managers : {};
      for (const [keyRaw, m] of Object.entries(managers)) {
        const itigrisId = String(keyRaw).trim().replace(/^itigris[-_]/i, '').trim();
        if (!itigrisId) continue;
        if (!per_manager[itigrisId]) per_manager[itigrisId] = {};
        per_manager[itigrisId][code] = {
          fact_value: toNumber((m as any)?.fact_value) ?? 0,
          plan_value: toNumber((m as any)?.plan_value) ?? 0,
          forecast_value: toNumber((m as any)?.forecast_value),
          loss_or_overperformance: toNumber((m as any)?.loss_or_overperformance) ?? 0,
        };
      }
    }

    return { per_manager };
  }

  async searchEmployees(query: string, department?: string, limit: number = 30): Promise<Employee[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (department) params.append('department', department);
      params.append('limit', String(limit));

      const response = await fetch(`${this.baseUrl}/employees/search?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Employee> = await response.json();
      logger.info('🔍 Поиск сотрудников через internal API:', { query, department, count: result.data.length });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка поиска сотрудников:', error);
      throw error;
    }
  }

  async createTask(subject: string, description: string, assigneeId: string, authorId: string): Promise<Task | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          description,
          assigneeId,
          authorId
        })
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try {
            const j = JSON.parse(text);
            details = j?.details || j?.error || text;
          } catch {
            details = text;
          }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        const message = `Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`;
        logger.error(message);
        throw new Error(message);
      }

      const result = await response.json();
      logger.info('✅ Задача создана через internal API:', result.data);
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка создания задачи:', error);
      return null;
    }
  }

  async updateTask(taskName: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try {
            const j = JSON.parse(text);
            details = j?.details || j?.error || text;
          } catch {
            details = text;
          }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        const message = `Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`;
        logger.error(message);
        throw new Error(message);
      }

      const result = await response.json();
      logger.info('✅ Задача обновлена через internal API:', { taskName, updates });
      return true;
    } catch (error) {
      logger.error('❌ Ошибка обновления задачи:', error);
      return false;
    }
  }

  async getTaskByName(taskName: string): Promise<Task | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${encodeURIComponent(taskName)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data as Task;
    } catch (error) {
      logger.error('❌ Ошибка получения задачи по имени:', error);
      return null;
    }
  }

  async getAllTasksForEmployee(
    employeeId: string,
    status: 'all' | 'Open' | 'Completed' = 'all',
    role: 'all' | 'author' | 'assignee' = 'all',
    search: string = ''
  ): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (role !== 'all') params.append('role', role);
      if (search) params.append('search', search);

      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tasks?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result: FrappeResponse<Task> = await response.json();
      logger.info('📋 Получены задачи для сотрудника через internal API:', { 
        employeeId, 
        taskStatus: status, 
        role, 
        search, 
        count: result.data.length 
      });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения задач для сотрудника:', error);
      throw error;
    }
  }


  async updateEmployeeEmail(employeeName: string, email: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ company_email: email })
      });

      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('✅ Email сотрудника обновлен через internal API:', { employeeName, email });
      return true;
    } catch (error) {
      logger.error('❌ Ошибка обновления email сотрудника:', error);
      return false;
    }
  }

  // Метод для получения изображения сотрудника
  getEmployeeImageUrl(employeeId: string): string {
    return `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/image`;
  }

  // Outline API methods
  async getOutlineDocuments(): Promise<OutlineDocument[]> {
    try {
      const response = await fetch('/api/outline/documents', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('📚 Получены документы из Outline через internal API:', { count: result.data?.length || 0 });
      return result.data || [];
    } catch (error) {
      logger.error('❌ Ошибка получения документов из Outline:', error);
      throw error;
    }
  }

  async getOutlineDocument(documentId: string): Promise<OutlineDocument> {
    try {
      const response = await fetch(`/api/outline/documents/${encodeURIComponent(documentId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('📖 Получен документ из Outline через internal API:', { documentId, title: result.data?.title });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения документа из Outline:', error);
      throw error;
    }
  }

  async searchOutlineDocuments(query: string): Promise<OutlineSearchResponse> {
    try {
      const response = await fetch('/api/outline/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query,
          includeArchived: false,
          includeDrafts: false,
        })
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('🔍 Поиск в Outline через internal API:', { 
        query, 
        totalCount: result.data?.totalCount || 0,
        resultsCount: result.data?.results?.length || 0 
      });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка поиска в Outline:', error);
      throw error;
    }
  }

  async getOutlineDocumentContent(documentId: string): Promise<string> {
    try {
      const response = await fetch(`/api/outline/documents/${encodeURIComponent(documentId)}/content`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const content = await response.text();
      logger.info('📄 Получено содержимое документа из Outline через internal API:', { 
        documentId, 
        contentLength: content.length 
      });
      return content;
    } catch (error) {
      logger.error('❌ Ошибка получения содержимого документа из Outline:', error);
      throw error;
    }
  }

  async getOutlineCollections(): Promise<OutlineCollection[]> {
    try {
      const response = await fetch('/api/outline/collections', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('📁 Получены коллекции из Outline через internal API:', { count: result.data?.length || 0 });
      return result.data || [];
    } catch (error) {
      logger.error('❌ Ошибка получения коллекций из Outline:', error);
      throw error;
    }
  }

  async getOutlineCollection(collectionId: string): Promise<OutlineCollection> {
    try {
      const response = await fetch(`/api/outline/collection/${encodeURIComponent(collectionId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result = await response.json();
      logger.info('📁 Получена коллекция из Outline через internal API:', { 
        collectionId, 
        name: result.data?.name 
      });
      return result.data;
    } catch (error) {
      logger.error('❌ Ошибка получения коллекции из Outline:', error);
      throw error;
    }
  }

  async getOutlineCollectionStructure(collectionId: string): Promise<OutlineDocumentStructure[]> {
    try {
      const response = await fetch(`/api/outline/collections/${encodeURIComponent(collectionId)}/documents`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status}`);
      }

      const result: OutlineCollectionStructure = await response.json();
      logger.info('📂 Получена структура коллекции из Outline через internal API:', { 
        collectionId, 
        documentsCount: result.data?.length || 0 
      });
      return result.data || [];
    } catch (error) {
      logger.error('❌ Ошибка получения структуры коллекции из Outline:', error);
      throw error;
    }
  }

  async logout(): Promise<boolean> {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Logout API error: ${response.status}`);
      }

      logger.info('✅ Выход выполнен успешно');
      return true;
    } catch (error) {
      logger.error('❌ Ошибка выхода:', error);
      return false;
    }
  }

  async authenticateTelegram(telegramUser: { username: string; id: number }, employeename: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tg_username: telegramUser.username,
          employeename,
          tg_chat_id: telegramUser.id
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Telegram auth API error: ${response.status}`);
      }

      logger.info('✅ Telegram аутентификация выполнена успешно');
      return true;
    } catch (error) {
      logger.error('❌ Ошибка Telegram аутентификации:', error);
      return false;
    }
  }

  /**
   * Upload profile photo (multipart/form-data, field "file") to internal API.
   * Backend will attach it to Employee.image in Frappe for current user.
   */
  async uploadProfilePhoto(file: File): Promise<{ ok: boolean; employeeId?: string; file_url?: string } | null> {
    try {
      const formData = new FormData();
      const prepared = await normalizeImageForUpload(file);
      formData.append('file', prepared);

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }

      const result = (await response.json()) as { ok: boolean; employeeId?: string; file_url?: string };
      logger.info('✅ Profile photo uploaded via internal API', result);
      return result;
    } catch (error) {
      logger.error('❌ Error uploading profile photo:', error);
      return null;
    }
  }

  async deleteProfilePhoto(): Promise<{ ok: boolean; employeeId?: string } | null> {
    try {
      const response = await fetch('/api/profile/photo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }

      const result = (await response.json()) as { ok: boolean; employeeId?: string };
      logger.info('✅ Profile photo deleted via internal API', result);
      return result;
    } catch (error) {
      logger.error('❌ Error deleting profile photo:', error);
      return null;
    }
  }

  async getProfilePhotos(): Promise<{ ok: boolean; employeeId?: string; items?: Array<{ file_url: string; file_name?: string; creation?: string; name?: string }> } | null> {
    try {
      const response = await fetch('/api/profile/photos', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }

      const result = (await response.json()) as {
        ok: boolean;
        employeeId?: string;
        items?: Array<{ file_url: string; file_name?: string; creation?: string; name?: string }>;
      };
      return result;
    } catch (error) {
      logger.error('❌ Error loading profile photos:', error);
      return null;
    }
  }

  async getEmployeeProfilePhotos(employeeId: string): Promise<{ ok: boolean; employeeId?: string; items?: Array<{ file_url: string; file_name?: string; creation?: string; name?: string }> } | null> {
    try {
      if (!employeeId) return null;
      const response = await fetch(`${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/photos`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }

      const result = (await response.json()) as {
        ok: boolean;
        employeeId?: string;
        items?: Array<{ file_url: string; file_name?: string; creation?: string; name?: string }>;
      };
      return result;
    } catch (error) {
      logger.error('❌ Error loading employee profile photos:', error);
      return null;
    }
  }

  async getAnalyticsDashboard(date: string, employeeId?: string, storeId?: string): Promise<AnalyticsDashboardResponse> {
    // Проверяем кэш
    const cacheKey = getApiCacheKey('dashboards', { date, employeeId, storeId });
    const cached = getFromApiCache<AnalyticsDashboardResponse>(cacheKey);
    if (cached !== undefined) {
      logger.debug('📊 Аналитика дашборда из кэша');
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (employeeId) params.append('employee_id', employeeId);
      if (storeId) params.append('store_id', storeId);

      const url = `/api/dashboards?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const result = await response.json();

      // Сохраняем в кэш
      setInApiCache(cacheKey, result);

      logger.info('📊 Получены данные аналитики дашборда через internal API:', {
        date,
        employeeId,
        storeId,
        keys: Object.keys(result || {}),
      });
      return result;
    } catch (error) {
      logger.error('❌ Ошибка получения аналитики дашборда:', error);
      throw error;
    }
  }

  async getUnclosedOrders(employeeId?: string, storeId?: string): Promise<UnclosedOrdersResponse> {
    // Проверяем кэш
    const cacheKey = getApiCacheKey('unclosed_orders', { employeeId, storeId });
    const cached = getFromApiCache<UnclosedOrdersResponse>(cacheKey);
    if (cached !== undefined) {
      logger.debug('📦 Незакрытые заказы из кэша');
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (employeeId) params.append('employee_id', employeeId);
      if (storeId) params.append('store_id', storeId);

      const url = `/api/unclosed-orders?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const result: UnclosedOrdersResponse = await response.json();

      // Сохраняем в кэш
      setInApiCache(cacheKey, result);

      logger.info('📦 Получены незакрытые заказы через internal API:', {
        employeeId,
        storeId,
        total: result.count,
      });
      return result;
    } catch (error) {
      logger.error('❌ Ошибка получения незакрытых заказов:', error);
      throw error;
    }
  }

  async getFeedbacks(params: { employeeIds: string[]; fromDate: string; toDate: string }): Promise<FeedbacksResponse> {
    // Проверяем кэш
    const cacheKey = getApiCacheKey('feedbacks', {
      employeeIds: params.employeeIds,
      fromDate: params.fromDate,
      toDate: params.toDate
    });
    const cached = getFromApiCache<FeedbacksResponse>(cacheKey);
    if (cached !== undefined) {
      logger.debug('📝 Отзывы из кэша');
      return cached;
    }

    try {
      const url = new URL(window.location.origin + '/api/feedbacks');
      // Множественные employee_ids
      params.employeeIds.forEach(id => url.searchParams.append('employee_ids', id));
      url.searchParams.append('from_date', params.fromDate);
      url.searchParams.append('to_date', params.toDate);

      const response = await fetch(url.pathname + url.search, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Feedbacks API error: ${response.status}`);
      }

      const result: FeedbacksResponse = await response.json();

      // Сохраняем в кэш
      setInApiCache(cacheKey, result);

      logger.info('📝 Получены отзывы через internal API:', {
        count: Array.isArray(result?.data) ? result.data.length : undefined,
        from: result?.from_date || params.fromDate,
        to: result?.to_date || params.toDate,
        employeeIds: params.employeeIds
      });
      return result;
    } catch (error) {
      logger.error('❌ Ошибка получения отзывов:', error);
      throw error;
    }
  }

  // === Custom Forms ===
  /**
   * Submit green modal form payload to backend
   */
  async submitGreenForm(payload: { employee_id?: string; name?: string; phone?: string; message?: string }): Promise<boolean> {
    try {
      const response = await fetch(`/api/forms/green`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Forms API error: ${response.status}`);
      }
      const result = await response.json().catch(() => ({}));
      logger.info('✅ Green form submitted via internal API', { ok: true, result });
      return true;
    } catch (error) {
      logger.error('❌ Error submitting green form:', error);
      return false;
    }
  }

  /**
   * Create issue in Yandex Tracker via internal API
   */
  async submitYandexFeedback(params: { anonymous: boolean; feedbackText: string; departmentText?: string; companyEmail?: string }): Promise<{ key?: string; id?: string } | null> {
    try {
      const response = await fetch(`/api/forms/green-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...params,
          followers: 'tb'
        })
      });
      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }
      const result = await response.json();
      logger.info('✅ Yandex Tracker issue created via internal API', { key: result?.key, id: result?.id });
      return { key: result?.key, id: result?.id };
    } catch (error) {
      logger.error('❌ Error creating Yandex Tracker issue:', error);
      return null;
    }
  }

  // === KB Bookmarks (via internal API proxy to Frappe) ===
  async getKbBookmarks(employeeId: string): Promise<Array<{ name?: string; article_id: string; title?: string | null; updated_at?: string | null }>> {
    try {
      const params = new URLSearchParams({ employee: employeeId });
      const response = await fetch(`/api/kb/bookmarks?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Internal API error: ${response.status}`);
      }
      const result = await response.json();
      const items = Array.isArray(result?.items) ? result.items : [];
      logger.info('📚 Получены закладки (Frappe):', { count: items.length, employeeId });
      return items;
    } catch (error) {
      logger.error('❌ Ошибка получения закладок:', error);
      return [];
    }
  }

  async setKbBookmark(params: { employeeId: string; articleId: string; bookmarked: boolean; title?: string }): Promise<{ ok: boolean; article_id?: string; bookmarked?: number; updated_at?: string } | null> {
    try {
      const response = await fetch(`/api/kb/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employee: params.employeeId,
          article_id: params.articleId,
          bookmarked: params.bookmarked ? 1 : 0,
          ...(params.bookmarked && params.title ? { title: params.title } : {}),
        })
      });
      if (!response.ok) {
        let details: string | undefined;
        try {
          const text = await response.text();
          try { details = JSON.parse(text)?.details || text; } catch { details = text; }
        } catch (e) {
          ignoreError(e);
          details = undefined;
        }
        throw new Error(`Internal API error: ${response.status}${details ? ` - ${String(details).slice(0,300)}` : ''}`);
      }
      const result = await response.json();
      logger.info('✅ Закладка обновлена (Frappe):', result);
      return result as { ok: boolean; article_id?: string; bookmarked?: number; updated_at?: string } | null;
    } catch (error) {
      logger.error('❌ Ошибка установки закладки:', error);
      return null;
    }
  }
  // === KB Providers ===
  async getKbProviders(): Promise<KbProvidersResponse> {
    const res = await fetch('/api/kb/providers', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async saveKbProvider(type: string, config: Partial<KbProviderConfig>): Promise<{ ok: boolean }> {
    const res = await fetch(`/api/kb/providers/${encodeURIComponent(type)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async testKbProvider(type: string, config?: Partial<KbProviderConfig>): Promise<KbTestResult> {
    const res = await fetch(`/api/kb/providers/${encodeURIComponent(type)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config || {}),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async previewKbImport(files: File[]): Promise<KbImportPreviewResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await fetch('/api/kb/articles/import/preview', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async importKbArticles(files: File[], collectionId: string): Promise<KbImportResult> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('collectionId', collectionId);
    const res = await fetch('/api/kb/articles/import', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getKbCollections(): Promise<KbCollection[]> {
    const res = await fetch('/api/kb/collections', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getKbArticles(collectionId?: string): Promise<KbArticle[]> {
    const params = new URLSearchParams();
    if (collectionId) params.set('collectionId', collectionId);
    const res = await fetch(`/api/kb/articles?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getKbArticle(id: string): Promise<KbArticle | null> {
    const res = await fetch(`/api/kb/articles/${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || null;
  }

  async updateKbArticle(id: string, data: { title?: string; content?: string; published?: number }): Promise<KbArticle | null> {
    const res = await fetch(`/api/kb/articles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || null;
  }

  async createKbArticle(data: { title: string; content?: string; published?: number; collectionId: string }): Promise<KbArticle | null> {
    const res = await fetch('/api/kb/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || null;
  }

  async deleteKbArticle(id: string): Promise<void> {
    const res = await fetch(`/api/kb/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async getAdminIntegrations() {
    const res = await fetch('/api/admin/integrations', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getOrgConfig(): Promise<{ orgDataSource: string; frappeConfigured: boolean; databaseConfigured: boolean }> {
    const res = await fetch('/api/admin/org/config', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async setOrgConfig(orgDataSource: string): Promise<{ orgDataSource: string; previous: string }> {
    const res = await fetch('/api/admin/org/config', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgDataSource }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async triggerFrappeSync(): Promise<any> {
    const res = await fetch('/api/admin/sync/frappe', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getSyncStatus(): Promise<any> {
    const res = await fetch('/api/admin/sync/status', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getDesignations(): Promise<Array<{ name: string }>> {
    const res = await fetch('/api/admin/designations', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getDepartments(): Promise<Array<{ name: string; department_name?: string; custom_store_id?: string; parent_department?: string }>> {
    const res = await fetch('/api/admin/departments', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getTelegramWebhookInfo(): Promise<{ ok: boolean; result?: { url?: string; pending_update_count?: number; last_error_date?: number; last_error_message?: string } }> {
    const res = await fetch('/api/telegram/get-webhook', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // === Dashboard Metrics Config ===
  async getDashboardMetrics(): Promise<DashboardMetricConfig[]> {
    const res = await fetch('/api/admin/dashboard-metrics', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.metrics || [];
  }

  async createDashboardMetric(data: Partial<DashboardMetricConfig>): Promise<DashboardMetricConfig> {
    const res = await fetch('/api/admin/dashboard-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.metric;
  }

  async updateDashboardMetric(id: string, data: Partial<DashboardMetricConfig>): Promise<DashboardMetricConfig> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.metric;
  }

  async deleteDashboardMetric(id: string): Promise<void> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async reorderDashboardMetrics(ids: string[]): Promise<void> {
    const res = await fetch('/api/admin/dashboard-metrics/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async getManualData(metricId: string): Promise<ManualDataEntry[]> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(metricId)}/manual-data`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async saveManualData(metricId: string, entry: ManualDataEntry): Promise<ManualDataEntry> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(metricId)}/manual-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.entry;
  }

  async saveBulkManualData(metricId: string, entries: ManualDataEntry[]): Promise<void> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(metricId)}/manual-data/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async getDailyFacts(date: string, storeId?: string): Promise<{ facts: Record<string, { fact: number }>; monthTotals: Record<string, number> }> {
    const params = new URLSearchParams({ date });
    if (storeId) params.set('storeId', storeId);
    const res = await fetch(`/api/admin/dashboard-metrics/daily-facts?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async saveDailyFacts(date: string, storeId: string, entries: { metricId: string; fact: number }[]): Promise<void> {
    const res = await fetch('/api/admin/dashboard-metrics/daily-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date, storeId, entries }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async getFactHistory(storeId?: string, days = 14): Promise<FactHistoryResponse> {
    const params = new URLSearchParams({ days: String(days) });
    if (storeId) params.set('storeId', storeId);
    const res = await fetch(`/api/admin/dashboard-metrics/fact-history?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getFactsOverview(date: string, storeIds: string[]): Promise<FactsOverviewResponse> {
    const params = new URLSearchParams({ date, storeIds: storeIds.join(',') });
    const res = await fetch(`/api/admin/dashboard-metrics/facts-overview?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async deleteManualData(metricId: string, period: string, storeId?: string): Promise<void> {
    const res = await fetch(`/api/admin/dashboard-metrics/${encodeURIComponent(metricId)}/manual-data`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ period, storeId: storeId || '' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  // === Metric Plans ===

  async getMetricPlans(metricId?: string): Promise<MetricPlan[]> {
    const url = metricId
      ? `/api/admin/metric-plans?metricId=${encodeURIComponent(metricId)}`
      : '/api/admin/metric-plans';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.plans || [];
  }

  async createMetricPlan(data: Partial<MetricPlan>): Promise<MetricPlan> {
    const res = await fetch('/api/admin/metric-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.plan;
  }

  async updateMetricPlan(id: string, data: Partial<MetricPlan>): Promise<MetricPlan> {
    const res = await fetch(`/api/admin/metric-plans/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.plan;
  }

  async deleteMetricPlan(id: string): Promise<void> {
    const res = await fetch(`/api/admin/metric-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async bulkCreateMetricPlans(entries: Partial<MetricPlan>[]): Promise<{ created: number; updated: number }> {
    const res = await fetch('/api/admin/metric-plans/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getMetricPlansMatrix(metricId: string, period?: string): Promise<MetricPlan[]> {
    let url = `/api/admin/metric-plans/matrix?metricId=${encodeURIComponent(metricId)}`;
    if (period) url += `&period=${encodeURIComponent(period)}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.plans || [];
  }

  // === Data Sources ===

  async getDataSources(): Promise<DataSourcesResponse> {
    const res = await fetch('/api/admin/data-sources', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async createDataSource(data: Partial<DataSourceConfig>): Promise<DataSourceConfig> {
    const res = await fetch('/api/admin/data-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.source;
  }

  async updateDataSource(id: string, data: Partial<DataSourceConfig>): Promise<DataSourceConfig> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.source;
  }

  async deleteDataSource(id: string): Promise<void> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async testDataSource(id: string): Promise<DataSourceTestResult> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(id)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async testDataSourceInline(config: Partial<DataSourceConfig>): Promise<DataSourceTestResult> {
    const res = await fetch('/api/admin/data-sources/test-inline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async discoverDataSourceMetrics(sourceId: string): Promise<MetricCatalogResponse> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(sourceId)}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async testMetricExtraction(data: MetricExtractionTestRequest): Promise<MetricExtractionTestResult> {
    const res = await fetch('/api/admin/data-sources/test-extraction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async testDataSourceRequest(
    id: string,
    path?: string,
    method?: string,
    queryParams?: Record<string, string>,
  ): Promise<DataSourceRequestResult> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(id)}/test-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path, method, queryParams }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // === Motivation Configs ===

  async getMotivationConfigs(): Promise<Record<string, MotivationBranchPositionConfig>> {
    const res = await fetch('/api/admin/motivation-configs', { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.configs || {};
  }

  async createMotivationConfig(config: MotivationBranchPositionConfig): Promise<MotivationBranchPositionConfig> {
    const res = await fetch('/api/admin/motivation-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.config;
  }

  async updateMotivationConfig(key: string, config: MotivationBranchPositionConfig): Promise<MotivationBranchPositionConfig> {
    const res = await fetch(`/api/admin/motivation-configs/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.config;
  }

  async deleteMotivationConfig(key: string): Promise<void> {
    const res = await fetch(`/api/admin/motivation-configs/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
  }

  async getMotivationMetricValues(metricIds: string[], storeId: string, scope?: 'employee' | 'branch', period?: string): Promise<Record<string, { fact: number; plan: number; percent: number }>> {
    const params = new URLSearchParams();
    params.set('metricIds', metricIds.join(','));
    if (scope === 'employee') {
      params.set('scope', 'employee');
    } else {
      params.set('storeId', storeId);
    }
    if (period) params.set('period', period);
    const res = await fetch(`/api/motivation/metric-values?${params}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.values;
  }

  /** Fetch metric values for multiple branches in parallel */
  async getMetricValuesForBranches(
    metricIds: string[],
    storeIds: string[],
    period: string,
  ): Promise<Record<string, Record<string, { fact: number; plan: number; percent: number }>>> {
    const results = await Promise.all(
      storeIds.map(async (sid) => {
        try {
          const values = await this.getMotivationMetricValues(metricIds, sid, undefined, period);
          return { storeId: sid, values };
        } catch {
          return { storeId: sid, values: {} as Record<string, { fact: number; plan: number; percent: number }> };
        }
      }),
    );
    const out: Record<string, Record<string, { fact: number; plan: number; percent: number }>> = {};
    for (const { storeId, values } of results) {
      out[storeId] = values;
    }
    return out;
  }

  /** Fetch per-manager plan/fact breakdown for a branch */
  async getManagerBreakdown(
    branchId: string,
    period: string,
    metricIds: string[],
  ): Promise<{
    byMetric: Record<string, { managers: Array<{
      employee_id: string;
      employee_name: string;
      category: string;
      plan: number | null;
      fact: number | null;
      percent: number | null;
    }> }>;
    period: string;
    branchId: string;
  }> {
    const params = new URLSearchParams({ branchId, period, metricIds: metricIds.join(',') });
    const res = await fetch(`/api/motivation/manager-breakdown?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ── Org Structure: tree ──

  async getOrgTree(): Promise<OrgTreeResponse> {
    const res = await fetch('/api/admin/org/tree', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ── Org Structure: department CRUD ──

  async createDepartment(data: CreateDepartmentParams): Promise<AdminDepartment> {
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  async updateDepartment(id: string, data: UpdateDepartmentParams): Promise<AdminDepartment> {
    const res = await fetch(`/api/admin/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  async deleteDepartment(id: string): Promise<void> {
    const res = await fetch(`/api/admin/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
  }

  // ── Org Structure: employee CRUD ──

  async createAdminEmployee(data: CreateEmployeeParams): Promise<AdminEmployee> {
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  async updateAdminEmployee(id: string, data: UpdateEmployeeParams): Promise<AdminEmployee> {
    const res = await fetch(`/api/admin/employees/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  async deleteAdminEmployee(id: string): Promise<void> {
    const res = await fetch(`/api/admin/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
  }

  // --- Metric time-series (grouped data) ---

  async getMetricSeries(metricId: string, params: { date_from: string; date_to: string; group_by?: string; store_ids?: string[] }): Promise<{ metricId: string; groupBy: string; series: Array<{ period: string; fact: number; plan: number }> }> {
    const qs = new URLSearchParams();
    qs.set('date_from', params.date_from);
    qs.set('date_to', params.date_to);
    if (params.group_by) qs.set('group_by', params.group_by);
    params.store_ids?.forEach(id => qs.append('store_ids', id));
    const res = await fetch(`/api/top-leader-metrics/${encodeURIComponent(metricId)}/series?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.details || body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // --- Salary config ---

  async getSalaryConfigs(): Promise<Record<string, unknown>> {
    const res = await fetch('/api/salary/configs', { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.configs || {};
  }

  async updateSalaryConfig(key: string, config: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/salary/configs/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.ok;
  }

  async deleteSalaryConfig(key: string): Promise<boolean> {
    const res = await fetch(`/api/salary/configs/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.ok;
  }

  // ============= Salary Admin Sessions =============

  async getSalarySessions(): Promise<any[]> {
    try {
      const response = await fetch('/api/admin/salary/sessions', { credentials: 'include' });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const result = await response.json();
      return result?.data ?? [];
    } catch (error) {
      logger.error('Error fetching salary sessions:', error);
      return [];
    }
  }

  async getSalarySession(id: string): Promise<any | null> {
    try {
      const response = await fetch(`/api/admin/salary/sessions/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const result = await response.json();
      return result?.data ?? null;
    } catch (error) {
      logger.error('Error fetching salary session:', error);
      return null;
    }
  }

  async saveSalarySession(data: Record<string, unknown>): Promise<any | null> {
    try {
      const response = await fetch('/api/admin/salary/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const result = await response.json();
      return result?.data ?? null;
    } catch (error) {
      logger.error('Error saving salary session:', error);
      return null;
    }
  }

  async deleteSalarySession(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/admin/salary/sessions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return response.ok;
    } catch (error) {
      logger.error('Error deleting salary session:', error);
      return false;
    }
  }

  // ============= Aggregation Engine =============

  async getMetricAggregate(params: {
    metricIds: string[];
    dateFrom: string;
    dateTo: string;
    groupBy?: 'day' | 'week' | 'dekada' | 'month' | 'quarter' | 'year' | 'client';
    branchIds?: string[];
    employeeIds?: string[];
    clientIds?: string[];
  }): Promise<{ data: Array<{ metricId: string; metricType: string; groupBy: string; series: Array<{ period: string; fact: number; plan: number | null; sampleCount: number; clientName?: string }> }> }> {
    const qs = new URLSearchParams();
    qs.set('date_from', params.dateFrom);
    qs.set('date_to', params.dateTo);
    if (params.groupBy) qs.set('group_by', params.groupBy);
    params.metricIds.forEach(id => qs.append('metric_ids', id));
    params.branchIds?.forEach(id => qs.append('branch_ids', id));
    params.employeeIds?.forEach(id => qs.append('employee_ids', id));
    params.clientIds?.forEach(id => qs.append('client_ids', id));

    const res = await fetch(`/api/metrics/aggregate?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ============= Dynamic Plan =============

  async getDynamicPlan(metricId: string, params?: {
    branchId?: string;
    employeeId?: string;
    period?: string;
  }): Promise<{
    metricId: string;
    period: string;
    planValue: number;
    factSoFar?: number;
    metricType: string;
    dailyPlan: number;
    remainingDays: number | null;
    remainingPlan: number | null;
    completionPercent: number | null;
  } | null> {
    const qs = new URLSearchParams();
    if (params?.branchId) qs.set('branch_id', params.branchId);
    if (params?.employeeId) qs.set('employee_id', params.employeeId);
    if (params?.period) qs.set('period', params.period);

    const res = await fetch(`/api/metrics/${encodeURIComponent(metricId)}/dynamic-plan?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 404) return null;
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  // ============= Client Dimension =============

  async searchClients(params?: { q?: string; branchId?: string; limit?: number }): Promise<Array<{ id: string; externalId: string; name: string; branchId: string; employeeId: string; clientType: string; sourceId: string }>> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.branchId) qs.set('branch_id', params.branchId);
    if (params?.limit) qs.set('limit', String(params.limit));

    const res = await fetch(`/api/admin/clients/search?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data || [];
  }

  async getClients(params?: { limit?: number; offset?: number }): Promise<{ data: Array<{ id: string; externalId: string; name: string; branchId: string; employeeId: string; clientType: string; sourceId: string; createdAt: string }>; total: number }> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));

    const res = await fetch(`/api/admin/clients?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ============= Events =============

  async getEvents(params?: {
    sourceId?: string;
    eventType?: string;
    branchId?: string;
    employeeId?: string;
    clientId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.sourceId) qs.set('source_id', params.sourceId);
    if (params?.eventType) qs.set('event_type', params.eventType);
    if (params?.branchId) qs.set('branch_id', params.branchId);
    if (params?.employeeId) qs.set('employee_id', params.employeeId);
    if (params?.clientId) qs.set('client_id', params.clientId);
    if (params?.dateFrom) qs.set('date_from', params.dateFrom);
    if (params?.dateTo) qs.set('date_to', params.dateTo);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));

    const res = await fetch(`/api/admin/events?${qs}`, { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async submitEvents(sourceId: string, events: Array<{
    eventType: string;
    eventTime: string;
    externalId?: string;
    branchId?: string;
    employeeId?: string;
    clientId?: string;
    metricValues: Record<string, number>;
  }>): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sourceId, events }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async getEventTypes(): Promise<Array<{ id: string; name: string; description: string }>> {
    const res = await fetch('/api/admin/event-types', { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data || [];
  }

  // ============= CRM Adapters =============

  async getAdapters(): Promise<Array<{ id: string; name: string; builtIn: boolean; supportedEvents: string[]; description?: string; version?: string; aiGenerated?: boolean }>> {
    const res = await fetch('/api/admin/adapters', { credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data || [];
  }

  async saveAdapter(data: {
    id: string;
    name: string;
    description?: string;
    version?: string;
    supportedEvents?: string[];
    adapterCode?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
  }): Promise<any> {
    const res = await fetch('/api/admin/adapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    return result.data;
  }

  async deleteAdapter(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/adapters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return true;
  }

  async pollDataSource(sourceId: string): Promise<{ events: number; inserted: number; duplicates: number; errors: string[] }> {
    const res = await fetch(`/api/admin/data-sources/${encodeURIComponent(sourceId)}/poll`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ============= Analytics (Materialized Views) =============

  async getMonthlyByBranch(metricId: string, params?: {
    branchIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<{ monthKey: string; branchId: string; factValue: number; sampleCount: number; dayCount: number; metricType: string }>> {
    const qs = new URLSearchParams();
    qs.set('metric_id', metricId);
    params?.branchIds?.forEach(id => qs.append('branch_ids', id));
    if (params?.dateFrom) qs.set('date_from', params.dateFrom);
    if (params?.dateTo) qs.set('date_to', params.dateTo);

    const res = await fetch(`/api/analytics/monthly-by-branch?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getMonthlyByEmployee(metricId: string, params?: {
    employeeIds?: string[];
    branchIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<{ monthKey: string; employeeId: string; branchId: string; factValue: number; sampleCount: number; dayCount: number; metricType: string }>> {
    const qs = new URLSearchParams();
    qs.set('metric_id', metricId);
    params?.employeeIds?.forEach(id => qs.append('employee_ids', id));
    params?.branchIds?.forEach(id => qs.append('branch_ids', id));
    if (params?.dateFrom) qs.set('date_from', params.dateFrom);
    if (params?.dateTo) qs.set('date_to', params.dateTo);

    const res = await fetch(`/api/analytics/monthly-by-employee?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getDailyEvents(params?: {
    eventType?: string;
    branchIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<{ eventType: string; branchId: string; eventDate: string; eventCount: number; totalRevenue: number; totalItems: number }>> {
    const qs = new URLSearchParams();
    if (params?.eventType) qs.set('event_type', params.eventType);
    params?.branchIds?.forEach(id => qs.append('branch_ids', id));
    if (params?.dateFrom) qs.set('date_from', params.dateFrom);
    if (params?.dateTo) qs.set('date_to', params.dateTo);

    const res = await fetch(`/api/analytics/daily-events?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async getViewRefreshStatus(): Promise<Array<{ viewName: string; label: string; lastRefresh: string; durationMs: number }>> {
    const res = await fetch('/api/admin/analytics/views', { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  async refreshViews(): Promise<Array<{ viewName: string; durationMs: number; success: boolean }>> {
    const res = await fetch('/api/admin/analytics/views/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data || [];
  }

  // ============= Export =============

  async exportMetricsCsv(params: {
    metricIds: string[];
    dateFrom: string;
    dateTo: string;
    groupBy?: string;
    branchIds?: string[];
    employeeIds?: string[];
    clientIds?: string[];
  }): Promise<Blob> {
    const qs = new URLSearchParams();
    params.metricIds.forEach(id => qs.append('metric_ids', id));
    qs.set('date_from', params.dateFrom);
    qs.set('date_to', params.dateTo);
    if (params.groupBy) qs.set('group_by', params.groupBy);
    if (params.branchIds?.length) qs.set('branch_ids', params.branchIds.join(','));
    if (params.employeeIds?.length) qs.set('employee_ids', params.employeeIds.join(','));
    if (params.clientIds?.length) qs.set('client_ids', params.clientIds.join(','));

    const res = await fetch(`/api/export/metrics?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  async exportEventsCsv(params?: {
    sourceId?: string;
    eventType?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<Blob> {
    const qs = new URLSearchParams();
    if (params?.sourceId) qs.set('source_id', params.sourceId);
    if (params?.eventType) qs.set('event_type', params.eventType);
    if (params?.branchId) qs.set('branch_id', params.branchId);
    if (params?.dateFrom) qs.set('date_from', params.dateFrom);
    if (params?.dateTo) qs.set('date_to', params.dateTo);
    if (params?.limit) qs.set('limit', String(params.limit));

    const res = await fetch(`/api/export/events?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  async exportMonthlyReport(params: {
    period: string;
    metricIds?: string[];
    branchIds?: string[];
  }): Promise<Blob> {
    const qs = new URLSearchParams();
    qs.set('period', params.period);
    if (params.metricIds?.length) qs.set('metric_ids', params.metricIds.join(','));
    if (params.branchIds?.length) qs.set('branch_ids', params.branchIds.join(','));

    const res = await fetch(`/api/export/monthly-report?${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  }

  /** Trigger download of a Blob as a file */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Shift Schedule ───

  async getShiftSchedule(branchId: string, month: string) {
    const response = await fetch(`/api/shift-schedule?branch_id=${encodeURIComponent(branchId)}&month=${encodeURIComponent(month)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Shift schedule error: ${response.status}`);
    return response.json();
  }

  async upsertShiftEntry(entry: { employee_id: string; branch_id: string; date: string; shift_type: string; shift_number?: number | null; time_start?: string | null; time_end?: string | null; note?: string }) {
    const response = await fetch('/api/shift-schedule/entry', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error(`Upsert shift entry error: ${response.status}`);
    return response.json();
  }

  async bulkUpsertShiftEntries(entries: Array<{ employee_id: string; branch_id: string; date: string; shift_type: string; shift_number?: number | null; time_start?: string | null; time_end?: string | null }>) {
    const response = await fetch('/api/shift-schedule/bulk', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!response.ok) throw new Error(`Bulk upsert error: ${response.status}`);
    return response.json();
  }

  async deleteShiftEntry(employeeId: string, date: string) {
    const response = await fetch(`/api/shift-schedule/entry?employee_id=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Delete shift entry error: ${response.status}`);
    return response.json();
  }

  async getShiftTemplates(branchId?: string) {
    const params = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    const response = await fetch(`/api/shift-schedule/templates${params}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Get templates error: ${response.status}`);
    return response.json();
  }

  async createShiftTemplate(template: { name: string; pattern_type: string; cycle_days: Array<{ shift_type: string; shift_number?: number; time_start?: string; time_end?: string }>; branch_id?: string | null }) {
    const response = await fetch('/api/shift-schedule/templates', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!response.ok) throw new Error(`Create template error: ${response.status}`);
    return response.json();
  }

  async deleteShiftTemplate(id: string) {
    const response = await fetch(`/api/shift-schedule/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Delete template error: ${response.status}`);
    return response.json();
  }

  async autoFillShift(params: { employee_id: string; branch_id: string; month: string; template_id: string; start_offset?: number; preserve_special?: boolean }) {
    const response = await fetch('/api/shift-schedule/auto-fill', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Auto-fill error: ${response.status}`);
    return response.json();
  }

  async copyShiftWeek(params: { branch_id: string; employee_id?: string; source_start: string; target_start: string }) {
    const response = await fetch('/api/shift-schedule/copy-week', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Copy week error: ${response.status}`);
    return response.json();
  }

  // ─── Staffing Requirements ───

  async getStaffingRequirements(branchId: string) {
    const response = await fetch(`/api/shift-schedule/requirements?branch_id=${encodeURIComponent(branchId)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Get requirements error: ${response.status}`);
    return response.json();
  }

  async upsertStaffingRequirement(params: { branch_id: string; designation: string; day_of_week: number | null; required_count: number }) {
    const response = await fetch('/api/shift-schedule/requirements', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error(`Upsert requirement error: ${response.status}`);
    return response.json();
  }

  async deleteStaffingRequirement(id: string) {
    const response = await fetch(`/api/shift-schedule/requirements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Delete requirement error: ${response.status}`);
    return response.json();
  }
}

export const internalApiClient = new InternalApiClient();
export type { Employee, Manager, Task, WikiPage, TaskDraft, OutlineDocument, OutlineSearchResult, OutlineSearchResponse, OutlineCollection, OutlineDocumentStructure, AnalyticsDashboardResponse, AnalyticsDashboardData, UnclosedOrdersResponse, KbProviderConfig, KbProviderInfo, KbProvidersResponse, KbTestResult, KbImportPreviewFile, KbImportPreviewResponse, KbImportResult, KbArticle };