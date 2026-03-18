import { Client } from '@opensearch-project/opensearch';

class Logger {
  constructor() {
    this.env = process.env || {};
    this.os_client = null;
    this.indexPrefix = this.env.OPENSEARCH_BACKEND_INDEX_PREFIX || 'staff-portal-local-backend';
    this.isDevelopment = this.env.NODE_ENV === 'local';
    this.victoriaLogsEnabled = this.env.VICTORIA_LOGS_SEND_LOGS !== 'false';
    this.victoriaLogsBaseUrl = this.env.VICTORIA_LOGS_URL || '';
    if (this.victoriaLogsBaseUrl) {
      this.victoriaLogsUrl = new URL('/insert/jsonline', this.victoriaLogsBaseUrl);
      this.victoriaLogsUrl.searchParams.append('_stream_fields', 'service,environment');
      this.victoriaLogsUrl.searchParams.append('_msg_field', 'message');
      this.victoriaLogsUrl.searchParams.append('_time_field', 'timestamp');
    } else {
      this.victoriaLogsUrl = null;
    }
    this.opensearchEnabled = this.env.OPENSEARCH_SEND_LOGS !== 'false';
    this.opensearchErrorCount = 0;
    this.maxOpensearchErrors = 10; // Максимальное количество ошибок перед отключением
    this.victoriaErrorCount = 0;
    this.maxVictoriaErrors = 10;
    this.victoriaLogsTimeoutMs = Number(this.env.VICTORIA_LOGS_TIMEOUT_MS) || 5000;
    this.victoriaBackoffBaseMs = Number(this.env.VICTORIA_LOGS_BACKOFF_BASE_MS) || 5000;
    this.victoriaBackoffFactor = Number(this.env.VICTORIA_LOGS_BACKOFF_FACTOR) || 3;
    this.victoriaBackoffCapMs = Number(this.env.VICTORIA_LOGS_BACKOFF_CAP_MS) || 3600000;
    this.victoriaBackoffIndex = 0;
    this.victoriaNextAttemptAt = 0;
    
    // Настройка уровня логирования
    this.logLevel = this.env.LOG_LEVEL || 'info';
    this.logLevels = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    };
    
