import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import multer from 'multer';
import logger from './logger.js';
import { requireAuth } from './requireAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env || {};

// --- Provider abstraction ---

class OutlineProvider {
  static label = 'Outline Wiki';
  static fields = [
    { key: 'base_url', label: 'Base URL', required: true, placeholder: 'https://wiki.example.com' },
    { key: 'api_key', label: 'API Key', required: true, placeholder: 'ol_api_...' },
  ];

  static async testConnection(config) {
    const { base_url, api_key } = config || {};
    if (!base_url || !api_key) return { ok: false, message: 'Missing base_url or api_key' };

    const start = Date.now();
    try {
      const res = await fetch(`${base_url}/api/auth.info`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(8000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    } catch (err) {
      const latency = Date.now() - start;
      return { ok: false, message: err.message || 'Connection failed', latency };
    }
  }
}

class NotionProvider {
  static label = 'Notion';
  static comingSoon = true;
  static fields = [
    { key: 'api_key', label: 'API Key', required: true, placeholder: 'ntn_...' },
    { key: 'workspace_id', label: 'Workspace ID', required: false, placeholder: '' },
  ];
  static async testConnection() {
    return { ok: false, message: 'Coming soon' };
  }
}

class ConfluenceProvider {
  static label = 'Confluence';
  static comingSoon = true;
  static fields = [
    { key: 'base_url', label: 'Base URL', required: true, placeholder: 'https://your-domain.atlassian.net/wiki' },
    { key: 'api_key', label: 'API Key', required: true, placeholder: '' },
    { key: 'space_key', label: 'Space Key', required: false, placeholder: '' },
  ];
  static async testConnection() {
    return { ok: false, message: 'Coming soon' };
  }
}

class YandexWikiProvider {
  static label = 'Yandex Wiki';
  static comingSoon = true;
  static fields = [
    { key: 'base_url', label: 'Base URL', required: true, placeholder: 'https://wiki.yandex.ru' },
    { key: 'api_key', label: 'API Key', required: true, placeholder: '' },
    { key: 'org_id', label: 'Org ID', required: false, placeholder: '' },
  ];
  static async testConnection() {
    return { ok: false, message: 'Coming soon' };
  }
}

const PROVIDERS = {
  outline: OutlineProvider,
  notion: NotionProvider,
  confluence: ConfluenceProvider,
  yandex_wiki: YandexWikiProvider,
};

function getProvider(type) {
  return PROVIDERS[type] || null;
}

// --- JSON config storage ---

const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_PATH = path.join(DATA_DIR, 'kb-providers.json');

async function readConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) return { providers: {} };
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { providers: {} };
  }
}

