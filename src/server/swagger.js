import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const env = process.env || {};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Staff Focus App API',
      version: '1.0.0',
      description: 'API для приложения Staff Focus App',
      contact: {
        name: 'Loov Team',
        email: 'dev@loov.ru'
      }
    },
    servers: [
      {
        url: env.LOOV_IS_STAFF_PORTAL_URL || 'http://localhost:3000',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API ключ для внешних запросов'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT токен для авторизованных запросов'
        }
      }
    }
  },
  apis: [
    './src/server/external-api.js',
    './src/server/internal-api.js',
    './src/server/telegram.js'
  ]
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Staff Focus App API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true
    }
  }));

  // JSON endpoint для Swagger
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger UI доступен по адресу: /api-docs');
} 