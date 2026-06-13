import path from 'path';
import dotenv from 'dotenv';

// ルートディレクトリの .env を読み込む（他のモジュールより先に実行）
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import authRoutes              from './routes/auth';
import userRoutes              from './routes/users';
import organizationRoutes      from './routes/organizations';
import assignmentRoutes        from './routes/assignments';
import dailyLogRoutes          from './routes/dailyLogs';
import patientRoutes           from './routes/patients';
import aiRoutes                from './routes/ai';
import aiProviderRoutes        from './routes/aiProviders';
import consultationTopicRoutes from './routes/consultationTopics';
import apiKeyRoutes            from './routes/apiKeys';
import externalRoutes          from './routes/external';
import systemSettingsRoutes    from './routes/systemSettings';

const app  = express();
const PORT = process.env.PORT ?? 8080;

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ルーター登録
app.use('/auth',                authRoutes);
app.use('/users',               userRoutes);
app.use('/organizations',       organizationRoutes);
app.use('/assignments',         assignmentRoutes);
app.use('/daily-logs',          dailyLogRoutes);
app.use('/patients',            patientRoutes);
app.use('/ai',                  aiRoutes);
app.use('/ai/providers',        aiProviderRoutes);
app.use('/consultation-topics', consultationTopicRoutes);
app.use('/api-keys',            apiKeyRoutes);
app.use('/external',            externalRoutes);
app.use('/system-settings',     systemSettingsRoutes);

app.listen(PORT, () => {
  console.log(`[server] HealthLink バックエンド起動中: http://localhost:${PORT}`);
  console.log(`[server] Swagger UI: http://localhost:${PORT}/api-docs`);
});

export default app;
