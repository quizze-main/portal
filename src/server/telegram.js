import fetch from 'node-fetch';
import logger from './logger.js';

const env = process.env || {};
const SHOW_DEV_TO_PUBLIC = env.NODE_ENV === 'local' && env.SHOW_DEV_TO_PUBLIC === 'true';

async function getNgrokUrl() {
  const maxRetries = 6; // 6 попыток = 31.5 секунд всего
  const baseDelay = 500; // начальная задержка 500мс
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('http://ngrok:4040/api/tunnels');
      const data = await response.json();
      const httpsTunnel = data.tunnels.find(tunnel => tunnel.proto === 'https');
      if (!httpsTunnel) throw new Error('No HTTPS tunnel found');
      return httpsTunnel.public_url;
    } catch (error) {
      const delay = baseDelay * Math.pow(2, attempt); // экспоненциальная задержка
      logger.warn(`Ошибка получения URL ngrok (попытка ${attempt + 1}/${maxRetries})`, { error: error.message, attempt: attempt + 1, maxRetries });
      if (attempt === maxRetries - 1) return null;
      await new Promise(lve => setTimeout(resolve, delay));
    }
  }
  logger.error('Не удалось получить URL ngrok');
  return null;
}

// Функция для отправки сообщения в Telegram
export async function sendMessage(chatId, text, options = {}) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "MarkdownV2",
      // Явно включаем звук уведомления, если пользователь не заглушил чат у себя
      disable_notification: false,
      // Разрешаем переопределение через options при необходимости
      ...options
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to send message: ${data.description}`);
  }
  return data;
}

// Функция для установки webhook
export async function setTelegramWebhook(webhookUrl) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const webhookEndpoint = `${webhookUrl}/api/telegram`;
  logger.info('Setting Telegram webhook URL', { webhookEndpoint });

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookEndpoint,
      allowed_updates: ['message', 'callback_query']
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to set webhook: ${data.description}`);
  }
  
  logger.info('Telegram webhook set successfully', { webhookEndpoint });
  return data;
}

