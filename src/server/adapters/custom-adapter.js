/**
 * Custom Adapter — executes AI-generated or user-provided adapter code in a vm sandbox.
 *
 * Adapter code is stored in the adapter_registry table and loaded at runtime.
 * Uses Node.js vm module for safe execution with limited API access.
 */

import vm from 'node:vm';
import { BaseAdapter } from './base-adapter.js';

/** Max execution time for custom adapter code (ms) */
const EXECUTION_TIMEOUT = 5000;

/** Allowed globals in the sandbox */
const SAFE_GLOBALS = {
  JSON,
  Math,
  Date,
  parseInt,
  parseFloat,
  String,
  Number,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  RegExp,
  Error,
  console: {
    log: (...args) => console.log('[custom-adapter]', ...args),
    warn: (...args) => console.warn('[custom-adapter]', ...args),
    error: (...args) => console.error('[custom-adapter]', ...args),
  },
};

export class CustomAdapter extends BaseAdapter {
  adapterType = 'custom';
  name = 'Custom Adapter';
  supportedEvents = [];

  /** @type {string | null} */
  _adapterCode = null;
  /** @type {vm.Script | null} */
  _compiledScript = null;

  /**
   * Initialize with adapter code from the registry.
   * @param {import('./types').DataSourceConfig} dataSource
   */
  async initialize(dataSource) {
    await super.initialize(dataSource);

    // Adapter code can come from adapterConfig or will be loaded by adapter-loader
    this._adapterCode = dataSource.adapterConfig?.code || null;

    if (this._adapterCode) {
      this._compile();
    }
  }

  /**
   * Set adapter code (from adapter_registry table).
   * @param {string} code
   */
  setAdapterCode(code) {
    this._adapterCode = code;
    this._compile();
  }

  /**
   * Compile the adapter code once for reuse.
   */
  _compile() {
    if (!this._adapterCode) return;
    try {
      this._compiledScript = new vm.Script(this._adapterCode, {
        filename: 'custom-adapter.js',
        timeout: EXECUTION_TIMEOUT,
      });
    } catch (err) {
      console.error('[custom-adapter] Compilation failed:', err.message);
      this._compiledScript = null;
    }
  }

  /**
   * Execute a function from the adapter code.
   * @param {string} fnName — function name to call (e.g. 'transformWebhook')
   * @param {*[]} args — arguments to pass
   * @returns {*}
   */
  _execute(fnName, ...args) {
    if (!this._compiledScript) {
      throw new Error('No adapter code compiled');
    }

    const sandbox = {
      ...SAFE_GLOBALS,
      __result__: null,
      __error__: null,
      __args__: args,
    };

    const context = vm.createContext(sandbox);

    // Run the script to define functions
    this._compiledScript.runInContext(context, { timeout: EXECUTION_TIMEOUT });

    // Call the requested function
    const callScript = new vm.Script(
      `try { __result__ = typeof ${fnName} === 'function' ? ${fnName}(...__args__) : null; } catch(e) { __error__ = e.message; }`,
      { timeout: EXECUTION_TIMEOUT }
    );
    callScript.runInContext(context, { timeout: EXECUTION_TIMEOUT });

    if (sandbox.__error__) {
      throw new Error(`Custom adapter error in ${fnName}: ${sandbox.__error__}`);
    }

    return sandbox.__result__;
  }

  /**
   * Transform webhook using custom code.
   * The custom code must define: function transformWebhook(payload, headers) { return [...events]; }
   */
  async transformWebhook(rawPayload, headers) {
    try {
      const result = this._execute('transformWebhook', rawPayload, headers);
      return Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('[custom-adapter] transformWebhook failed:', err.message);
      return [];
    }
  }

  /**
   * Poll using custom code.
   * The custom code must define: function poll(config, lastPollAt) { return [...events]; }
   */
  async poll(dataSource, lastPollAt) {
    try {
      const config = {
        baseUrl: dataSource.baseUrl,
        authConfig: dataSource.authConfig,
        id: dataSource.id,
      };
      const result = this._execute('poll', config, lastPollAt?.toISOString() || null);
      return Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('[custom-adapter] poll failed:', err.message);
      return [];
    }
  }

  /**
   * Discover using custom code.
   * The custom code must define: function discover(config) { return { categories: [...] }; }
   */
  async discover(dataSource) {
    try {
      const config = {
        baseUrl: dataSource.baseUrl,
        id: dataSource.id,
        label: dataSource.label,
      };
      const result = this._execute('discover', config);
      return result?.categories ? result : { categories: [] };
    } catch (err) {
      console.error('[custom-adapter] discover failed:', err.message);
      return { categories: [] };
    }
  }

  /**
   * Validate webhook using custom code or default.
   */
  validateWebhook(rawPayload, headers, secret) {
    if (this._compiledScript) {
      try {
        const result = this._execute('validateWebhook', rawPayload, headers, secret);
        return !!result;
      } catch {
        // Fall back to default
      }
    }
    return super.validateWebhook(rawPayload, headers, secret);
  }
}
