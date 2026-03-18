/**
 * Formula engine for computed metrics.
 *
 * Formulas reference other metrics via {metricId} syntax:
 *   "{revenue_created} / {frames_count}"
 *   "({revenue_created} - {cost}) / {revenue_created} * 100"
 *   "max({csi}, {conversion_rate})"
 *
 * Supported: +, -, *, /, parentheses, min(), max(), avg(), if(cond, a, b)
 * DAG validation prevents circular dependencies.
 */

const METRIC_REF_RE = /\{([a-zA-Z0-9_-]+(?:\.[a-z]+)?)\}/g;

/**
 * Extract base metric IDs referenced in a formula (strips .fact/.plan accessors).
 * Used for DAG validation — only base metric IDs matter for dependency resolution.
 * @param {string} formula
 * @returns {string[]} unique metric IDs (without accessors)
 */
export function extractDependencies(formula) {
  if (!formula) return [];
  const ids = new Set();
  let match;
  METRIC_REF_RE.lastIndex = 0;
  while ((match = METRIC_REF_RE.exec(formula)) !== null) {
    // Strip .fact / .plan accessor — only base metric id for DAG
    const ref = match[1];
    const dotIdx = ref.lastIndexOf('.');
    const baseId = (dotIdx > 0 && (ref.endsWith('.fact') || ref.endsWith('.plan')))
      ? ref.slice(0, dotIdx)
      : ref;
    ids.add(baseId);
  }
  return [...ids];
}

/**
 * Validate that no circular dependencies exist in the metrics graph.
 * @param {Array<{id: string, formula?: string, formulaDependencies?: string[]}>} allMetrics
 * @returns {{ valid: boolean, cycle?: string[] }}
 */
export function validateDAG(allMetrics) {
  const deps = new Map();
  for (const m of allMetrics) {
    const d = m.formulaDependencies?.length
      ? m.formulaDependencies
      : extractDependencies(m.formula);
    if (d.length > 0) deps.set(m.id, d);
  }

  // Topological sort via DFS
  const visited = new Set();
  const inStack = new Set();

  function dfs(id, path) {
    if (inStack.has(id)) return [...path, id];
    if (visited.has(id)) return null;
    inStack.add(id);
    path.push(id);
    const neighbors = deps.get(id) || [];
    for (const n of neighbors) {
      const cycle = dfs(n, [...path]);
      if (cycle) return cycle;
    }
    inStack.delete(id);
    visited.add(id);
    return null;
  }

  for (const id of deps.keys()) {
    const cycle = dfs(id, []);
    if (cycle) return { valid: false, cycle };
  }
  return { valid: true };
}

/**
 * Determine evaluation order (topological sort) for computed metrics.
 * @param {Array<{id: string, formula?: string, formulaDependencies?: string[]}>} computedMetrics
 * @returns {string[]} metric IDs in safe evaluation order
 */
export function getEvaluationOrder(computedMetrics) {
  const depMap = new Map();
  for (const m of computedMetrics) {
    const d = m.formulaDependencies?.length
      ? m.formulaDependencies
      : extractDependencies(m.formula);
    depMap.set(m.id, d);
  }

  const sorted = [];
  const visited = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of (depMap.get(id) || [])) {
      visit(dep);
    }
    sorted.push(id);
  }

  for (const id of depMap.keys()) {
    visit(id);
  }
  return sorted;
}

/**
 * Built-in functions available in formulas.
 */
const BUILT_IN_FUNCTIONS = {
  min: (...args) => Math.min(...args.filter(Number.isFinite)),
  max: (...args) => Math.max(...args.filter(Number.isFinite)),
  avg: (...args) => {
    const nums = args.filter(Number.isFinite);
    return nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
  },
  abs: (v) => Math.abs(v),
  round: (v, decimals = 0) => {
    const f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
  },
};

/**
 * Evaluate a formula string with given metric values.
 *
 * @param {string} formula - e.g. "{revenue_created} / {frames_count}"
 * @param {Record<string, number>} values - map of metricId → fact value
 * @returns {{ result: number, error?: string }}
 */
export function evaluate(formula, values) {
  if (!formula) return { result: 0, error: 'Empty formula' };

  try {
    // Replace {metricId} with values
    let expr = formula.replace(METRIC_REF_RE, (_, id) => {
      const v = values[id];
      if (v === undefined || v === null) return '0';
      return String(v);
    });

    // Replace function calls: min(...), max(...), avg(...), abs(...), round(...)
    for (const [fname, fn] of Object.entries(BUILT_IN_FUNCTIONS)) {
      const fnRe = new RegExp(`${fname}\\(([^)]+)\\)`, 'g');
      expr = expr.replace(fnRe, (_, argsStr) => {
        const args = argsStr.split(',').map(s => {
          const n = parseFloat(s.trim());
          return Number.isFinite(n) ? n : 0;
        });
        return String(fn(...args));
      });
    }

    // Simple if(cond, trueVal, falseVal): cond > 0 means true
    const ifRe = /if\(([^,]+),([^,]+),([^)]+)\)/g;
    expr = expr.replace(ifRe, (_, cond, trueVal, falseVal) => {
      const c = parseFloat(cond.trim());
      return c > 0 ? trueVal.trim() : falseVal.trim();
    });

    // Validate: only allow digits, operators, parentheses, dots, spaces, minus
    const sanitized = expr.replace(/[0-9+\-*/.() \t]/g, '');
    if (sanitized.length > 0) {
      return { result: 0, error: `Invalid characters in formula: ${sanitized}` };
    }

    // Evaluate the arithmetic expression
    // Using Function constructor for safe math-only evaluation
    const result = new Function(`"use strict"; return (${expr});`)();

    if (!Number.isFinite(result)) {
      return { result: 0, error: 'Result is not a finite number' };
    }

    return { result };
  } catch (err) {
    return { result: 0, error: err.message };
  }
}
