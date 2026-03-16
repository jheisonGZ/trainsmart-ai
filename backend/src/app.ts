import express from 'express';
import helmet from 'helmet';

import { corsMiddleware } from './config/cors';
import { apiRateLimit } from './config/rateLimit';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import routes from './routes';
import { logger } from './lib/logger';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiRateLimit);

app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.originalUrl,
  });
  next();
});

app.use('/api', routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
