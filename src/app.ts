import express from 'express';
import { authRouter } from './module/auth/auth.router';
import { issuesRouter } from './module/issues/issues.router';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(express.json());

// Main Root Application Routing Systems
app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);

// Centralized error mitigation processing middleware fallback
app.use(errorHandler);

export default app;