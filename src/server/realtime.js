import logger from './logger.js';
import { requireAuth } from './requireAuth.js';

// chatId (string) -> Set<Response>
const chatIdToClients = new Map();

// Helper to write SSE event
function writeSse(res, eventName, data) {
  try {
    if (eventName) res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    // Ignore write errors; connection likely closed
  }
}

export function registerSse(app) {
  app.get('/api/events/stream', requireAuth, (req, res) => {
    const chatIdRaw = req.user?.tg_chat_id;
    const chatId = chatIdRaw != null ? String(chatIdRaw) : undefined;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chat id in auth context' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial hello
    writeSse(res, 'hello', { ok: true, chatId });

    // Register client
    const set = chatIdToClients.get(chatId) || new Set();
    set.add(res);
    chatIdToClients.set(chatId, set);
    logger.info('SSE client connected', { chatId, clients: set.size });

    // Heartbeat ping
    const ping = setInterval(() => {
      writeSse(res, 'ping', { t: Date.now() });
    }, 25000);

    // Cleanup
    const cleanup = () => {
      clearInterval(ping);
      const current = chatIdToClients.get(chatId);
      if (current) {
        current.delete(res);
        if (current.size === 0) chatIdToClients.delete(chatId);
      }
      logger.info('SSE client disconnected', { chatId, remaining: chatIdToClients.get(chatId)?.size || 0 });
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
  });
}

export function broadcastToChat(chatId, payload, eventName = 'tg-notification') {
  const key = chatId != null ? String(chatId) : undefined;
  if (!key) return;
  const set = chatIdToClients.get(key);
  if (!set || set.size === 0) return;
  for (const res of set) {
    writeSse(res, eventName, payload);
  }
}

export function broadcastToChats(chatIds, payload, eventName = 'tg-notification') {
  if (!Array.isArray(chatIds)) return;
  for (const id of chatIds) {
    broadcastToChat(id, payload, eventName);
  }
}