async function writeConfig(config) {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/** Merge env-based Outline config as default if not stored in JSON */
function mergeEnvDefaults(config) {
  const result = { ...config, providers: { ...config.providers } };

  // Outline fallback from env
  if (!result.providers.outline) {
    const base_url = env.OUTLINE_BASE_URL;
    const api_key = env.OUTLINE_API_KEY;
    if (base_url || api_key) {
      result.providers.outline = {
        label: 'Outline Wiki',
        base_url: base_url || '',
        api_key: api_key || '',
        is_active: true,
        source: 'env',
      };
    }
  } else if (result.providers.outline.source !== 'manual') {
    // If env vars exist and source is not explicitly 'manual', keep env values in sync
    if (env.OUTLINE_BASE_URL) result.providers.outline.base_url = env.OUTLINE_BASE_URL;
    if (env.OUTLINE_API_KEY) result.providers.outline.api_key = env.OUTLINE_API_KEY;
  }

  return result;
}

/** Mask sensitive fields before sending to frontend */
function maskConfig(config) {
  const result = { providers: {} };
  for (const [type, cfg] of Object.entries(config.providers)) {
    result.providers[type] = { ...cfg };
    if (cfg.api_key) {
      const key = cfg.api_key;
      result.providers[type].api_key = key.length > 8 ? key.slice(0, 8) + '...' : '***';
    }
  }
  return result;
}

// --- Outline API helper ---

const OUTLINE_BASE_URL = env.OUTLINE_BASE_URL;
const OUTLINE_API_KEY = env.OUTLINE_API_KEY;

async function outlineApi(endpoint, body = {}) {
  if (!OUTLINE_BASE_URL || !OUTLINE_API_KEY) {
    throw new Error('Outline credentials not configured (OUTLINE_BASE_URL / OUTLINE_API_KEY)');
  }
  const res = await fetch(`${OUTLINE_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OUTLINE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Outline API error ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Normalize Outline document to the shape frontend expects */
function normalizeDoc(doc) {
  return {
    name: doc.id,
    title: doc.title || '',
    content: doc.text || '',
    published: doc.publishedAt ? 1 : 0,
    creation: doc.createdAt,
    modified: doc.updatedAt,
    collectionId: doc.collectionId || null,
  };
}

// --- Routes ---

export function setupKbRoutes(app) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
        cb(null, true);
      } else {
        cb(new Error('Only .md files are allowed'));
      }
    },
  });

  // GET /api/kb/providers — list all provider configs (masked)
  app.get('/api/kb/providers', requireAuth, async (_req, res) => {
    try {
      const raw = await readConfig();
      const config = mergeEnvDefaults(raw);
      const masked = maskConfig(config);

      // Attach provider metadata
      const result = {};
      for (const [type, Provider] of Object.entries(PROVIDERS)) {
        result[type] = {
          type,
          label: Provider.label,
          fields: Provider.fields,
          comingSoon: Provider.comingSoon || false,
          config: masked.providers[type] || null,
        };
      }

      res.json({ providers: result });
    } catch (err) {
      logger.error('GET /api/kb/providers error', { error: err.message });
      res.status(500).json({ error: 'Failed to load providers' });
    }
  });

  // PUT /api/kb/providers/:type — save provider config
  app.put('/api/kb/providers/:type', requireAuth, async (req, res) => {
    try {
      const { type } = req.params;
      const Provider = getProvider(type);
      if (!Provider) return res.status(400).json({ error: `Unknown provider: ${type}` });

      const config = await readConfig();
      const body = req.body || {};

      config.providers[type] = {
        label: Provider.label,
        base_url: body.base_url || '',
        api_key: body.api_key || '',
        ...(body.workspace_id !== undefined && { workspace_id: body.workspace_id }),
        ...(body.space_key !== undefined && { space_key: body.space_key }),
        ...(body.org_id !== undefined && { org_id: body.org_id }),
        is_active: body.is_active !== false,
        source: 'manual',
        last_test_at: config.providers[type]?.last_test_at || null,
        last_test_status: config.providers[type]?.last_test_status || null,
      };

      await writeConfig(config);
      logger.info('KB provider config saved', { type });
      res.json({ ok: true });
    } catch (err) {
      logger.error('PUT /api/kb/providers/:type error', { error: err.message });
      res.status(500).json({ error: 'Failed to save provider config' });
    }
  });

  // POST /api/kb/providers/:type/test — test connection
  app.post('/api/kb/providers/:type/test', requireAuth, async (req, res) => {
    try {
      const { type } = req.params;
      const Provider = getProvider(type);
      if (!Provider) return res.status(400).json({ error: `Unknown provider: ${type}` });

      // Build config: merge stored/env with any body overrides
      const raw = await readConfig();
      const merged = mergeEnvDefaults(raw);
      const storedCfg = merged.providers[type] || {};
      const body = req.body || {};

      const testConfig = {
        base_url: body.base_url || storedCfg.base_url || '',
        api_key: body.api_key || storedCfg.api_key || '',
        workspace_id: body.workspace_id || storedCfg.workspace_id || '',
        space_key: body.space_key || storedCfg.space_key || '',
        org_id: body.org_id || storedCfg.org_id || '',
      };

      const result = await Provider.testConnection(testConfig);

      // Persist test result
      const config = await readConfig();
      if (config.providers[type]) {
        config.providers[type].last_test_at = new Date().toISOString();
        config.providers[type].last_test_status = result.ok ? 'OK' : result.message;
        await writeConfig(config);
      }

      res.json(result);
    } catch (err) {
      logger.error('POST /api/kb/providers/:type/test error', { error: err.message });
      res.status(500).json({ ok: false, message: err.message });
    }
  });

  // POST /api/kb/articles/import/preview — parse uploaded MD files, return preview (no save)
  app.post('/api/kb/articles/import/preview', requireAuth, upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

      const previews = files.map((f) => {
        const content = f.buffer.toString('utf-8');
        const lines = content.split('\n');
        // Extract title from first # heading or filename
        const headingLine = lines.find((l) => /^#\s+/.test(l));
        const title = headingLine ? headingLine.replace(/^#+\s+/, '').trim() : f.originalname.replace(/\.md$/i, '');
        const preview = lines.slice(0, 5).join('\n');

        return {
          filename: f.originalname,
          size: f.size,
          title,
          preview,
          lineCount: lines.length,
        };
      });

      res.json({ files: previews });
    } catch (err) {
      logger.error('POST /api/kb/articles/import/preview error', { error: err.message });
      res.status(500).json({ error: 'Preview failed' });
    }
  });

  // POST /api/kb/articles/import — import MD files into Outline
  app.post('/api/kb/articles/import', requireAuth, upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

      const collectionId = req.body.collectionId;
      if (!collectionId) return res.status(400).json({ error: 'collectionId is required' });

      const results = { created: 0, errors: [] };

      for (const f of files) {
        try {
          const content = f.buffer.toString('utf-8');
          const lines = content.split('\n');
          const headingLine = lines.find((l) => /^#\s+/.test(l));
          const title = headingLine ? headingLine.replace(/^#+\s+/, '').trim() : f.originalname.replace(/\.md$/i, '');

          const data = await outlineApi('documents.create', {
            title,
            text: content,
            collectionId,
            publish: true,
          });
          if (data.data) results.created++;
        } catch (fileErr) {
          results.errors.push({ filename: f.originalname, error: fileErr.message });
        }
      }

      logger.info('KB import completed', { created: results.created, errors: results.errors.length });
      res.json(results);
    } catch (err) {
      logger.error('POST /api/kb/articles/import error', { error: err.message });
      res.status(500).json({ error: 'Import failed' });
    }
  });

  // GET /api/kb/collections — list Outline collections for the dropdown
  app.get('/api/kb/collections', requireAuth, async (_req, res) => {
    try {
      const data = await outlineApi('collections.list', {});
      const collections = (data.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        documentCount: c.documents?.length || 0,
      }));
      res.json({ data: collections });
    } catch (err) {
      logger.error('GET /api/kb/collections error', { error: err.message });
      res.status(500).json({ error: 'Failed to load collections' });
    }
  });

  // GET /api/kb/articles/:id — get single Outline document with content
  app.get('/api/kb/articles/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = await outlineApi('documents.info', { id });
      res.json({ data: data.data ? normalizeDoc(data.data) : null });
    } catch (err) {
      logger.error('GET /api/kb/articles/:id error', { error: err.message });
      res.status(err.status || 500).json({ error: 'Failed to load article' });
    }
  });

  // PUT /api/kb/articles/:id — update Outline document
  app.put('/api/kb/articles/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, published } = req.body || {};

      // Update content/title
      const updateBody = { id };
      if (title !== undefined) updateBody.title = title;
      if (content !== undefined) updateBody.text = content;
      const data = await outlineApi('documents.update', updateBody);

      // Handle publish/unpublish
      if (published !== undefined) {
        try {
          if (published) {
            await outlineApi('documents.publish', { id });
          } else {
            await outlineApi('documents.unpublish', { id });
          }
        } catch (pubErr) {
          logger.warn('KB article publish/unpublish failed', { id, error: pubErr.message });
        }
      }

      logger.info('KB article updated', { id });
      res.json({ data: data.data ? normalizeDoc(data.data) : null });
    } catch (err) {
      logger.error('PUT /api/kb/articles/:id error', { error: err.message });
      res.status(err.status || 500).json({ error: 'Failed to update article' });
    }
  });

  // POST /api/kb/articles — create new Outline document
  app.post('/api/kb/articles', requireAuth, async (req, res) => {
    try {
      const { title, content, published, collectionId } = req.body || {};
      if (!title) return res.status(400).json({ error: 'Title is required' });
      if (!collectionId) return res.status(400).json({ error: 'collectionId is required' });

      const data = await outlineApi('documents.create', {
        title,
        text: content || '',
        collectionId,
        publish: !!published,
      });

      logger.info('KB article created', { title, collectionId });
      res.json({ data: data.data ? normalizeDoc(data.data) : null });
    } catch (err) {
      logger.error('POST /api/kb/articles error', { error: err.message });
      res.status(err.status || 500).json({ error: 'Failed to create article' });
    }
  });

  // DELETE /api/kb/articles/:id — soft-delete Outline document
  app.delete('/api/kb/articles/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await outlineApi('documents.delete', { id });
      logger.info('KB article deleted', { id });
      res.json({ ok: true });
    } catch (err) {
      logger.error('DELETE /api/kb/articles/:id error', { error: err.message });
      res.status(err.status || 500).json({ error: 'Failed to delete article' });
    }
  });

  // GET /api/kb/articles — list Outline documents across all collections
  app.get('/api/kb/articles', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.query;
      const body = {
        sort: 'updatedAt',
        direction: 'DESC',
        limit: 100,
      };
      if (collectionId) body.collectionId = collectionId;

      const data = await outlineApi('documents.list', body);
      const articles = (data.data || []).map(normalizeDoc);
      res.json({ data: articles });
    } catch (err) {
      logger.error('GET /api/kb/articles error', { error: err.message });
      res.status(err.status || 500).json({ error: 'Failed to load articles' });
    }
  });
}
