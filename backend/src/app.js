import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import slaRoutes from './routes/slaRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const openapi = JSON.parse(readFileSync(join(__dirname, 'docs', 'openapi.json'), 'utf-8'));

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  return sendSuccess(res, 200, { status: 'ok', service: 'OpsDesk AI' }, 'Healthy');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'OpsDesk AI API' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/sla', slaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
