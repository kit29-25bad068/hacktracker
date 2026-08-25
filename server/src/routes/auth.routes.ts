import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TrustScoreService } from '../services/TrustScoreService';
import { EmailService } from '../services/EmailService';

const router = Router();
const prisma = new PrismaClient();

// Helper to generate JWT
const generateToken = (userId: string, expiresIn: string = '7d') => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  return jwt.sign({ userId }, secret, { expiresIn } as any);
};

// 1. SIGNUP
router.post('/signup', async (req, res): Promise<void> => {
  try {
    const { name, email, password, department, year } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Generate unique username
    let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) baseUsername = 'hacker';
    let username = baseUsername;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        username,
        passwordHash,
        department: department || 'CSE',
        year: year || '1st',
        trustScore: 50.0,
        points: 0,
        finalScore: 0.0,
        privacySettings: {
          create: {
            profileVisibility: 'PUBLIC',
            emailVisibility: false,
            projectsVisibility: true,
            achievementsVisibility: true,
            rankVisibility: true,
            skillsVisibility: true,
            shareWithRecruiters: true,
            shareWithOrganizers: true,
          },
        },
        notificationPrefs: {
          createMany: {
            data: [
              { category: 'PROJECT_VERIFICATION', inApp: true, emailMode: 'INSTANT' },
              { category: 'RANK_CHANGES', inApp: true, emailMode: 'DAILY_DIGEST' },
              { category: 'ACHIEVEMENTS', inApp: true, emailMode: 'INSTANT' },
              { category: 'TEAM_UPDATES', inApp: true, emailMode: 'INSTANT' },
              { category: 'DEADLINES', inApp: true, emailMode: 'INSTANT' },
              { category: 'RECOMMENDATIONS', inApp: true, emailMode: 'WEEKLY_DIGEST' },
            ],
          },
        },
      },
    });

    // Recalculate rank for newly registered user
    await TrustScoreService.recalculateLeaderboardRanks();

    // Create session record
    const token = generateToken(user.id);
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'SIGNUP',
        description: 'New account created successfully.',
        ipAddress,
        userAgent,
      },
    });

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        department: true,
        year: true,
        avatar: true,
        bio: true,
        college: true,
        location: true,
        trustScore: true,
        points: true,
        finalScore: true,
        currentRank: true,
        rankChange: true,
        winsCount: true,
        is2faEnabled: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.isDeleted) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    // If 2FA is enabled on user account, return temporary verification token
    if (user.is2faEnabled && user.twoFactorSecret) {
      const secret = process.env.JWT_SECRET || 'fallback_secret_key';
      const tempToken = jwt.sign({ userId: user.id, isTemp2FA: true }, secret, { expiresIn: '10m' });
      res.json({
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication code required.',
      });
      return;
    }

    const tokenDuration = rememberMe ? '30d' : '7d';
    const token = generateToken(user.id, tokenDuration);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'LOGIN',
        description: 'User logged in successfully.',
        ipAddress,
        userAgent,
      },
    });

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        department: true,
        year: true,
        avatar: true,
        bio: true,
        college: true,
        location: true,
        trustScore: true,
        points: true,
        finalScore: true,
        currentRank: true,
        rankChange: true,
        winsCount: true,
        is2faEnabled: true,
        createdAt: true,
      },
    });

    res.json({
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. 2FA LOGIN VERIFY
router.post('/2fa/verify-login', async (req, res): Promise<void> => {
  try {
    const { tempToken, code, rememberDevice } = req.body;

    if (!tempToken || !code) {
      res.status(400).json({ error: 'Temporary token and 2FA code are required.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded: any = jwt.verify(tempToken, secret);

    if (!decoded || !decoded.userId || !decoded.isTemp2FA) {
      res.status(401).json({ error: 'Invalid or expired 2FA session.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ error: '2FA is not enabled on this account.' });
      return;
    }

    // Check TOTP code or Backup Code
    let isCodeValid = authenticator.verify({
      token: code.trim(),
      secret: user.twoFactorSecret,
    });

    // Check Backup Codes if TOTP failed
    if (!isCodeValid && user.backupCodes) {
      try {
        const backupCodesList: string[] = JSON.parse(user.backupCodes);
        const codeIndex = backupCodesList.indexOf(code.trim().toUpperCase());
        if (codeIndex !== -1) {
          isCodeValid = true;
          // Consume backup code
          backupCodesList.splice(codeIndex, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: JSON.stringify(backupCodesList) },
          });
        }
      } catch (e) {
        // Ignore backup code parsing error
      }
    }

    if (!isCodeValid) {
      res.status(400).json({ error: 'Invalid 2FA code or backup code. Please check your authenticator app.' });
      return;
    }

    const tokenDuration = rememberDevice ? '30d' : '7d';
    const token = generateToken(user.id, tokenDuration);
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        device: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        expiresAt: new Date(Date.now() + (rememberDevice ? 30 : 7) * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'LOGIN_2FA',
        description: 'User completed two-factor authentication login.',
        ipAddress,
        userAgent,
      },
    });

    const safeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        department: true,
        year: true,
        avatar: true,
        bio: true,
        college: true,
        location: true,
        trustScore: true,
        points: true,
        finalScore: true,
        currentRank: true,
        rankChange: true,
        winsCount: true,
        is2faEnabled: true,
        createdAt: true,
      },
    });

    res.json({
      message: '2FA authentication successful.',
      token,
      user: safeUser,
    });
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired 2FA token.' });
  }
});

