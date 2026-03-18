/**
 * Enhanced JSONPath extraction utility.
 *
 * Supported syntax:
 *   "field.nested"          → obj.field.nested
 *   "items[0].name"         → obj.items[0].name
 *   "items[-1].name"        → last element
 *   "items[*].value"        → array of all values (returns array)
 *   "items.length"          → array length (returns number)
 *   "data.results[0].metrics[2].fact" → deep nesting
 *
 * Returns null if path is invalid or value not found.
 */

/**
 * Tokenize a path string into segments.
 * "data.items[0].name" → [{type:'key',value:'data'}, {type:'key',value:'items'}, {type:'index',value:0}, {type:'key',value:'name'}]
 */
function tokenize(pathStr) {
  const tokens = [];
  const re = /([^.\[\]]+)|\[(\d+|-\d+|\*)\]/g;
  let match;
  while ((match = re.exec(pathStr)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ type: 'key', value: match[1] });
    } else if (match[2] === '*') {
      tokens.push({ type: 'wildcard' });
    } else {
      tokens.push({ type: 'index', value: parseInt(match[2], 10) });
    }
  }
  return tokens;
}

/**
 * Walk an object using the given tokens starting from tokenIdx.
 * Returns the resolved value or null.
 */
function resolve(obj, tokens, tokenIdx) {
  let current = obj;

  for (let i = tokenIdx; i < tokens.length; i++) {
    if (current == null) return null;

    const token = tokens[i];

    if (token.type === 'key') {
      // Support .length on arrays
      if (token.value === 'length' && Array.isArray(current)) {
        current = current.length;
      } else {
        if (typeof current !== 'object') return null;
        current = current[token.value];
      }
    } else if (token.type === 'index') {
      if (!Array.isArray(current)) return null;
      const idx = token.value < 0 ? current.length + token.value : token.value;
      if (idx < 0 || idx >= current.length) return null;
      current = current[idx];
    } else if (token.type === 'wildcard') {
      if (!Array.isArray(current)) return null;
      // Apply remaining tokens to each element
      const remaining = tokens.slice(i + 1);
      if (remaining.length === 0) return current;
      return current
        .map(item => resolve(item, remaining, 0))
        .filter(v => v != null);
    }
  }

  return current === undefined ? null : current;
}

/**
 * Extract a value from a nested object using dot-notation with optional array indices.
 *
 * @param {*} obj - The object to extract from
 * @param {string} pathStr - The path expression (e.g. "data.items[0].value")
 * @returns {*} The extracted value, or null if not found
 */
export function extractByPath(obj, pathStr) {
  if (obj == null || !pathStr || typeof pathStr !== 'string') return null;

  const trimmed = pathStr.trim();
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  return resolve(obj, tokens, 0);
}
