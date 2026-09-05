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
import adminRouter from './src/routes/admin';
import trackingRouter from './src/routes/tracking';
import publicFormsRouter from './src/routes/publicForms';
import { startQueueWorker } from './src/services/queueWorker';
import prisma from './src/db';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Public platform config endpoint for user app announcement banner & flags
app.get('/api/system/public-config', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {
      maintenanceMode: 'false',
      allowNewSignups: 'true',
      aiCopywritingEnabled: 'true',
      announcementBanner: '',
      announcementType: 'info',
    };
    for (const s of settings) {
      map[s.key] = s.value;
    }
    res.json(map);
  } catch (err) {
    res.json({
      maintenanceMode: 'false',
      allowNewSignups: 'true',
      aiCopywritingEnabled: 'true',
      announcementBanner: '',
      announcementType: 'info',
    });
  }
});

// Mount Routes
app.use('/api/track', trackingRouter);
app.use('/api/public/forms', publicFormsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Start the background email queue dispatcher worker
  startQueueWorker(10000);
});
