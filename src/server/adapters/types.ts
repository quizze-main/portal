/**
 * CRM Adapter Interface Definitions.
 *
 * These types define the contract for all CRM/data source adapters.
 * Used as documentation and for AI-generated adapter validation.
 */

/** Standard event format produced by all adapters */
export interface IncomingEvent {
  /** Event type from event_types registry (e.g. 'order_created', 'order_closed') */
  eventType: string;
  /** ISO 8601 timestamp of when the business event occurred */
  eventTime: string;
  /** External ID for deduplication (e.g. CRM deal ID) */
  externalId?: string;
  /** Branch dimension */
  branchId?: string;
  /** Employee dimension */
  employeeId?: string;
  /** Client dimension */
  clientId?: string;
  /** Metric values extracted from this event */
  metricValues: Record<string, number>;
  /** Full original payload for replay/debugging */
  rawPayload?: unknown;
}

/** Result of CRM API discovery — what metrics/entities are available */
export interface DiscoveryResult {
  categories: DiscoveryCategory[];
}

export interface DiscoveryCategory {
  id: string;
  name: string;
  description?: string;
  templates: MetricTemplate[];
}

export interface MetricTemplate {
  templateId: string;
  name: string;
  description: string;
  previewValue?: number | null;
  config: Record<string, unknown>;
}

/** Data source configuration passed to adapters */
export interface DataSourceConfig {
  id: string;
  label: string;
  baseUrl: string;
  authType: string;
  authConfig: Record<string, string>;
  paginationType?: string;
  paginationConfig?: Record<string, unknown>;
  healthCheckPath?: string;
  timeout?: number;
  enabled: boolean;
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
  webhookSecret?: string;
  pollIntervalS?: number;
  lastPollAt?: string;
  fieldMappings?: Array<Record<string, unknown>>;
}

/** The CRM adapter contract. All adapters must implement these methods. */
export interface CRMAdapter {
  /** Unique adapter type identifier (e.g. 'amocrm', 'tracker', 'custom') */
  readonly adapterType: string;
  /** Human-readable adapter name */
  readonly name: string;
  /** Event types this adapter can produce */
  readonly supportedEvents: string[];

  /** Initialize adapter with data source configuration */
  initialize(dataSource: DataSourceConfig): Promise<void>;

  /** Transform incoming webhook payload into standard events */
  transformWebhook(rawPayload: unknown, headers: Record<string, string>): Promise<IncomingEvent[]>;

  /** Poll CRM for new data since last poll */
  poll(dataSource: DataSourceConfig, lastPollAt: Date | null): Promise<IncomingEvent[]>;

  /** Verify webhook authenticity */
  validateWebhook(rawPayload: unknown, headers: Record<string, string>, secret: string): boolean;

  /** Discover available metrics/entities in the CRM */
  discover(dataSource: DataSourceConfig): Promise<DiscoveryResult>;
}

/** Adapter registry entry (stored in adapter_registry table) */
export interface AdapterRegistryEntry {
  id: string;
  name: string;
  description?: string;
  version: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  supportedEvents: string[];
  defaultMappings?: Record<string, unknown>;
  adapterCode?: string;
  aiGenerated: boolean;
  aiPrompt?: string;
}
