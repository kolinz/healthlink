import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: process.env.APP_NAME ?? 'HealthLink',
      version: '1.12.0',
      description: '患者体調共有・AI相談ポータル API仕様書',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? 8080}`,
        description: '開発サーバー',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    // デフォルトセキュリティ: JWT（外部連携APIは apiKeyAuth を個別指定）
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
