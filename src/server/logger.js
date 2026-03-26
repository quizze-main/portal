import { isPrismaConnected, getPrisma } from './prisma.js';

class Logger {
  constructor() {
    this.env = process.env || {};
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
    this.victoriaErrorCount = 0;
    this.maxVictoriaErrors = 10;
    this.victoriaLogsTimeoutMs = Number(this.env.VICTORIA_LOGS_TIMEOUT_MS) || 5000;
    this.victoriaBackoffBaseMs = Number(this.env.VICTORIA_LOGS_BACKOFF_BASE_MS) || 5000;
    this.victoriaBackoffFactor = Number(this.env.VICTORIA_LOGS_BACKOFF_FACTOR) || 3;
    this.victoriaBackoffCapMs = Number(this.env.VICTORIA_LOGS_BACKOFF_CAP_MS) || 3600000;
    this.victoriaBackoffIndex = 0;
    this.victoriaNextAttemptAt = 0;

    // PostgreSQL logging
    this.pgLogsEnabled = this.env.PG_LOGS_ENABLED !== 'false';
    this.pgErrorCount = 0;
    this.maxPgErrors = 10;

    this.logLevel = this.env.LOG_LEVEL || 'info';
    this.logLevels = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    };
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

    if (tg_username) logEntry.tg_username = tg_username;
    if (employeename) logEntry.employeename = employeename;
    if (tg_chat_id) logEntry.tg_chat_id = tg_chat_id;

    return logEntry;
  }

  async sendToPostgres(logEntry) {
    if (!this.pgLogsEnabled) return;
    if (!isPrismaConnected()) return;
    if (this.pgErrorCount >= this.maxPgErrors) return;

    try {
      const prisma = getPrisma();
      await prisma.appLog.create({
        data: {
          timestamp: new Date(logEntry.timestamp),
          level: logEntry.level,
          message: logEntry.message,
          service: logEntry.service,
          environment: logEntry.environment,
          payload: logEntry.payload || {},
          tgUsername: logEntry.tg_username || null,
          employeeName: logEntry.employeename || null,
          tgChatId: logEntry.tg_chat_id || null,
        }
      });
      this.pgErrorCount = 0;
    } catch (error) {
      this.pgErrorCount++;
      process.stdout.write(`WARN: PostgreSQL log error: ${error.message}\n`);
      if (this.pgErrorCount >= this.maxPgErrors) {
        process.stderr.write('PostgreSQL logging disabled after multiple errors.\n');
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
        throw new Error(`VictoriaLogs HTTP error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.victoriaErrorCount++;
      process.stdout.write(`WARN: VictoriaLogs connection error: ${error.message}\n`);
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
    return Math.floor(Math.random() * maxDelay);
  }

  formatConsoleMessage(level, message, data) {
    const timestamp = this.getTimestamp();
    const levelUpper = level.toUpperCase();

    const colors = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.info;
    const reset = colors.reset;

    let consoleMessage = `[${timestamp}] ${color}[${levelUpper}]${reset} ${message}`;

    if (level === 'debug') {
      if (Object.keys(data).length > 0) {
        consoleMessage += `\n  Data: ${JSON.stringify(data, null, 2)}`;
      }
      return consoleMessage;
    }

    if (level === 'error' && data.error) {
      consoleMessage += `\n  Error: ${data.error.message}`;
      if (data.error.stack) {
        consoleMessage += `\n  Stack: ${data.error.stack}`;
      }
      if (data.error.name) {
        consoleMessage += `\n  Type: ${data.error.name}`;
      }
    }

    if (level === 'error' && Object.keys(data).length > 0) {
      const contextData = { ...data };
      delete contextData.error;

      if (Object.keys(contextData).length > 0) {
        consoleMessage += `\n  Context: ${JSON.stringify(contextData, null, 2)}`;
      }
    }

    return consoleMessage;
  }

  async log(level, message, data = {}) {
    const currentLevel = this.logLevels[level] || 1;
    const configuredLevel = this.logLevels[this.logLevel] || 1;

    if (currentLevel < configuredLevel) {
      return;
    }

    const logEntry = this.formatLogMessage(level, message, data);

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

    // Send to PostgreSQL (fire-and-forget)
    this.sendToPostgres(logEntry).catch((error) => {
      process.stdout.write(`WARN: PostgreSQL log send error: ${error.message}\n`);
    });
    // Send to VictoriaLogs (fire-and-forget)
    this.sendToVictoriaLogs(logEntry).catch((error) => {
      process.stdout.write(`WARN: VictoriaLogs send error: ${error.message}\n`);
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

  getLogLevel() {
    return this.logLevel;
  }

  isDebugEnabled() {
    return this.logLevels[this.logLevel] <= this.logLevels['debug'];
  }

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

const logger = new Logger();

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

export const loggerWithUser = {
  info: (req, message, data = {}) => logWithUser(req, 'info', message, data),
  error: (req, message, data = {}) => logWithUser(req, 'error', message, data),
  warn: (req, message, data = {}) => logWithUser(req, 'warn', message, data),
  debug: (req, message, data = {}) => logWithUser(req, 'debug', message, data)
};

export default logger;
