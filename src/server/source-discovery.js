/**
 * Source discovery — auto-detect available metric templates from data sources.
 *
 * Delegates to CRM adapters when available, falls back to legacy discovery logic.
 * Each discoverer probes the external API and returns categories of metric templates
 * that the user can add with one click.
 */

import { fetchFromSource } from './data-sources.js';
import { getAdapter } from './adapters/adapter-loader.js';

// ─── Helpers ───

function templateId(sourceId, suffix) {
  return `${sourceId}_${suffix}`;
}

function makeTemplate(sourceId, suffix, name, description, path, jsonPathFact, opts = {}) {
  return {
    templateId: templateId(sourceId, suffix),
    name,
    description,
    previewValue: opts.previewValue ?? null,
    config: {
      source: 'external_api',
      dataSourceId: sourceId,
      externalPath: path,
      externalMethod: opts.method || 'GET',
      externalQueryParams: opts.queryParams || [],
      jsonPathFact,
      jsonPathPlan: '',
      unit: opts.unit || 'шт.',
      widgetType: opts.widgetType || 'kpi_forecast',
      forecastLabel: opts.forecastLabel || 'forecast',
      forecastUnit: '%',
      metricType: opts.metricType || 'absolute',
      valueType: opts.valueType || 'count',
    },
  };
}

// ─── amoCRM Discovery ───

async function discoverAmoCRM(source) {
  const categories = [];

  // Run all probes in parallel to minimize wait time
  const [pipelinesResult, leadsResult, contactsResult] = await Promise.allSettled([
    fetchFromSource(source, '/api/v4/leads/pipelines', {}, { method: 'GET' }),
    fetchFromSource(source, '/api/v4/leads', { limit: '250' }, { method: 'GET' }),
    fetchFromSource(source, '/api/v4/contacts', { limit: '250' }, { method: 'GET' }),
  ]);

  const pipelines = pipelinesResult.status === 'fulfilled'
    ? (pipelinesResult.value?._embedded?.pipelines || [])
    : [];
  const leadsCount = leadsResult.status === 'fulfilled'
    ? (leadsResult.value?._embedded?.leads?.length ?? null)
    : null;
  const contactsCount = contactsResult.status === 'fulfilled'
    ? (contactsResult.value?._embedded?.contacts?.length ?? null)
    : null;

  // --- Leads category ---
  const leadsItems = [];

  leadsItems.push(makeTemplate(
    source.id, 'leads_total',
    'Сделки (всего)',
    'Количество всех сделок',
    '/api/v4/leads',
    '_embedded.leads.length',
    { queryParams: [{ key: 'limit', value: '250' }], previewValue: leadsCount },
  ));

  // Per pipeline
  for (const pipeline of pipelines) {
    leadsItems.push(makeTemplate(
      source.id, `leads_pipe_${pipeline.id}`,
      `Сделки: ${pipeline.name}`,
      `Сделки в воронке "${pipeline.name}"`,
      '/api/v4/leads',
      '_embedded.leads.length',
      {
        queryParams: [
          { key: 'limit', value: '250' },
          { key: 'filter[pipeline_id]', value: String(pipeline.id) },
        ],
      },
    ));

    // Per status within pipeline
    const statuses = pipeline?._embedded?.statuses || [];
    for (const status of statuses) {
      // Skip system statuses (142 = won, 143 = lost)
      if (status.id === 142 || status.id === 143) continue;
      leadsItems.push(makeTemplate(
        source.id, `leads_p${pipeline.id}_s${status.id}`,
        `${pipeline.name} → ${status.name}`,
        `Сделки в статусе "${status.name}"`,
        '/api/v4/leads',
        '_embedded.leads.length',
        {
          queryParams: [
            { key: 'limit', value: '250' },
            { key: 'filter[statuses][0][pipeline_id]', value: String(pipeline.id) },
            { key: 'filter[statuses][0][status_id]', value: String(status.id) },
          ],
        },
      ));
    }
  }

  if (leadsItems.length) {
    categories.push({ name: 'Сделки', icon: 'users', items: leadsItems });
  }

  // --- Contacts ---
  categories.push({
    name: 'Контакты',
    icon: 'contact',
    items: [makeTemplate(
      source.id, 'contacts_total',
      'Контакты (всего)',
      'Количество контактов в CRM',
      '/api/v4/contacts',
      '_embedded.contacts.length',
      { queryParams: [{ key: 'limit', value: '250' }], previewValue: contactsCount },
    )],
  });

  // --- Companies ---
  categories.push({
    name: 'Компании',
    icon: 'building',
    items: [makeTemplate(
      source.id, 'companies_total',
      'Компании (всего)',
      'Количество компаний в CRM',
      '/api/v4/companies',
      '_embedded.companies.length',
      { queryParams: [{ key: 'limit', value: '250' }] },
    )],
  });

  // --- Tasks ---
  categories.push({
    name: 'Задачи',
    icon: 'list-todo',
    items: [makeTemplate(
      source.id, 'tasks_total',
      'Задачи (всего)',
      'Количество задач в CRM',
      '/api/v4/tasks',
      '_embedded.tasks.length',
      { queryParams: [{ key: 'limit', value: '250' }] },
    )],
  });

  return { categories };
}

