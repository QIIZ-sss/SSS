import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  attemptLogin,
  clearAdminCookie,
  requireAdmin,
  requireCsrfHeader,
  requireRole,
  setAdminCookie,
} from '../auth/adminAuth.js';
import { hashPassword, checkPasswordStrength } from '../auth/password.js';
import { dbEnabled, query } from '../db/pool.js';
import {
  dashboardStats,
  getGameDetail,
  listGames,
  promptUsage,
  removeDrawing,
} from '../db/games.js';
import {
  audit,
  createBan,
  liftBan,
  listAudit,
  listBans,
  listReports,
  resolveReport,
} from '../db/moderation.js';
import { roomManager } from '../game/roomManager.js';

/** ห่อ handler แบบ async ให้ error เด้งเข้า error middleware แทนที่จะค้าง */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const needsDb = (_req, res, next) =>
  dbEnabled() ? next() : res.status(503).json({ error: 'ยังไม่ได้ต่อฐานข้อมูล ตั้งค่า DATABASE_URL ก่อน' });

export function createAdminRouter() {
  const router = Router();

  /**
   * จำกัดการล็อกอินหนักกว่าปกติมาก — 8 ครั้งต่อ 15 นาทีต่อ IP
   * ประกอบกับการล็อกบัญชีหลังผิด 5 ครั้ง ทำให้การไล่เดารหัสผ่านไม่คุ้มค่าเลย
   */
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 8,
    skipSuccessfulRequests: true,
    message: { error: 'พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ใน 15 นาที' },
  });

  const loginSchema = z.object({
    username: z.string().min(3).max(32),
    password: z.string().min(8).max(200),
  });

  router.post(
    '/login',
    loginLimiter,
    requireCsrfHeader,
    wrap(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });

      const result = await attemptLogin({ ...parsed.data, ip: req.ip });
      if (!result.ok) return res.status(401).json({ error: result.error });

      setAdminCookie(res, result.token);
      res.json({ profile: result.profile });
    })
  );

  router.post('/logout', requireCsrfHeader, (req, res) => {
    clearAdminCookie(res);
    res.json({ ok: true });
  });

  // ทุกเส้นทางด้านล่างต้องมีตั๋วแอดมินที่ถูกต้อง
  router.use(requireAdmin);

  router.get('/me', (req, res) => {
    res.json({ username: req.admin.username, role: req.admin.role, dbEnabled: dbEnabled() });
  });

  router.get(
    '/stats',
    wrap(async (_req, res) => {
      res.json({
        live: roomManager.stats(),
        stored: await dashboardStats(),
        prompts: dbEnabled() ? await promptUsage() : [],
      });
    })
  );

  // ---------- คิวรายงาน ----------

  router.get(
    '/reports',
    needsDb,
    wrap(async (req, res) => {
      const status = ['open', 'dismissed', 'actioned', 'all'].includes(req.query.status)
        ? req.query.status
        : 'open';
      res.json({ reports: await listReports({ status }) });
    })
  );

  const resolveSchema = z.object({
    action: z.enum(['dismiss', 'remove_drawing', 'remove_and_ban']),
    note: z.string().max(500).optional(),
    banDays: z.number().int().min(1).max(365).optional(),
  });

  router.post(
    '/reports/:id/resolve',
    needsDb,
    requireCsrfHeader,
    wrap(async (req, res) => {
      const parsed = resolveSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      const { action, note, banDays } = parsed.data;
      const admin = req.admin.username;

      // แบนต้องเป็นสิทธิ์ระดับเจ้าของระบบ เพราะผลกระทบกว้างและย้อนกลับยากกว่าการลบภาพ
      if (action === 'remove_and_ban' && req.admin.role !== 'owner') {
        return res.status(403).json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่แบนผู้เล่นได้' });
      }

      const status = action === 'dismiss' ? 'dismissed' : 'actioned';
      const report = await resolveReport({ id: req.params.id, status, adminUser: admin, note });
      if (!report) return res.status(404).json({ error: 'ไม่พบรายงานนี้ หรือปิดเรื่องไปแล้ว' });

      if (action !== 'dismiss' && report.drawing_id) {
        await removeDrawing(report.drawing_id, note ?? 'ลบโดยผู้ดูแล');
      }
      if (action === 'remove_and_ban' && report.drawn_by) {
        await createBan({
          playerId: report.drawn_by,
          reason: note ?? 'วาดเนื้อหาไม่เหมาะสม',
          createdBy: admin,
          days: banDays ?? 7,
        });
      }

      await audit(admin, `report_${action}`, report.id, { drawingId: report.drawing_id, note });
      res.json({ ok: true });
    })
  );

  // ---------- คลังผลงาน ----------

  router.get(
    '/games',
    needsDb,
    wrap(async (req, res) => {
      const offset = Math.max(0, Number(req.query.offset) || 0);
      res.json({ games: await listGames({ offset }) });
    })
  );

  router.get(
    '/games/:id',
    needsDb,
    wrap(async (req, res) => {
      const detail = await getGameDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: 'ไม่พบเกมนี้' });
      res.json(detail);
    })
  );

  router.post(
    '/drawings/:id/remove',
    needsDb,
    requireCsrfHeader,
    wrap(async (req, res) => {
      const note = String(req.body?.note ?? '').slice(0, 500) || 'ลบโดยผู้ดูแล';
      const done = await removeDrawing(req.params.id, note);
      await audit(req.admin.username, 'drawing_remove', req.params.id, { note });
      res.json({ ok: done });
    })
  );

  // ---------- แบน ----------

  router.get(
    '/bans',
    needsDb,
    wrap(async (_req, res) => res.json({ bans: await listBans() }))
  );

  router.delete(
    '/bans/:id',
    needsDb,
    requireCsrfHeader,
    requireRole('owner'),
    wrap(async (req, res) => {
      const done = await liftBan(req.params.id);
      await audit(req.admin.username, 'ban_lift', req.params.id, {});
      res.json({ ok: done });
    })
  );

  // ---------- ห้องที่กำลังเล่นอยู่ ----------

  router.get('/rooms', (_req, res) => {
    const rooms = [...roomManager.rooms.values()].map((room) => ({
      code: room.code,
      isPublic: room.isPublic,
      phase: room.phase,
      players: room.playerCount,
      round: room.round,
      totalRounds: room.totalRounds,
      createdAt: room.createdAt,
    }));
    res.json({ rooms });
  });

  router.post(
    '/rooms/:code/close',
    requireCsrfHeader,
    requireRole('owner'),
    wrap(async (req, res) => {
      const room = roomManager.get(req.params.code);
      if (!room) return res.status(404).json({ error: 'ไม่พบห้องนี้' });
      room.bus.toRoom('room:closed', { reason: 'ห้องถูกปิดโดยผู้ดูแลระบบ' });
      room.destroy();
      roomManager.rooms.delete(room.code);
      await audit(req.admin.username, 'room_close', room.code, {});
      res.json({ ok: true });
    })
  );

  // ---------- บันทึกการกระทำ ----------

  router.get(
    '/audit',
    needsDb,
    wrap(async (_req, res) => res.json({ entries: await listAudit() }))
  );

  // ---------- จัดการบัญชีแอดมิน (เฉพาะเจ้าของระบบ) ----------

  router.get(
    '/admins',
    needsDb,
    requireRole('owner'),
    wrap(async (_req, res) => {
      const { rows } = await query(
        `SELECT id, username, role, is_active, last_login_at, created_at FROM admins ORDER BY id`
      );
      res.json({ admins: rows });
    })
  );

  const newAdminSchema = z.object({
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
    password: z.string().min(12).max(200),
    role: z.enum(['moderator', 'owner']),
  });

  router.post(
    '/admins',
    needsDb,
    requireCsrfHeader,
    requireRole('owner'),
    wrap(async (req, res) => {
      const parsed = newAdminSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
      const weak = checkPasswordStrength(parsed.data.password);
      if (weak) return res.status(400).json({ error: weak });

      const hash = await hashPassword(parsed.data.password);
      try {
        await query(`INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3)`, [
          parsed.data.username,
          hash,
          parsed.data.role,
        ]);
      } catch {
        return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
      }
      await audit(req.admin.username, 'admin_create', parsed.data.username, {
        role: parsed.data.role,
      });
      res.json({ ok: true });
    })
  );

  return router;
}
