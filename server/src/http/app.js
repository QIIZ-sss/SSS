import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { makeId } from '../util/ids.js';
import { cleanNickname } from '../util/sanitize.js';
import { roomManager } from '../game/roomManager.js';
import { CHALLENGE_CATALOG } from '../game/challenges.js';
import { PROMPT_TOTAL, promptPool } from '../game/promptPool.js';
import { createAdminRouter } from './adminRoutes.js';
import { isBanned } from '../db/moderation.js';
import { dbEnabled } from '../db/pool.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // อยู่หลัง reverse proxy — จำเป็นเพื่อให้ rate limit อ่าน IP จริง
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", ...config.corsOrigins, 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.corsOrigins, // รายชื่อขาว ไม่ใช่ * — ป้องกันเว็บอื่นเรียก API แทนผู้ใช้
      credentials: true,
    })
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'เรียกใช้งานถี่เกินไป ลองใหม่ในอีกสักครู่' },
  });
  app.use('/api', limiter);

  /**
   * ออกตั๋วผู้เล่นชั่วคราว (guest)
   *
   * ตั้งใจให้ไม่มีรหัสผ่าน เพราะเกมพาร์ตี้ต้องกดเล่นได้ใน 5 วินาที
   * ตั๋วมีอายุสั้นและผูกกับ playerId ที่เซิร์ฟเวอร์เป็นคนออกให้ — หน้าเว็บกำหนด id ตัวเองไม่ได้
   * ถ้าจะทำระบบสมาชิกจริง ให้เพิ่ม endpoint ใหม่แล้วออกตั๋วหน้าตาเดียวกัน ส่วนที่เหลือไม่ต้องแก้
   */
  const sessionLimiter = rateLimit({ windowMs: 60_000, limit: 10 });
  app.post('/api/session', sessionLimiter, async (req, res) => {
    const name = cleanNickname(req.body?.nickname);
    if (!name) {
      return res.status(400).json({ error: 'ชื่อเล่นต้องมี 2–16 ตัวอักษร' });
    }

    const ban = await isBanned({ ip: req.ip }).catch(() => null);
    if (ban) return res.status(403).json({ error: `เข้าใช้งานไม่ได้: ${ban.reason}` });
    const playerId = makeId('p_');
    const token = jwt.sign({ name }, config.jwtSecret, {
      subject: playerId,
      issuer: 'wadtor',
      expiresIn: config.sessionTtl,
    });
    res.json({ token, playerId, name });
  });

  app.get('/api/meta', (_req, res) => {
    res.json({
      challenges: CHALLENGE_CATALOG,
      limits: {
        publicMax: config.maxPlayersPublic,
        privateMax: config.maxPlayersPrivate,
      },
      prompts: { total: PROMPT_TOTAL, remainingInBag: promptPool.remaining },
      stats: roomManager.stats(),
      persistence: dbEnabled(),
    });
  });

  app.use('/api/admin', createAdminRouter());

  app.get('/healthz', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // ห้ามให้ stack trace หลุดไปหาผู้ใช้ — มันบอกโครงสร้างโปรเจกต์และเวอร์ชันไลบรารี
  app.use((err, _req, res, _next) => {
    console.error('[http]', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  });

  return app;
}