    // Инициализируем OpenSearch асинхронно только если он включен
    if (this.opensearchEnabled) {
      this.initializeOpenSearch().catch(error => {
        console.error('Ошибка инициализации OpenSearch:', error.message);
      });
    } else {
      console.log('ℹ️ OpenSearch отключен (OPENSEARCH_SEND_LOGS=false)');
    }
  }

  async initializeOpenSearch() {
    const opensearchUrl = this.env.OPENSEARCH_URL;
    const username = this.env.OPENSEARCH_USERNAME;
    const password = this.env.OPENSEARCH_PASSWORD;
    const sslVerify = this.env.OPENSEARCH_SSL_VERIFY !== 'false';

    if (!opensearchUrl) {
      process.stderr.write('OPENSEARCH_URL не задан, логирование невозможно\n');
      process.exit(1);
    }

    try {
      let normalizedUrl = opensearchUrl;
      if (!normalizedUrl.includes('/_cluster') && !normalizedUrl.includes('/_cat')) {
        normalizedUrl = normalizedUrl.endsWith('/') ? normalizedUrl : normalizedUrl + '/';
      }
      this.os_client = new Client({
        node: normalizedUrl,
        auth: {
          username: username || 'admin',
          password: password || 'admin'
        },
        ssl: {
          rejectUnauthorized: sslVerify
        },
        maxRetries: 3,
        requestTimeout: 30000,
        sniffOnStart: false,
        headers: {
          'Content-Type': 'application/json'
        },
        apiVersion: '2.11.0'
      });
      await this.os_client.ping();
      try {
        await this.os_client.info();
      } catch (error) {
        // Не выводим предупреждение
      }
    } catch (error) {
      process.stderr.write(`Не удалось подключиться к OpenSearch: ${error.message}\n`);
      if (error.meta && error.meta.body) {
        process.stderr.write(`Детали ошибки подключения: ${JSON.stringify(error.meta.body, null, 2)}\n`);
      }
      process.exit(1);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLogMessage(level, message, data = {}) {
    const { tg_username, employeename, tg_chat_id, ...payloadData } = data;
    
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message: message,
      service: 'staff-focus-app',
      environment: this.env.NODE_ENV || 'local',
      payload: payloadData
    };
    
    // Явно поднимаем tg_username, employeename, tg_chat_id на верхний уровень, если есть
    if (tg_username) logEntry.tg_username = tg_username;
    if (employeename) logEntry.employeename = employeename;
    if (tg_chat_id) logEntry.tg_chat_id = tg_chat_id;
    
    return logEntry;
  }

  async sendToOpenSearch(logEntry) {
    if (!this.os_client) return;
    if (!this.opensearchEnabled) return;
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const indexName = `${this.indexPrefix}-${year}.${month}`;
      try {
        const opensearchUrl = this.env.OPENSEARCH_URL;
        const username = this.env.OPENSEARCH_USERNAME || 'admin';
        const password = this.env.OPENSEARCH_PASSWORD || 'admin';
        const apiEndpoints = [
          `${opensearchUrl}/${indexName}/_doc`,
          `${opensearchUrl}/_doc/${indexName}`,
          `${opensearchUrl}/api/index_patterns/${indexName}/_doc`,
          `${opensearchUrl.replace('/app', '')}/${indexName}/_doc`
        ];
        let response = null;
        let lastError = null;
        for (const endpoint of apiEndpoints) {
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
              },
              body: JSON.stringify(logEntry)
            });
            if (response.ok) {
              break;
            } else {
              lastError = `${response.status} ${response.statusText}`;
            }
          } catch (error) {
            lastError = error.message;
          }
        }
        if (response.ok) {
          return;
        } else {
          // Не выводим предупреждение
        }
      } catch (httpError) {
        // Не выводим предупреждение
      }
      const result = await this.os_client.index({
        index: indexName,
        body: logEntry,
        refresh: false
      });
    } catch (error) {
      this.opensearchErrorCount++;
      process.stdout.write(`WARN: OpenSearch ошибка подключения: ${error.message}\n`);
      if (this.opensearchErrorCount >= this.maxOpensearchErrors) {
        process.stderr.write('OpenSearch отключен после множественных ошибок. Логирование невозможно.\n');
        process.exit(1);
      }
    }
  }

  async sendToVictoriaLogs(logEntry) {
    if (!this.victoriaLogsEnabled) return;
    if (!this.victoriaLogsUrl) return;
    const now = Date.now();
    if (now < this.victoriaNextAttemptAt) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.victoriaLogsTimeoutMs);
    try {
      const response = await fetch(this.victoriaLogsUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry),
        signal: controller.signal
      });
      this.victoriaErrorCount = 0;
      this.victoriaBackoffIndex = 0;
      this.victoriaNextAttemptAt = 0;
      if (!response.ok) {
        throw new Error(`VictoriaLogs HTTP ошибка: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.victoriaErrorCount++;
      process.stdout.write(`WARN: VictoriaLogs ошибка подключения: ${error.message}\n`);
      const delayMs = this.getVictoriaBackoffDelayMs();
      this.victoriaNextAttemptAt = Date.now() + delayMs;
      this.victoriaBackoffIndex += 1;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getVictoriaBackoffDelayMs() {
    const exponent = Math.min(this.victoriaBackoffIndex, 30);
    const maxDelay = Math.min(
      this.victoriaBackoffCapMs,
      this.victoriaBackoffBaseMs * (this.victoriaBackoffFactor ** exponent)
    );
    // Full jitter: random delay between 0 and maxDelay
    return Math.floor(Math.random() * maxDelay);
  }

  formatConsoleMessage(level, message, data) {
    const timestamp = this.getTimestamp();
    const levelUpper = level.toUpperCase();
    
    // Цветовые коды для разных уровней
    const colors = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[level] || colors.info;
    const reset = colors.reset;
    
    let consoleMessage = `[${timestamp}] ${color}[${levelUpper}]${reset} ${message}`;
    
    // Для debug уровня выводим все данные
    if (level === 'debug') {
      if (Object.keys(data).length > 0) {
        consoleMessage += `\n  Data: ${JSON.stringify(data, null, 2)}`;
      }
      return consoleMessage;
    }
    
    // Для ошибок добавляем дополнительную информацию
    if (level === 'error' && data.error) {
      consoleMessage += `\n  Error: ${data.error.message}`;
      if (data.error.stack) {
        consoleMessage += `\n  Stack: ${data.error.stack}`;
      }
      if (data.error.name) {
        consoleMessage += `\n  Type: ${data.error.name}`;
      }
    }
    
    // Добавляем контекстную информацию для ошибок
    if (level === 'error' && Object.keys(data).length > 0) {
      const contextData = { ...data };
      delete contextData.error; // Убираем error, так как он уже обработан выше
      
      if (Object.keys(contextData).length > 0) {
        consoleMessage += `\n  Context: ${JSON.stringify(contextData, null, 2)}`;
      }
    }
    
    return consoleMessage;
  }

  async log(level, message, data = {}) {
    // Проверяем уровень логирования
    const currentLevel = this.logLevels[level] || 1;
    const configuredLevel = this.logLevels[this.logLevel] || 1;
    
    if (currentLevel < configuredLevel) {
      return; // Пропускаем логи ниже настроенного уровня
    }
    
    const logEntry = this.formatLogMessage(level, message, data);
    
    // Логирование в консоль
    const consoleMessage = this.formatConsoleMessage(level, message, data);
    
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'debug':
        console.log(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }

    // Отправка в OpenSearch
    await this.sendToOpenSearch(logEntry);
    // Отправка в VictoriaLogs
    this.sendToVictoriaLogs(logEntry).catch((error) => {
      process.stdout.write(`WARN: VictoriaLogs ошибка отправки: ${error.message}\n`);
    });
  }

  async info(message, data = {}) {
    await this.log('info', message, data);
  }

  async warn(message, data = {}) {
    await this.log('warn', message, data);
  }

  async error(message, data = {}) {
    await this.log('error', message, data);
  }

  async debug(message, data = {}) {
    await this.log('debug', message, data);
  }

  // Метод для получения текущего уровня логирования
  getLogLevel() {
    return this.logLevel;
  }

  // Метод для проверки, включен ли debug режим
  isDebugEnabled() {
    return this.logLevels[this.logLevel] <= this.logLevels['debug'];
  }

  // Методы для логирования HTTP запросов
  async logRequest(req, res, duration) {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    await this.log(level, `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, logData);
  }

  // Методы для логирования API запросов
  async logApiRequest(service, endpoint, status, duration, data = {}) {
    const logData = {
      service,
      endpoint,
      status,
      duration,
      ...data
    };

    const level = status >= 400 ? 'warn' : 'info';
    await this.log(level, `API ${service}: ${endpoint} - ${status} (${duration}ms)`, logData);
  }

  // Методы для логирования ошибок
  async logError(error, context = {}) {
    const logData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        errno: error.errno
      },
      ...context
    };

    await this.error(`Error: ${error.message}`, logData);
  }
}

// Создаем единственный экземпляр логгера
const logger = new Logger();

// Универсальный логгер для Express, автоматически добавляет user-поля из req.user
export function logWithUser(req, level, message, data = {}) {
  const userFields = req && req.user
    ? {
        tg_username: req.user.tg_username,
        employeename: req.user.employeename,
        tg_chat_id: req.user.tg_chat_id
      }
    : {};
  logger[level](message, { ...userFields, ...data });
}

// Создаем объект loggerWithUser с методами info, error, warn, debug
export const loggerWithUser = {
  info: (req, message, data = {}) => logWithUser(req, 'info', message, data),
  error: (req, message, data = {}) => logWithUser(req, 'error', message, data),
  warn: (req, message, data = {}) => logWithUser(req, 'warn', message, data),
  debug: (req, message, data = {}) => logWithUser(req, 'debug', message, data)
};

export default logger; 