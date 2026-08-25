import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.routes';
import hackathonRoutes from './routes/hackathon.routes';
import projectRoutes from './routes/project.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import teamRoutes from './routes/team.routes';
import skillRoutes from './routes/skill.routes';
import badgeRoutes from './routes/badge.routes';
import milestoneRoutes from './routes/milestone.routes';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';
import userRoutes from './routes/user.routes';
import securityRoutes from './routes/security.routes';
import privacyRoutes from './routes/privacy.routes';
import integrationRoutes from './routes/integration.routes';
import { ApifyHackathonAggregatorService } from './services/ApifyHackathonAggregatorService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Initialize Automated Daily Midnight Sync Cron Cycle (00:00:00)
ApifyHackathonAggregatorService.initCronSync();

// Sync live official dates and auto-bootstrap on cloud startup
(async () => {
  try {
    console.log('🚀 [Startup Sync] Updating all Unstop & live hackathons with exact official platform dates...');
    await ApifyHackathonAggregatorService.syncDirectUnstopHackathons();

    const count = await prisma.hackathon.count();
    console.log(`📊 [Database Status] Hackathons in database: ${count}`);
    if (count === 0) {
      console.log('🚀 [Auto-Bootstrap] Database is empty. Running initial 5-platform hackathon aggregator sync...');
      await ApifyHackathonAggregatorService.syncAllPlatforms(undefined, true);
    }
  } catch (err: any) {
    console.warn('⚠️ [Startup Auto-Sync Notice]:', err.message);
  }
})();


// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'HackTracker API' });
});

// Platform Global Stats (for Home Hero & Stats section)
app.get('/api/stats', async (req, res) => {
  try {
    const [
      activeUsers,
      hackathonsTracked,
      projectsSubmitted,
      allUsers,
      popularSkills,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.hackathon.count(),
      prisma.project.count(),
      prisma.user.findMany({
        where: { isDeleted: false },
        select: { trustScore: true },
      }),
      prisma.skill.findMany({
        take: 6,
        include: { _count: { select: { userSkills: true } } },
        orderBy: { userSkills: { _count: 'desc' } },
      }),
    ]);

    const avgTrust =
      allUsers.length > 0
        ? parseFloat(
            (allUsers.reduce((acc, u) => acc + u.trustScore, 0) / allUsers.length).toFixed(1)
          )
        : 50.0;

    res.json({
      activeUsers: Math.max(activeUsers, 1280), // seeded + platform base
      hackathonsTracked: Math.max(hackathonsTracked, 450),
      projectsSubmitted: Math.max(projectsSubmitted, 890),
      averageTrustScore: avgTrust,
      popularSkills: popularSkills.map((s) => ({
        name: s.name,
        category: s.category,
        count: s._count.userSkills,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch platform stats.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/integrations', integrationRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 HackTracker API Server running on port http://localhost:${PORT}`);
});