// ─── Tracker Discovery ───

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

async function discoverTracker(source) {
  return {
    categories: [{
      name: 'Tracker Metrics',
      icon: 'bar-chart',
      items: TRACKER_CODES.map(tc => ({
        templateId: templateId(source.id, tc.code),
        name: tc.name,
        description: `Tracker: ${tc.code}`,
        previewValue: null,
        config: {
          source: 'tracker',
          trackerCode: tc.code,
          unit: tc.unit,
          widgetType: tc.wt,
          forecastLabel: tc.wt === 'kpi_deviation' ? 'deviation' : 'forecast',
          forecastUnit: '%',
          metricType: tc.mt,
          valueType: tc.vt,
        },
      })),
    }],
  };
}

// ─── Generic Discovery ───

async function discoverGeneric(source) {
  if (!source.healthCheckPath || source.healthCheckPath === '/') {
    return { categories: [] };
  }
  return {
    categories: [{
      name: source.label,
      icon: 'database',
      items: [{
        templateId: templateId(source.id, 'health'),
        name: `${source.label} — health check`,
        description: `GET ${source.healthCheckPath}`,
        previewValue: null,
        config: {
          source: 'external_api',
          dataSourceId: source.id,
          externalPath: source.healthCheckPath,
          externalMethod: source.healthCheckMethod || 'GET',
          externalQueryParams: [],
          jsonPathFact: '',
          jsonPathPlan: '',
          unit: '',
          widgetType: 'kpi_forecast',
          forecastLabel: 'forecast',
          forecastUnit: '%',
          metricType: 'absolute',
          valueType: 'count',
        },
      }],
    }],
  };
}

// ─── Main dispatch ───

export async function discoverMetrics(source) {
  // Try adapter-based discovery first (supports built-in + custom adapters)
  if (source.adapterType) {
    try {
      const adapter = await getAdapter(source);
      const result = await adapter.discover(source);
      if (result?.categories?.length > 0) {
        // Normalize adapter output: adapters use 'templates', legacy uses 'items'
        for (const cat of result.categories) {
          if (cat.templates && !cat.items) {
            cat.items = cat.templates;
          }
        }
        return result;
      }
    } catch (err) {
      console.warn(`[source-discovery] Adapter discovery failed for ${source.id}, falling back to legacy:`, err.message);
    }
  }

  // Legacy dispatch
  const baseUrl = (source.baseUrl || '').toLowerCase();

  if (baseUrl.includes('amocrm')) {
    return discoverAmoCRM(source);
  }
  if (source.id === 'tracker' || baseUrl.includes('tracker')) {
    return discoverTracker(source);
  }
  return discoverGeneric(source);
}
