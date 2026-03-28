/**
 * OverBrain Tracker Adapter — discovery and polling for the internal Tracker API.
 *
 * Refactored from source-discovery.js Tracker discovery logic.
 */

import { BaseAdapter } from './base-adapter.js';

const TRACKER_CODES = [
  { code: 'revenue_created', name: 'Выручка СЗ', unit: '₽', wt: 'kpi_forecast', mt: 'absolute', vt: 'currency' },
  { code: 'revenue_closed', name: 'Выручка ЗЗ', unit: '₽', wt: 'kpi_forecast', mt: 'absolute', vt: 'currency' },
  { code: 'frames_count', name: 'Кол-во ФЛ', unit: 'шт', wt: 'kpi_forecast', mt: 'absolute', vt: 'count' },
  { code: 'conversion_rate', name: 'Конверсия', unit: '%', wt: 'kpi_deviation', mt: 'averaged', vt: 'percentage' },
  { code: 'csi', name: 'CSI', unit: '%', wt: 'kpi_deviation', mt: 'averaged', vt: 'percentage' },
  { code: 'avg_glasses_price', name: 'Ср. стоимость очков', unit: '₽', wt: 'kpi_deviation', mt: 'averaged', vt: 'currency' },
  { code: 'avg_repaires_price', name: 'Ср. стоимость ремонтов', unit: '₽', wt: 'kpi_deviation', mt: 'averaged', vt: 'currency' },
  { code: 'margin_rate', name: 'Маржинальность', unit: '₽', wt: 'kpi_deviation', mt: 'averaged', vt: 'currency' },
];

export class TrackerAdapter extends BaseAdapter {
  adapterType = 'tracker';
  name = 'OverBrain Tracker';
  supportedEvents = [
    'order_created',
    'order_closed',
    'visit_recorded',
  ];

  /**
   * Discover available Tracker metrics.
   * Returns predefined codes since Tracker has a fixed metric set.
   * @param {import('./types').DataSourceConfig} dataSource
   */
  async discover(dataSource) {
    return {
      categories: [{
        id: 'tracker_metrics',
        name: 'Tracker Metrics',
        icon: 'bar-chart',
        templates: TRACKER_CODES.map(tc => this.makeTemplate(
          dataSource.id, tc.code, tc.name, `Tracker: ${tc.code}`,
          {
            source: 'tracker',
            trackerCode: tc.code,
            unit: tc.unit,
            widgetType: tc.wt,
            forecastLabel: tc.wt === 'kpi_deviation' ? 'deviation' : 'forecast',
            forecastUnit: '%',
            metricType: tc.mt,
            valueType: tc.vt,
          },
        )),
      }],
    };
  }

  /**
   * Tracker currently uses pull model — no webhooks.
   */
  async transformWebhook() {
    return [];
  }

  validateWebhook() {
    return false; // Tracker doesn't send webhooks
  }

  /**
   * Poll Tracker API is handled by the existing internal-api.js fetch logic.
   * This adapter method is a placeholder for future direct event extraction.
   */
  async poll() {
    return [];
  }
}

export { TRACKER_CODES };