// 4. GENERATE 2FA SETUP (QR Code)
router.post('/2fa/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const secret = authenticator.generateSecret();
    const appName = process.env.TWO_FACTOR_APP_NAME || 'HackTracker';
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    res.json({
      secret,
      otpauth,
      qrCodeDataUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate 2FA secret: ' + err.message });
  }
});

// 5. ENABLE 2FA (Verify initial code & generate 10 backup codes)
router.post('/2fa/enable', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { secret, code } = req.body;
    const user = req.user;

    if (!secret || !code) {
      res.status(400).json({ error: 'Secret and verification code are required.' });
      return;
    }

    const isValid = authenticator.verify({
      token: code.trim(),
      secret,
    });

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code. Please check your authenticator app.' });
      return;
    }

    // Generate 10 random 8-character backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is2faEnabled: true,
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(backupCodes),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: '2FA_ENABLED',
        description: 'Two-factor authentication was enabled.',
        ipAddress: req.ip,
      },
    });

    res.json({
      message: 'Two-factor authentication successfully enabled!',
      backupCodes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
});

// 6. DISABLE 2FA (Requires password confirmation)
router.post('/2fa/disable', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const user = req.user;

    if (!password) {
      res.status(400).json({ error: 'Password confirmation is required to disable 2FA.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is2faEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: '2FA_DISABLED',
        description: 'Two-factor authentication was disabled.',
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Two-factor authentication disabled.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
});

// 7. GET ME
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        privacySettings: true,
        badges: {
          include: {
            badge: true,
          },
        },
        milestones: {
          include: {
            milestone: true,
          },
        },
        skills: {
          include: {
            skill: true,
            endorsements: {
              include: {
                endorser: {
                  select: { id: true, name: true, username: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// 8. LOGOUT
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.token) {
      await prisma.session.deleteMany({
        where: { token: req.token },
      });
    }

    await prisma.securityEvent.create({
      data: {
        userId: req.user.id,
        type: 'LOGOUT',
        description: 'User logged out of active session.',
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    res.json({ message: 'Logged out.' });
  }
});

// 9. FORGOT PASSWORD
router.post('/forgot-password', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user) {
      await EmailService.sendEmail({
        userId: user.id,
        templateType: 'PASSWORD_RESET',
        subject: '🔐 Password Reset Instructions - HackTracker',
        htmlContent: `
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your HackTracker account password.</p>
          <p>For this local workspace, your demo credentials remain active. You can log in using password: <strong>password123</strong> or update it in Settings &gt; Security.</p>
          <a href="http://localhost:5173/login" style="display:inline-block; background:#14b8a6; color:#000; font-weight:bold; padding:10px 20px; border-radius:6px; text-decoration:none;">Log In to HackTracker</a>
        `,
      });
    }

// 10. RESET PASSWORD DIRECTLY
router.post('/reset-password', async (req, res): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Email and new password are required.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        description: 'Account password was reset successfully.',
        ipAddress: req.ip,
      },
    });

    // Optional notification email if SMTP configured
    await EmailService.sendEmail({
      userId: user.id,
      templateType: 'PASSWORD_CHANGED',
      subject: '🔒 Your HackTracker Password Was Changed',
      htmlContent: `
        <p>Hi ${user.name},</p>
        <p>Your HackTracker account password was just updated successfully.</p>
        <p>If you made this change, you can safely disregard this email.</p>
      `,
    });

    res.json({
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

export default router;
