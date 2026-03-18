import fetch from 'node-fetch';
import logger from './logger.js';
import { sendMessage } from './telegram.js';
import { broadcastToChat } from './realtime.js';

const env = process.env || {};
const ENABLE_TG_AGGREGATION = String(env.ENABLE_TG_AGGREGATION || 'false') === 'true';
const TG_AGGREGATION_WINDOW_MS = Number(env.TG_AGGREGATION_WINDOW_MS || 1200);

// Конфигурация Frappe
const FRAPPE_BASE_URL = env.FRAPPE_BASE_URL || 'http://localhost:8000';
const FRAPPE_API_KEY = env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = env.FRAPPE_API_SECRET;

// Конфигурация External API
const EXTERNAL_API_KEY = env.EXTERNAL_API_KEY;

// SMS gateway configuration (generic HTTP JSON webhook)
const SMS_HTTP_URL = env.SMS_HTTP_URL || '';
const SMS_HTTP_BEARER = env.SMS_HTTP_BEARER || '';
const SMS_HTTP_BASIC = env.SMS_HTTP_BASIC || '';
const SMS_HTTP_METHOD = (env.SMS_HTTP_METHOD || 'POST').toUpperCase();



// Общий middleware для External API (логирование + проверка API ключа)
function externalApiMiddleware(req, res, next) {
  // Логирование запроса
  logger.info('External API request received', {
    endpoint: req.path,
    url: req.url,
    method: req.method,
    contentType: req.get('Content-Type'),
    bodyType: typeof req.body,
    bodyKeys: req.body ? Object.keys(req.body) : null,
    bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 200) : null
  });

  // Дополнительное логирование в debug режиме
  if (logger.isDebugEnabled()) {
    logger.debug('External API request debug details', {
      endpoint: req.path,
      url: req.url,
      method: req.method,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      accept: req.get('Accept'),
      authorization: req.get('Authorization') ? 'present' : 'absent',
      xApiKey: req.get('x-api-key') ? 'present' : 'absent',
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : null,
      bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
      body: req.body,
      headers: Object.keys(req.headers).reduce((acc, key) => {
        if (!['authorization', 'x-api-key', 'cookie'].includes(key.toLowerCase())) {
          acc[key] = req.get(key);
        }
        return acc;
      }, {}),
      ip: req.ip,
      hostname: req.hostname,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString()
    });
  }
  
  // Проверка API ключа
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!EXTERNAL_API_KEY) {
    logger.error('EXTERNAL_API_KEY not configured');
    return res.status(500).json({ error: 'External API key not configured' });
  }
  
  if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
    logger.error('Invalid external API key', { 
      providedKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'not provided',
      expectedKey: `${EXTERNAL_API_KEY.substring(0, 8)}...`
    });
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Функция для получения сотрудника по ID из Frappe
async function getEmployeeById(employeeId) {
  if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    throw new Error('Frappe API credentials not configured');
  }

  const url = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}?fields=["user_id", "designation", "employee_name", "custom_tg_username", "custom_tg_chat_id", "reports_to", "name", "department", "image", "company_email", "cell_number", "mobile_no", "personal_phone", "custom_phone", "personal_email"]`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Frappe API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

// Регистрация всех внешних API эндпоинтов
export function setupExternalApiRoutes(app) {
  // In-memory aggregator for Telegram messages per chatId
  const aggBuffers = new Map(); // chatId -> { items: Array<{ text, button_url, opts }>, timer: NodeJS.Timeout }
  const enqueueAgg = (chatId, item) => {
    const entry = aggBuffers.get(chatId) || { items: [], timer: null };
    entry.items.push(item);
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(async () => {
      try {
        const items = entry.items.splice(0, entry.items.length);
        aggBuffers.delete(chatId);
        if (items.length === 0) return;
        if (items.length === 1) {
          const it = items[0];
          await sendMessage(chatId, it.text, it.opts);
          return;
        }
        // Compose aggregated notification
        const maxLines = 5;
        const bullets = items.slice(0, maxLines).map((it) => `• ${it.text.split('\n')[0].slice(0, 120)}`);
        const more = items.length > maxLines ? `\n… и ещё ${items.length - maxLines}` : '';
        const header = `Новых задач: ${items.length}`;
        const text = `${header}\n${bullets.join('\n')}${more}`;
        // Prefer first button url, converted to WebApp URL, or list page
        const firstUrl = items.find(it => it.button_url)?.button_url;
        const appBase = env.LOOV_IS_STAFF_PORTAL_URL || undefined;
        const toWebAppUrl = (u) => {
          if (!u) return appBase || undefined;
          try {
            const s = String(u);
            const tme = /https:\/\/t\.me\/[^?]+\?startapp=([^&]+)/i.exec(s);
            if (tme && appBase) {
              const trimmed = String(appBase).replace(/\/$/, '');
              return `${trimmed}/?tgWebAppStartParam=${encodeURIComponent(tme[1])}`;
            }
            const direct = /tgWebAppStartParam=([^&]+)/i.exec(s);
            if (direct) return s;
            return appBase || s;
          } catch {
            return appBase || undefined;
          }
        };
        const webAppUrl = toWebAppUrl(firstUrl);
        const reply_markup = webAppUrl
          ? { inline_keyboard: [[{ text: 'Посмотреть', web_app: { url: String(webAppUrl) } }]] }
          : undefined;
        await sendMessage(chatId, text, {
          disable_notification: false,
          disable_web_page_preview: true,
          reply_markup,
        });
      } catch (e) {
        logger.warn('Telegram aggregation send failed', { error: e.message, chatId });
      }
    }, TG_AGGREGATION_WINDOW_MS);
    aggBuffers.set(chatId, entry);
  };
  
  /**
   * @swagger
   * /api/external/send-message:
   *   post:
   *     summary: Отправка сообщения сотруднику
   *     description: Отправляет сообщение конкретному сотруднику через Telegram
   *     tags: [External API]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - employee_id
   *               - message
   *             properties:
   *               employee_id:
   *                 type: string
   *                 description: ID сотрудника в Frappe
   *                 example: "EMP001"
   *               message:
   *                 type: string
   *                 description: Текст сообщения для отправки
   *                 example: "Привет! Это тестовое сообщение."
   *     responses:
   *       200:
   *         description: Сообщение успешно отправлено
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Message sent successfully"
   *                 employee_name:
   *                   type: string
   *                   example: "Иван Иванов"
   *                 chat_id:
   *                   type: string
   *                   example: "123456789"
   *       400:
   *         description: Ошибка валидации
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "employee_id is required"
   *       401:
   *         description: Неверный API ключ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Invalid API key"
   *       404:
   *         description: Сотрудник не найден
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Employee not found"
   *       500:
   *         description: Внутренняя ошибка сервера
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Failed to send message"
   *                 details:
   *                   type: string
   *                   example: "Employee chat_id not set"
   */
  app.post('/api/external/send-message', externalApiMiddleware, async (req, res) => {
    try {
      const { employee_id, message, disable_notification, disable_web_page_preview, button_url, aggregate, task_name, task_subject } = req.body;
      
      // Проверяем обязательные параметры
      if (!employee_id) {
        logger.error('Missing employee_id parameter', { 
          body: req.body,
          contentType: req.get('Content-Type')
        });
        return res.status(400).json({ error: 'employee_id is required' });
      }
      
      if (!message) {
        logger.error('Missing message parameter', { 
          body: req.body,
          contentType: req.get('Content-Type')
        });
        return res.status(400).json({ error: 'message is required' });
      }

      logger.info('Отправка сообщения сотруднику', { 
        employee_id, 
        messageLength: message.length 
      });

      // Получаем данные сотрудника из Frappe
      const employee = await getEmployeeById(employee_id);
      
      if (!employee) {
        logger.error('Employee not found', { employee_id });
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Проверяем наличие chat_id
      const chatId = employee.custom_tg_chat_id;
      
      if (!chatId || chatId === '') {
        logger.error('Employee chat_id not set', { 
          employee_id, 
          employee_name: employee.employee_name,
          custom_tg_chat_id: chatId 
        });
        return res.status(400).json({ 
          error: 'Employee chat_id not set',
          employee_name: employee.employee_name,
          employee_id: employee_id
        });
      }

      // Auto-build button_url by resolving task name if not provided
      let finalButtonUrl = button_url;
      let resolvedTaskName = task_name;

      // Helper: find task by subject for assignee (exact match, then LIKE)
      const findTaskBySubject = async (subject, assigneeId) => {
        if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) return null;
        const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\"/g, '\\\"');
        try {
          // 1) exact match
          let filters = [
            `["subject","=","${esc(subject)}"]`,
            `["custom_assignee_employee","=","${assigneeId}"]`
          ];
          let url = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${filters.join(',')}]&fields=["name"]&order_by=creation%20desc&limit_page_length=1`;
          let resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
              'Content-Type': 'application/json',
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            const name = data?.data?.[0]?.name;
            if (name) return name;
          }
          // 2) LIKE match
          filters = [
            `["subject","like","%${esc(subject)}%"]`,
            `["custom_assignee_employee","=","${assigneeId}"]`
          ];
          url = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${filters.join(',')}]&fields=["name"]&order_by=creation%20desc&limit_page_length=1`;
          resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
              'Content-Type': 'application/json',
            }
          });
          if (!resp.ok) return null;
          const data2 = await resp.json();
          return data2?.data?.[0]?.name || null;
        } catch {
          return null;
        }
      };

      // Try to resolve task by subject if name is missing
      try {
        if (!resolvedTaskName) {
          let subject = task_subject;
          if (!subject && typeof message === 'string') {
            // Ищем в кавычках: "...", '...', «...»
            let m = message.match(/"([^"]+)"/);
            if (!m) m = message.match(/'([^']+)'/);
            if (!m) m = message.match(/«([^»]+)»/);
            if (m) subject = m[1];
          }
          if (subject) {
            resolvedTaskName = await findTaskBySubject(subject, employee_id);
          }
        }
      } catch (e) {
        logger.warn('Failed to resolve task by subject', { error: e.message });
      }

      try {
        const appBase = process.env.LOOV_IS_STAFF_PORTAL_URL || '';
        // Берем имя бота из нескольких переменных окружения и нормализуем (убираем @ и пробелы)
        let botUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.TG_BOT_USERNAME || process.env.VITE_TG_BOT_USERNAME || '';
        botUsername = String(botUsername).trim().replace(/^@+/, '');
        if (!finalButtonUrl) {
          // Предпочитаем компактную ссылку на веб‑приложение (не t.me startapp),
          // чтобы Telegram не показывал большую «Bot Application» карточку
          if (appBase) {
            const trimmed = appBase.replace(/\/$/, '');
            if (resolvedTaskName) {
              const toBase64Url = (s) => Buffer.from(String(s), 'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
              const startParam = `task_${toBase64Url(resolvedTaskName)}`;
              finalButtonUrl = `${trimmed}/?tgWebAppStartParam=${encodeURIComponent(startParam)}`;
            } else {
              finalButtonUrl = `${trimmed}`;
            }
          } else if (botUsername) {
            // Фолбэк на открытие мини‑аппа через t.me, если базовый URL не задан
            if (resolvedTaskName) {
              const toBase64Url = (s) => Buffer.from(String(s), 'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
              const startParam = `task_${toBase64Url(resolvedTaskName)}`;
              finalButtonUrl = `https://t.me/${botUsername}?startapp=${encodeURIComponent(startParam)}`;
            } else {
              finalButtonUrl = `https://t.me/${botUsername}?startapp`;
            }
          }
        }
      } catch (e) {
        logger.warn('Failed to auto-build button_url from task', { error: e.message, task_name: resolvedTaskName });
      }

      // Fallback: если ссылку не удалось собрать — открываем приложение
      if (!finalButtonUrl) {
        const appBase = process.env.LOOV_IS_STAFF_PORTAL_URL || '';
        if (appBase) {
          const trimmed = appBase.replace(/\/$/, '');
          finalButtonUrl = `${trimmed}`;
        }
      }

      logger.info('Telegram message link build', {
        employee_id,
        hasTaskName: !!task_name,
        resolvedTaskName: resolvedTaskName || null,
        finalButtonUrl: finalButtonUrl || null
      });

      // Формируем компактную кнопку под сообщением, которая открывает мини‑апп внутри Telegram
      const text = message;
      let webAppUrl = finalButtonUrl;
      try {
        const appBase = process.env.LOOV_IS_STAFF_PORTAL_URL || '';
        if ((/https:\/\/t\.me\//i).test(String(webAppUrl || '')) && appBase) {
          const m = /https:\/\/t\.me\/[^?]+\?startapp=([^&]+)/i.exec(String(webAppUrl));
          const trimmed = appBase.replace(/\/$/, '');
          webAppUrl = m && m[1]
            ? `${trimmed}/?tgWebAppStartParam=${encodeURIComponent(m[1])}`
            : `${trimmed}`;
        }
      } catch {}
      const options = {
        disable_notification: disable_notification === true ? true : false,
        // Всегда убираем предпросмотр, чтобы не появлялась большая карточка
        disable_web_page_preview: true,
        reply_markup: webAppUrl ? {
          inline_keyboard: [[{
            text: resolvedTaskName ? 'Посмотреть задачу' : 'Посмотреть',
            web_app: { url: String(webAppUrl) }
          }]]
        } : undefined
      };

      if (aggregate === true || ENABLE_TG_AGGREGATION) {
        enqueueAgg(chatId, { text, button_url: finalButtonUrl, opts: options });
      } else {
        await sendMessage(chatId, text, options);
      }

      // Always broadcast to in-app listeners (Mini App open case)
      try {
        broadcastToChat(chatId, {
          text,
          button_url: finalButtonUrl || null,
          options,
          employee_id,
          employee_name: employee.employee_name,
          ts: Date.now()
        });
      } catch (e) {
        logger.warn('SSE broadcast failed', { chatId, error: e.message });
      }
      
      logger.info('Сообщение успешно отправлено', { 
        employee_id, 
        employee_name: employee.employee_name,
        chat_id: chatId,
        messageLength: message.length 
      });
      
      res.status(200).json({ 
        success: true,
        message: (aggregate === true || ENABLE_TG_AGGREGATION) ? 'Message queued for aggregation' : 'Message sent successfully',
        employee_name: employee.employee_name,
        chat_id: chatId
      });
      
    } catch (error) {
      logger.error('Ошибка отправки сообщения', { 
        error: error.message, 
        employee_id: req.body?.employee_id,
        stack: error.stack 
      });
      
      res.status(500).json({ 
        error: 'Failed to send message',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/external/send-sms:
   *   post:
   *     summary: Отправка SMS сотруднику
   *     description: Отправляет SMS сотруднику. Если указан employee_id, номер будет найден в Frappe. Можно передать phone напрямую.
   *     tags: [External API]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - message
   *             properties:
   *               employee_id:
   *                 type: string
   *                 description: ID сотрудника в Frappe
   *               phone:
   *                 type: string
   *                 description: Номер телефона в международном формате
   *               message:
   *                 type: string
   *                 description: Текст SMS
   *               append_link:
   *                 type: boolean
   *                 description: Добавить ссылку на задачу к сообщению
   *                 default: true
   *               task_name:
   *                 type: string
   *               task_subject:
   *                 type: string
   *               button_url:
   *                 type: string
   *     responses:
   *       200:
   *         description: SMS отправлено
   *       400:
   *         description: Ошибка валидации
   *       401:
   *         description: Неверный API ключ
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.post('/api/external/send-sms', externalApiMiddleware, async (req, res) => {
    try {
      if (!SMS_HTTP_URL) {
        logger.error('SMS gateway not configured');
        return res.status(500).json({ error: 'SMS gateway not configured' });
      }

      const { employee_id, phone: phoneRaw, message, append_link, task_name, task_subject, button_url } = req.body || {};

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'message is required' });
      }

      let employee = null;
      if (employee_id) {
        try {
          employee = await getEmployeeById(employee_id);
        } catch (e) {
          logger.warn('Failed to fetch employee for SMS', { employee_id, error: e.message });
        }
      }

      // Determine phone number
      let phone = String(phoneRaw || '').trim();
      if (!phone && employee) {
        phone = String(
          employee.cell_number ||
          employee.mobile_no ||
          employee.personal_phone ||
          employee.custom_phone ||
          ''
        ).trim();
      }

      if (!phone) {
        logger.error('Phone not provided and not found for employee', { employee_id });
        return res.status(400).json({ error: 'phone is required (or resolvable from employee_id)' });
      }

      // Build link similar to Telegram message route
      let finalButtonUrl = button_url || null;
      let resolvedTaskName = task_name || null;

      const findTaskBySubject = async (subject, assigneeId) => {
        if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) return null;
        const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        try {
          let filters = [
            `["subject","=","${esc(subject)}"]`
          ];
          let url = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${filters.join(',')}]&fields=["name"]&order_by=creation%20desc&limit_page_length=1`;
          let resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
              'Content-Type': 'application/json',
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            const name = data?.data?.[0]?.name;
            if (name) return name;
          }
          // LIKE fallback
          filters = [
            `["subject","like","%${esc(subject)}%"]`
          ];
          url = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${filters.join(',')}]&fields=["name"]&order_by=creation%20desc&limit_page_length=1`;
          resp = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
              'Content-Type': 'application/json',
            }
          });
          if (!resp.ok) return null;
          const data2 = await resp.json();
          return data2?.data?.[0]?.name || null;
        } catch {
          return null;
        }
      };

      try {
        if (!resolvedTaskName) {
          let subject = task_subject;
          if (!subject && typeof message === 'string') {
            let m = message.match(/"([^"]+)"/);
            if (!m) m = message.match(/'([^']+)'/);
            if (!m) m = message.match(/«([^»]+)»/);
            if (m) subject = m[1];
          }
          if (subject) {
            resolvedTaskName = await findTaskBySubject(subject);
          }
        }
      } catch (e) {
        logger.warn('Failed to resolve task by subject for SMS', { error: e.message });
      }

      try {
        const appBase = process.env.LOOV_IS_STAFF_PORTAL_URL || '';
        if (!finalButtonUrl && appBase) {
          const trimmed = appBase.replace(/\/$/, '');
          if (resolvedTaskName) {
            const toBase64Url = (s) => Buffer.from(String(s), 'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
            const startParam = `task_${toBase64Url(resolvedTaskName)}`;
            finalButtonUrl = `${trimmed}/?tgWebAppStartParam=${encodeURIComponent(startParam)}`;
          } else {
            finalButtonUrl = `${trimmed}`;
          }
        }
      } catch (e) {
        logger.warn('Failed to build task link for SMS', { error: e.message });
      }

      const shouldAppendLink = append_link !== false;
      const textToSend = String(message).trim() + (shouldAppendLink && finalButtonUrl ? ` ${String(finalButtonUrl)}` : '');

      // Send via generic HTTP gateway
      const headers = { 'Content-Type': 'application/json' };
      if (SMS_HTTP_BEARER) headers['Authorization'] = `Bearer ${SMS_HTTP_BEARER}`;
      if (SMS_HTTP_BASIC) headers['Authorization'] = `Basic ${SMS_HTTP_BASIC}`;

      const smsPayload = { to: phone, message: textToSend };
      const resp = await fetch(SMS_HTTP_URL, {
        method: SMS_HTTP_METHOD,
        headers,
        body: JSON.stringify(smsPayload)
      });

      const ok = resp.ok;
      let respText = null;
      try { respText = await resp.text(); } catch {}

      if (!ok) {
        logger.error('SMS gateway responded with error', { status: resp.status, body: respText });
        return res.status(502).json({ error: 'SMS gateway error', status: resp.status, body: respText });
      }

      logger.info('SMS sent successfully', { phone, employee_id: employee_id || null, messageLength: textToSend.length });
      return res.status(200).json({ success: true, phone, message: 'SMS sent successfully' });
    } catch (error) {
      logger.error('Ошибка отправки SMS', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Failed to send SMS', details: error.message });
    }
  });

  logger.info('External API routes registered');
}

// Инициализация внешнего API
export async function initializeExternalApi() {
  if (!EXTERNAL_API_KEY) {
    logger.warn('EXTERNAL_API_KEY не задан, внешний API не будет доступен');
  } else {
    logger.info('External API initialized', { 
      apiKeyConfigured: true,
      frappeConfigured: !!(FRAPPE_API_KEY && FRAPPE_API_SECRET)
    });
  }
} 