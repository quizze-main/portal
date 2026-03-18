const env = {
    isDev: import.meta.env.VITE_APP_ENV === 'development',
    isProd: import.meta.env.VITE_APP_ENV === 'production',
};

// Заглушка для отправки ошибок на внешний сервис (например, OpenSearch)
function sendErrorToExternalService(message: string, extra: unknown = null) {
    // TODO: реализовать отправку на сторонний сервис (например, fetch/post)
    // fetch('https://your-opensearch-endpoint', { ... })
}

export const logger = {
    info(message: string, extra: unknown = null) {
        if (env.isDev) {
            if (extra !== undefined && extra !== null) {
                console.log('[INFO]', message, extra);
            } else {
                console.log('[INFO]', message);
            }
        }
    },

    error(message: string, extra: unknown = null) {
        if (extra !== undefined && extra !== null) {
            console.error('[ERROR]', message, extra);
        } else {
            console.error('[ERROR]', message);
        }
        // В проде отправляем ошибку на внешний сервис
        if (env.isProd) {
            sendErrorToExternalService(message, extra);
        }
    },
}; 