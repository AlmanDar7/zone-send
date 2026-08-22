import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import templatesRouter from './src/routes/templates';
import contactsRouter from './src/routes/contacts';
import campaignsRouter from './src/routes/campaigns';
import settingsRouter from './src/routes/settings';
import dashboardRouter from './src/routes/dashboard';
import profileRouter from './src/routes/profile';
import analyticsRouter from './src/routes/analytics';
import queueRouter from './src/routes/queue';
import aiRouter from './src/routes/ai';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Mount Routes
app.use('/api/templates', templatesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/ai', aiRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
