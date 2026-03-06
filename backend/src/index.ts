import express from 'express';
import cors from 'cors';
import { projectRoutes } from './routes/projects';
import { eaRequestRoutes } from './routes/ea-requests';
import { meetingRoutes } from './routes/meetings';
import { actionRoutes } from './routes/actions';
import { scheduleRoutes } from './routes/schedules';
import { applicationRoutes } from './routes/applications';
import { bcpfRoutes } from './routes/bcpf';
import { technologyStackRoutes } from './routes/technology-stack';
import { dashboardRoutes } from './routes/dashboard';
import { eaReviewLogRoutes } from './routes/ea-review-logs';
import { certificationRoutes } from './routes/certifications';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/ea-reviews', eaRequestRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/bcpf-master-data', bcpfRoutes);
app.use('/api/technology-stack', technologyStackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ea-review-logs', eaReviewLogRoutes);
app.use('/api/certifications', certificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`EAM Backend running on http://localhost:${PORT}`);
});
