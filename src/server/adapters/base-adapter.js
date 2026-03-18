/**
 * Base CRM Adapter — provides default implementations and shared utilities.
 *
 * All concrete adapters extend this class and override the methods they support.
 * Implements the CRMAdapter interface from types.ts.
 */

export class BaseAdapter {
  /** @type {string} */
  adapterType = 'base';
  /** @type {string} */
  name = 'Base Adapter';
  /** @type {string[]} */
  supportedEvents = [];

  /** @type {import('./types').DataSourceConfig | null} */
  _dataSource = null;

  /**
   * Initialize the adapter with data source config.
   * @param {import('./types').DataSourceConfig} dataSource
   */
  async initialize(dataSource) {
    this._dataSource = dataSource;
  }

  /**
   * Transform webhook payload into standard events.
   * Override in subclasses.
   * @param {unknown} rawPayload
   * @param {Record<string, string>} headers
   * @returns {Promise<import('./types').IncomingEvent[]>}
   */
  async transformWebhook(rawPayload, headers) {
    return [];
  }

  /**
   * Poll data source for new data.
   * Override in subclasses.
   * @param {import('./types').DataSourceConfig} dataSource
   * @param {Date | null} lastPollAt
   * @returns {Promise<import('./types').IncomingEvent[]>}
   */
  async poll(dataSource, lastPollAt) {
    return [];
  }

  /**
   * Validate webhook authenticity.
   * Default: compare x-webhook-secret header with configured secret.
   * @param {unknown} rawPayload
   * @param {Record<string, string>} headers
   * @param {string} secret
   * @returns {boolean}
   */
  validateWebhook(rawPayload, headers, secret) {
    if (!secret) return true;
    const provided = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
    return provided === secret;
  }

  /**
   * Discover available metrics/entities.
   * Override in subclasses.
   * @param {import('./types').DataSourceConfig} dataSource
   * @returns {Promise<import('./types').DiscoveryResult>}
   */
  async discover(dataSource) {
    return { categories: [] };
  }

  // ==================== Shared Utilities ====================

  /**
   * Create a template ID.
   * @param {string} sourceId
   * @param {string} suffix
   */
  templateId(sourceId, suffix) {
    return `${sourceId}_${suffix}`;
  }

  /**
   * Build a standard metric template object.
   * @param {string} sourceId
   * @param {string} suffix
   * @param {string} name
   * @param {string} description
   * @param {object} config
   * @returns {import('./types').MetricTemplate}
   */
  makeTemplate(sourceId, suffix, name, description, config = {}) {
    return {
      templateId: this.templateId(sourceId, suffix),
      name,
      description,
      previewValue: config.previewValue ?? null,
      config: {
        unit: '',
        widgetType: 'kpi_forecast',
        forecastLabel: 'forecast',
        forecastUnit: '%',
        metricType: 'absolute',
        valueType: 'count',
        ...config,
      },
    };
  }

  /**
   * Safe number parse.
   * @param {*} v
   * @returns {number}
   */
  toNumber(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
}
