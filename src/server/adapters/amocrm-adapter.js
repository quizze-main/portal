/**
 * amoCRM Adapter — discovery, webhook transformation, and polling for amoCRM.
 *
 * Refactored from source-discovery.js amoCRM discovery logic.
 * Adds webhook and polling capabilities.
 */

import { BaseAdapter } from './base-adapter.js';
import { fetchFromSource } from '../data-sources.js';

export class AmoCRMAdapter extends BaseAdapter {
  adapterType = 'amocrm';
  name = 'amoCRM';
  supportedEvents = [
    'order_created',
    'order_status_changed',
    'order_closed',
    'order_cancelled',
  ];

  /**
   * Discover available metrics from amoCRM API.
   * Probes pipelines, leads, contacts in parallel.
   * @param {import('./types').DataSourceConfig} dataSource
   */
  async discover(dataSource) {
    const categories = [];

    const [pipelinesResult, leadsResult, contactsResult] = await Promise.allSettled([
      fetchFromSource(dataSource, '/api/v4/leads/pipelines', {}, { method: 'GET' }),
      fetchFromSource(dataSource, '/api/v4/leads', { limit: '250' }, { method: 'GET' }),
      fetchFromSource(dataSource, '/api/v4/contacts', { limit: '250' }, { method: 'GET' }),
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

    // --- Leads ---
    const leadsItems = [];

    leadsItems.push(this._makeExternalTemplate(
      dataSource.id, 'leads_total',
      'Сделки (всего)', 'Количество всех сделок',
      '/api/v4/leads', '_embedded.leads.length',
      { queryParams: [{ key: 'limit', value: '250' }], previewValue: leadsCount },
    ));

    for (const pipeline of pipelines) {
      leadsItems.push(this._makeExternalTemplate(
        dataSource.id, `leads_pipe_${pipeline.id}`,
        `Сделки: ${pipeline.name}`, `Сделки в воронке "${pipeline.name}"`,
        '/api/v4/leads', '_embedded.leads.length',
        {
          queryParams: [
            { key: 'limit', value: '250' },
            { key: 'filter[pipeline_id]', value: String(pipeline.id) },
          ],
        },
      ));

      const statuses = pipeline?._embedded?.statuses || [];
      for (const status of statuses) {
        if (status.id === 142 || status.id === 143) continue;
        leadsItems.push(this._makeExternalTemplate(
          dataSource.id, `leads_p${pipeline.id}_s${status.id}`,
          `${pipeline.name} → ${status.name}`, `Сделки в статусе "${status.name}"`,
          '/api/v4/leads', '_embedded.leads.length',
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
      categories.push({ id: 'leads', name: 'Сделки', icon: 'users', templates: leadsItems });
    }

    // --- Contacts ---
    categories.push({
      id: 'contacts',
      name: 'Контакты',
      icon: 'contact',
      templates: [this._makeExternalTemplate(
        dataSource.id, 'contacts_total',
        'Контакты (всего)', 'Количество контактов в CRM',
        '/api/v4/contacts', '_embedded.contacts.length',
        { queryParams: [{ key: 'limit', value: '250' }], previewValue: contactsCount },
      )],
    });

    // --- Companies ---
    categories.push({
      id: 'companies',
      name: 'Компании',
      icon: 'building',
      templates: [this._makeExternalTemplate(
        dataSource.id, 'companies_total',
        'Компании (всего)', 'Количество компаний в CRM',
        '/api/v4/companies', '_embedded.companies.length',
        { queryParams: [{ key: 'limit', value: '250' }] },
      )],
    });

    // --- Tasks ---
    categories.push({
      id: 'tasks',
      name: 'Задачи',
      icon: 'list-todo',
      templates: [this._makeExternalTemplate(
        dataSource.id, 'tasks_total',
        'Задачи (всего)', 'Количество задач в CRM',
        '/api/v4/tasks', '_embedded.tasks.length',
        { queryParams: [{ key: 'limit', value: '250' }] },
      )],
    });

    return { categories };
  }

  /**
   * Transform amoCRM webhook payload into standard events.
   * amoCRM sends webhooks for leads[status], leads[add], leads[delete], etc.
   * @param {unknown} rawPayload
   * @param {Record<string, string>} headers
   */
  async transformWebhook(rawPayload, headers) {
    const events = [];
    const payload = rawPayload;

    // amoCRM webhook format: { leads[status][0][id]: ..., leads[status][0][status_id]: ... }
    // or nested: { leads: { status: [{ id, status_id, pipeline_id, ... }] } }
    const leads = payload?.leads || {};

    // Lead status changes
    const statusChanges = leads.status || leads['status'] || [];
    for (const lead of (Array.isArray(statusChanges) ? statusChanges : [])) {
      const statusId = parseInt(lead.status_id);
      let eventType = 'order_status_changed';

      if (statusId === 142) eventType = 'order_closed';
      else if (statusId === 143) eventType = 'order_cancelled';

      events.push({
        eventType,
        eventTime: lead.last_modified ? new Date(lead.last_modified * 1000).toISOString() : new Date().toISOString(),
        externalId: `amo_lead_${lead.id}_status_${statusId}`,
        metricValues: {
          revenue: this.toNumber(lead.price || lead.sale),
          items_count: 1,
        },
        rawPayload: lead,
      });
    }

    // New leads
    const addedLeads = leads.add || leads['add'] || [];
    for (const lead of (Array.isArray(addedLeads) ? addedLeads : [])) {
      events.push({
        eventType: 'order_created',
        eventTime: lead.date_create ? new Date(lead.date_create * 1000).toISOString() : new Date().toISOString(),
        externalId: `amo_lead_${lead.id}_created`,
        metricValues: {
          revenue: this.toNumber(lead.price || lead.sale),
          items_count: 1,
        },
        rawPayload: lead,
      });
    }

    return events;
  }

  /**
   * Validate amoCRM webhook.
   * amoCRM doesn't have built-in HMAC — uses webhook secret comparison.
   */
  validateWebhook(rawPayload, headers, secret) {
    if (!secret) return true;
    const provided = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
    return provided === secret;
  }

  /**
   * Poll amoCRM for new/updated leads since lastPollAt.
   * @param {import('./types').DataSourceConfig} dataSource
   * @param {Date | null} lastPollAt
   */
  async poll(dataSource, lastPollAt) {
    const events = [];
    const queryParams = { limit: '250' };

    if (lastPollAt) {
      queryParams['filter[updated_at][from]'] = String(Math.floor(lastPollAt.getTime() / 1000));
    }

    try {
      const result = await fetchFromSource(dataSource, '/api/v4/leads', queryParams, { method: 'GET' });
      const leads = result?._embedded?.leads || [];

      for (const lead of leads) {
        events.push({
          eventType: 'order_status_changed',
          eventTime: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString() : new Date().toISOString(),
          externalId: `amo_lead_${lead.id}_poll_${lead.updated_at || Date.now()}`,
          metricValues: {
            revenue: this.toNumber(lead.price || lead.sale),
            items_count: 1,
          },
          rawPayload: lead,
        });
      }
    } catch (err) {
      console.warn('[amocrm-adapter] Poll failed:', err.message);
    }

    return events;
  }

  // ─── Private helpers ───

  _makeExternalTemplate(sourceId, suffix, name, description, path, jsonPathFact, opts = {}) {
    return this.makeTemplate(sourceId, suffix, name, description, {
      source: 'external_api',
      dataSourceId: sourceId,
      externalPath: path,
      externalMethod: opts.method || 'GET',
      externalQueryParams: opts.queryParams || [],
      jsonPathFact,
      jsonPathPlan: '',
      unit: opts.unit || 'шт.',
      previewValue: opts.previewValue ?? null,
    });
  }
}
