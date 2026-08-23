import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth, requireAuth, AuthRequest } from '../middleware/auth';
import { ApifyUnstopSyncService } from '../services/ApifyUnstopSyncService';
import { ApifyHackathonAggregatorService } from '../services/ApifyHackathonAggregatorService';

const router = Router();
const prisma = new PrismaClient();

// 0. 6-PLATFORM APIFY HACKATHON AGGREGATOR (aurumworks/hackathon-aggregator)
router.post('/sync-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, forceFreshRun } = req.body;
    const result = await ApifyHackathonAggregatorService.syncAllPlatforms(token, forceFreshRun);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to aggregate hackathons: ' + err.message });
  }
});

router.post('/purge-synthetic', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const purged = await ApifyHackathonAggregatorService.purgeSyntheticHackathons();
    res.json({ success: true, purgedCount: purged, message: `Successfully purged ${purged} synthetic hackathons.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to purge synthetic hackathons: ' + err.message });
  }
});

router.post('/sync-unstop', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    const result = await ApifyUnstopSyncService.syncLiveUnstopHackathons(token);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync Unstop hackathons: ' + err.message });
  }
});

router.get('/sync-status', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [devpost, mlh, dorahacks, devfolio, unstop, total] = await Promise.all([
      prisma.hackathon.count({ where: { platform: 'Devpost' } }),
      prisma.hackathon.count({ where: { platform: 'MLH' } }),
      prisma.hackathon.count({ where: { platform: 'DoraHacks' } }),
      prisma.hackathon.count({ where: { platform: 'Devfolio' } }),
      prisma.hackathon.count({ where: { platform: 'Unstop' } }),
      prisma.hackathon.count(),
    ]);

    res.json({
      hasApifyToken: !!(process.env.APIFY_API_TOKEN || 'apify_api_LsL1kWSh2sxL5xzRHMVBQWEFFJaDM04bNdkp'),
      platforms: {
        Devpost: devpost,
        Unstop: unstop,
        DoraHacks: dorahacks,
        Devfolio: devfolio,
        MLH: mlh
      },
      totalCount: total,
      lastSync: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sync status: ' + err.message });
  }
});

// 1. LIST HACKATHONS
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      search,
      platform,
      locationType,
      theme,
      duration,
      difficulty,
      department,
      dateStatus,
      minPrize,
      maxPrize,
      page = '1',
      limit = '12',
      sortBy = 'date',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const skip = (pageNum - 1) * limitNum;

    const andClauses: any[] = [];

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      andClauses.push({
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { theme: { contains: q } },
          { platform: { contains: q } },
        ],
      });
    }

    if (platform && typeof platform === 'string' && platform !== 'All') {
      andClauses.push({ platform });
    }

    if (locationType && typeof locationType === 'string' && locationType !== 'All') {
      andClauses.push({ locationType });
    }

    if (theme && typeof theme === 'string' && theme !== 'All') {
      andClauses.push({ theme });
    }

    if (difficulty && typeof difficulty === 'string' && difficulty !== 'All') {
      andClauses.push({ difficulty });
    }

    if (department && typeof department === 'string' && department !== 'All') {
      andClauses.push({ department });
    }

    if (duration && typeof duration === 'string' && duration !== 'All') {
      andClauses.push({ duration });
    }

    const now = new Date();
    if (dateStatus === 'upcoming') {
      andClauses.push({
        OR: [
          { endDate: { gte: now } },
          { endDate: null },
          { startDate: { gte: now } },
          { startDate: null },
        ],
      });
    } else if (dateStatus === 'past') {
      andClauses.push({
        endDate: { lt: now },
      });
    }

    if (minPrize || maxPrize) {
      const prizeClause: any = {};
      if (minPrize) prizeClause.gte = parseInt(minPrize as string);
      if (maxPrize) prizeClause.lte = parseInt(maxPrize as string);
      andClauses.push({ prizePoolValue: prizeClause });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    let orderBy: any = { startDate: 'asc' };
    if (sortBy === 'prize') {
      orderBy = { prizePoolValue: 'desc' };
    } else if (sortBy === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'participants') {
      orderBy = { participantCount: 'desc' };
    } else if (sortBy === 'deadline') {
      orderBy = { registrationDeadline: 'asc' };
    }

    const total = await prisma.hackathon.count({ where });
    const hackathons = await prisma.hackathon.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        _count: {
          select: { reviews: true, projects: true },
        },
      },
    });

    let savedHackathonIds = new Set<string>();
    if (req.user) {
      const saved = await prisma.savedHackathon.findMany({
        where: { userId: req.user.id },
        select: { hackathonId: true },
      });
      savedHackathonIds = new Set(saved.map((s) => s.hackathonId));
    }

    const enriched = hackathons.map((h) => ({
      ...h,
      isSaved: savedHackathonIds.has(h.id),
    }));

    res.json({
      hackathons: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch hackathons: ' + err.message });
  }
});

// 2. FEATURED HACKATHONS
router.get('/featured', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const featured = await prisma.hackathon.findMany({
      where: { isFeatured: true },
      take: 6,
      orderBy: { startDate: 'asc' },
    });
    res.json({ hackathons: featured });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch featured hackathons.' });
  }
});

// 3. GET DETAILS & SIMILAR
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { projects: true, savedBy: true },
        },
      },
    });

    if (!hackathon) {
      res.status(404).json({ error: 'Hackathon not found.' });
      return;
    }

    let isSaved = false;
    if (req.user) {
      const saved = await prisma.savedHackathon.findUnique({
        where: {
          userId_hackathonId: {
            userId: req.user.id,
            hackathonId: hackathon.id,
          },
        },
      });
      isSaved = !!saved;
    }

    const similar = await prisma.hackathon.findMany({
      where: {
        id: { not: hackathon.id },
        OR: [{ theme: hackathon.theme }, { platform: hackathon.platform }],
      },
      take: 4,
      orderBy: { rating: 'desc' },
    });

    res.json({
      hackathon: {
        ...hackathon,
        isSaved,
      },
      similar,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch hackathon details.' });
  }
});

// 4. SAVE / UNSAVE
router.post('/:id/save', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user.id;

    const hackathon = await prisma.hackathon.findUnique({ where: { id } });
    if (!hackathon) {
      res.status(404).json({ error: 'Hackathon not found.' });
      return;
    }

    const existing = await prisma.savedHackathon.findUnique({
      where: {
        userId_hackathonId: {
          userId,
          hackathonId: id,
        },
      },
    });

    if (existing) {
      await prisma.savedHackathon.delete({
        where: { id: existing.id },
      });
      res.json({ isSaved: false, message: 'Hackathon removed from your saved list.' });
    } else {
      await prisma.savedHackathon.create({
        data: { userId, hackathonId: id },
      });
      res.json({ isSaved: true, message: 'Hackathon saved to your bookmarks!' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle saved status.' });
  }
});

// 5. REVIEW
router.post('/:id/review', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
      return;
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      res.status(400).json({ error: 'Please write a review comment with at least 5 characters.' });
      return;
    }

    const review = await prisma.hackathonReview.create({
      data: {
        hackathonId: id,
        userId,
        rating: parseInt(rating),
        comment: comment.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    const allReviews = await prisma.hackathonReview.findMany({ where: { hackathonId: id } });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

    await prisma.hackathon.update({
      where: { id },
      data: { rating: parseFloat(avgRating.toFixed(2)) },
    });

    res.status(201).json({ review, averageRating: avgRating });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post review.' });
  }
});

export default router;