// Функция для установки меню бота
export async function setBotMenu() {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  let appUrl = env.LOOV_IS_STAFF_PORTAL_URL;
  if (SHOW_DEV_TO_PUBLIC) {
    const ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) appUrl = ngrokUrl;
    else console.warn('SHOW_DEV_TO_PUBLIC=true, но ngrok url не получен, используем LOOV_IS_STAFF_PORTAL_URL');
  }
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  if (!appUrl) {
    throw new Error('LOOV_IS_STAFF_PORTAL_URL is not set');
  } else {
    logger.info('App URL for Telegram menu', { appUrl });
  }

  // Добавляем версию для принудительного обновления кеша
  const version = env.COMMIT_HASH || env.SHORT_HASH || Date.now().toString();
  const appUrlWithVersion = `${appUrl}?v=${version}`;
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: 'Открыть приложение',
        web_app: {
          url: appUrlWithVersion
        }
      }
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to set menu button: ${data.description}`);
  } else {
    logger.info('Меню бота установлено на странице', { appUrl });
  }
  return data;
}

/**
 * @swagger
 * /api/telegram:
 *   post:
 *     summary: Telegram Webhook
 *     description: Обработчик webhook от Telegram Bot API
 *     tags: [Telegram API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Telegram Update object
 *     responses:
 *       200:
 *         description: Webhook обработан успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
// Обработчик Telegram webhook
export async function handleTelegramWebhook(req, res) {
  try {
    logger.info('Telegram webhook received', { body: req.body });

    if (!req.body) {
      return res.json({ ok: true });
    }

    const updateTypes = [
      'message', 'edited_message', 'channel_post', 'edited_channel_post',
      'callback_query', 'inline_query', 'chosen_inline_result',
      'shipping_query', 'pre_checkout_query', 'poll', 'poll_answer',
      'my_chat_member', 'chat_member', 'chat_join_request'
    ];

    const updateType = updateTypes.find(type => req.body[type]);
    
    if (updateType) {
      logger.info(`Processing ${updateType}`);
      
      if (updateType === 'message' || updateType === 'edited_message') {
        const msg = req.body[updateType];
        
        if (!msg.chat || !msg.chat.id) {
          return res.json({ ok: true });
        }

        const chatId = msg.chat.id;
        const text = msg.text || '';

        if (text.startsWith('/')) {
          const command = text.split(' ')[0].toLowerCase();
          
          switch (command) {
            case '/start':
              await sendMessage(chatId, '👋 Привет! Я бот помощи членам команды Loov. Используйте кнопку меню для открытия приложения.');
              break;
            case '/help':
              await sendMessage(chatId, '🤖 Доступные команды:\n/start - Начать работу\n/help - Показать помощь\n/clearcache - Очистить кеш приложения');
              break;
            case '/clearcache':
              await sendMessage(chatId, '🗑️ Кеш приложения очищен! Теперь закройте и снова откройте приложение через кнопку меню.');
              break;
            default:
              await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для списка команд.');
          }
        } else if (text) {
          await sendMessage(chatId, `Echo: ${text}`);
        }
      }
      else if (updateType === 'callback_query') {
        const callback = req.body.callback_query;
        
        if (!callback.message || !callback.message.chat || !callback.message.chat.id) {
          return res.json({ ok: true });
        }

        const chatId = callback.message.chat.id;
        const data = callback.data;

        await sendMessage(chatId, `Вы выбрали: ${data}`);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    logger.logError(error, { context: 'handleTelegramWebhook' });
    res.json({ ok: true });
  }
}

/**
 * @swagger
 * /api/telegram/get-webhook:
 *   get:
 *     summary: Получение информации о webhook
 *     description: Получает информацию о текущем webhook от Telegram Bot API
 *     tags: [Telegram API]
 *     responses:
 *       200:
 *         description: Информация о webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     has_custom_certificate:
 *                       type: boolean
 *                     pending_update_count:
 *                       type: number
 *       500:
 *         description: Ошибка получения информации
 */
// Получение информации о webhook
export async function getWebhookInfo(req, res) {
  try {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not set' });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.logError(error, { context: 'getWebhookInfo' });
    res.status(500).json({ error: error.message });
  }
}

// Регистрация всех Telegram эндпоинтов
export function setupTelegramRoutes(app) {
  // Telegram API endpoints (БЕЗ авторизации)
  app.post('/api/telegram', handleTelegramWebhook);
  app.get('/api/telegram/get-webhook', getWebhookInfo);
  
  logger.info('Telegram routes registered');
}

// Обновление backend_url для интеграции по типу
export async function updateIntegrationCustomBackendUrl() {
  const integrationType = env.FRAPPE_INTEGRATION_TYPE;
  let backendUrl = null;
  if (SHOW_DEV_TO_PUBLIC) {
    const ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) backendUrl = ngrokUrl;
    else {
      logger.warn('SHOW_DEV_TO_PUBLIC=true, но ngrok url не получен, backend_url не будет обновлён');
      return;
    }
  } else {
    logger.info('SHOW_DEV_TO_PUBLIC не включён, Frappe LoovIS integration settings->backend_url не будет обновлён');
    return;
  }
  if (!integrationType) {
    logger.warn('FRAPPE_INTEGRATION_TYPE не задан, backend_url не будет обновлён');
    return;
  }
  if (!backendUrl) {
    logger.warn('backendUrl не определён, backend_url не будет обновлён');
    return;
  }
  const FRAPPE_BASE_URL = env.FRAPPE_BASE_URL;
  const FRAPPE_API_KEY = env.FRAPPE_API_KEY;
  const FRAPPE_API_SECRET = env.FRAPPE_API_SECRET;
  if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    logger.warn('FRAPPE_API_KEY/SECRET не заданы, backend_url не будет обновлён');
    return;
  }
  try {
    // Найти LoovIS integration settings по типу
    const searchUrl = `${FRAPPE_BASE_URL}/api/resource/LoovIS integration settings?filters=[[\"type\",\"=\",\"${integrationType}\"]]`;
    const searchResp = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });
    if (!searchResp.ok) {
      logger.warn('Ошибка поиска LoovIS integration settings по типу', { status: searchResp.status });
      return;
    }
    const searchData = await searchResp.json();
    const integration = searchData.data && searchData.data.length > 0 ? searchData.data[0] : null;
    if (!integration) {
      logger.warn('LoovIS integration settings с таким типом не найдена', { integrationType });
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
    // Обновить backend_url
    const updateUrl = `${FRAPPE_BASE_URL}/api/resource/LoovIS integration settings/${integration.name}`;
    const updateResp = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ backend_url: backendUrl })
    });
    if (!updateResp.ok) {
      logger.warn('Ошибка обновления Frappe backend_url', { status: updateResp.status });
      return;
    }
    logger.info('Frappe backend_url успешно обновлён!', { integrationType, backendUrl });
  } catch (error) {
    logger.warn('Ошибка при обновлении Frappe backend_url', { error: error.message });
  }
}

// Инициализация Telegram бота при запуске модуля
export async function initializeTelegramBot() {
  // Проверяем необходимые переменные окружения
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN не задан, Telegram бот не инициализирован');
    return;
  }
  
  if (!env.LOOV_IS_STAFF_PORTAL_URL) {
    logger.warn('LOOV_IS_STAFF_PORTAL_URL не задан, Telegram бот не инициализирован');
    return;
  }

  // Устанавливаем меню бота
  await setBotMenu().catch(error => logger.logError(error, { context: 'setBotMenu' }));
  // Обновляем backend_url для интеграции
  await updateIntegrationCustomBackendUrl();
  
  // В продакшн режиме устанавливаем webhook
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'development') {
    await setTelegramWebhook(env.LOOV_IS_STAFF_PORTAL_URL).catch(error => 
      logger.logError(error, { context: 'setTelegramWebhook' })
    );
  }
} 