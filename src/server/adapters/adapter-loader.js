/**
 * Adapter Loader — factory for loading CRM adapters by type.
 *
 * Built-in adapters: amocrm, tracker, custom.
 * Custom adapters load code from adapter_registry DB table.
 */

import { isPrismaConnected as isDbConnected, rawQuery as query } from '../prisma.js';
import { AmoCRMAdapter } from './amocrm-adapter.js';
import { TrackerAdapter } from './tracker-adapter.js';
import { CustomAdapter } from './custom-adapter.js';
import { BaseAdapter } from './base-adapter.js';

/** Built-in adapter constructors */
const BUILT_IN_ADAPTERS = {
  amocrm: AmoCRMAdapter,
  tracker: TrackerAdapter,
  custom: CustomAdapter,
};

/** Cache of instantiated adapters by data source ID */
const adapterCache = new Map();

/**
 * Get an adapter instance for a data source.
 *
 * @param {import('./types').DataSourceConfig} dataSource
 * @returns {Promise<import('./types').CRMAdapter>}
 */
export async function getAdapter(dataSource) {
  const cacheKey = `${dataSource.id}_${dataSource.adapterType || 'auto'}`;

  if (adapterCache.has(cacheKey)) {
    return adapterCache.get(cacheKey);
  }

  const adapter = await createAdapter(dataSource);
  adapterCache.set(cacheKey, adapter);
  return adapter;
}

/**
 * Create a new adapter instance.
 *
 * @param {import('./types').DataSourceConfig} dataSource
 * @returns {Promise<import('./types').CRMAdapter>}
 */
async function createAdapter(dataSource) {
  const adapterType = dataSource.adapterType || detectAdapterType(dataSource);

  // Built-in adapters
  const AdapterClass = BUILT_IN_ADAPTERS[adapterType];
  if (AdapterClass) {
    const adapter = new AdapterClass();
    await adapter.initialize(dataSource);

    // For custom adapters, load code from registry
    if (adapterType === 'custom' && isDbConnected()) {
      const registryId = dataSource.adapterConfig?.registryId || dataSource.id;
      const res = await query(
        'SELECT adapter_code, supported_events, name FROM adapter_registry WHERE id = $1',
        [registryId]
      );
      if (res?.rows?.[0]?.adapter_code) {
        adapter.setAdapterCode(res.rows[0].adapter_code);
        adapter.name = res.rows[0].name || 'Custom Adapter';
        adapter.supportedEvents = res.rows[0].supported_events || [];
      }
    }

    return adapter;
  }

  // Check adapter_registry for custom adapter code
  if (isDbConnected()) {
    const res = await query(
      'SELECT adapter_code, supported_events, name FROM adapter_registry WHERE id = $1',
      [adapterType]
    );
    if (res?.rows?.[0]?.adapter_code) {
      const adapter = new CustomAdapter();
      await adapter.initialize(dataSource);
      adapter.setAdapterCode(res.rows[0].adapter_code);
      adapter.name = res.rows[0].name || adapterType;
      adapter.supportedEvents = res.rows[0].supported_events || [];
      return adapter;
    }
  }

  // Fallback to base adapter
  const adapter = new BaseAdapter();
  await adapter.initialize(dataSource);
  return adapter;
}

/**
 * Auto-detect adapter type from data source config.
 *
 * @param {import('./types').DataSourceConfig} dataSource
 * @returns {string}
 */
function detectAdapterType(dataSource) {
  const baseUrl = (dataSource.baseUrl || '').toLowerCase();

  if (baseUrl.includes('amocrm')) return 'amocrm';
  if (dataSource.id === 'tracker' || baseUrl.includes('tracker')) return 'tracker';

  return 'custom';
}

/**
 * Clear adapter cache (e.g. after config update).
 * @param {string} [dataSourceId] — specific source to clear, or all if omitted
 */
export function clearAdapterCache(dataSourceId) {
  if (dataSourceId) {
    for (const key of adapterCache.keys()) {
      if (key.startsWith(dataSourceId + '_')) {
        adapterCache.delete(key);
      }
    }
  } else {
    adapterCache.clear();
  }
}

/**
 * List all registered adapters (built-in + DB custom).
 * @returns {Promise<Array<{ id: string, name: string, builtIn: boolean, supportedEvents: string[] }>>}
 */
export async function listAdapters() {
  const adapters = Object.entries(BUILT_IN_ADAPTERS).map(([id, Cls]) => {
    const inst = new Cls();
    return {
      id,
      name: inst.name,
      builtIn: true,
      supportedEvents: inst.supportedEvents,
      description: `Built-in ${inst.name} adapter`,
    };
  });

  if (isDbConnected()) {
    const res = await query(
      'SELECT id, name, description, version, supported_events, ai_generated FROM adapter_registry WHERE id NOT IN ($1, $2, $3)',
      ['amocrm', 'tracker', 'manual']
    );
    for (const row of (res?.rows || [])) {
      adapters.push({
        id: row.id,
        name: row.name,
        builtIn: false,
        supportedEvents: row.supported_events || [],
        description: row.description,
        version: row.version,
        aiGenerated: row.ai_generated,
      });
    }
  }

  return adapters;
}
