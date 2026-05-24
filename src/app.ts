import express from 'express';
import { authRouter } from './module/auth/auth.router';
import { issuesRouter } from './module/issues/issues.router';
import { errorHandler } from './middleware/error.middleware';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);
app.use(errorHandler);

export default app;