import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { dbEnabled, query } from '../db/pool.js';
import { verifyPassword } from './password.js';
import { audit } from '../db/moderation.js';

const COOKIE = 'wadtor_admin';
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/**
 * ตั๋วแอดมินแยกคนละใบกับตั๋วผู้เล่น และใช้ความลับคนละตัว
 *
 * เหตุผล: ถ้าใช้ secret เดียวกัน ตั๋วผู้เล่นที่ปลอมขึ้นมาสำเร็จเมื่อไหร่ จะกลายเป็นตั๋วแอดมินทันที
 * การแยก secret ทำให้สองระบบพังแยกกัน
 */
function signAdminToken(admin) {
  return jwt.sign({ username: admin.username, role: admin.role }, config.adminJwtSecret, {
    subject: String(admin.id),
    issuer: 'wadtor-admin',
    audience: 'admin-panel',
    expiresIn: config.adminSessionTtl,
  });
}

export function setAdminCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, // JavaScript อ่านไม่ได้ — ถ้ามีช่อง XSS ตั๋วก็ยังไม่ถูกขโมย
    secure: config.isProd, // ส่งผ่าน HTTPS เท่านั้นบนเครื่องจริง
    sameSite: 'strict', // เว็บอื่นสั่งเบราว์เซอร์ยิงคำสั่งแทนแอดมินไม่ได้
    maxAge: 8 * 3600 * 1000,
    path: '/api/admin',
  });
}

export function clearAdminCookie(res) {
  res.clearCookie(COOKIE, { path: '/api/admin' });
}

export async function attemptLogin({ username, password, ip }) {
  if (!dbEnabled()) return { ok: false, error: 'ยังไม่ได้ต่อฐานข้อมูล' };

  const { rows } = await query(`SELECT * FROM admins WHERE username = $1`, [username]);
  const admin = rows[0];

  // ตอบข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด ไม่งั้นจะไล่เดาได้ว่าบัญชีไหนมีอยู่จริง
  const genericError = { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  if (!admin || !admin.is_active) return genericError;

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return { ok: false, error: 'บัญชีถูกล็อกชั่วคราวจากการกรอกผิดหลายครั้ง ลองใหม่ภายหลัง' };
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    const failed = admin.failed_logins + 1;
    const lock = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
    await query(`UPDATE admins SET failed_logins = $2, locked_until = $3 WHERE id = $1`, [
      admin.id,
      lock ? 0 : failed,
      lock,
    ]);
    await audit(username, 'login_failed', null, { ip: ip ? 'บันทึกแล้ว' : null, attempt: failed });
    return genericError;
  }

  await query(
    `UPDATE admins SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`,
    [admin.id]
  );
  await audit(username, 'login_success', null, {});

  return {
    ok: true,
    token: signAdminToken(admin),
    profile: { username: admin.username, role: admin.role },
  };
}

/** ด่านตรวจตั๋วสำหรับทุกเส้นทางใต้ /api/admin */
export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  try {
    req.admin = jwt.verify(token, config.adminJwtSecret, {
      issuer: 'wadtor-admin',
      audience: 'admin-panel',
    });
    next();
  } catch {
    clearAdminCookie(res);
    res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

/**
 * ด่านกัน CSRF สำหรับคำสั่งที่เปลี่ยนแปลงข้อมูล
 *
 * เบราว์เซอร์แนบคุกกี้ให้อัตโนมัติ ดังนั้นเว็บอันตรายอาจหลอกให้แอดมินกดลิงก์แล้วยิงคำสั่งลบข้อมูลได้
 * SameSite=strict กันได้เกือบหมดแล้ว แต่การบังคับ header ที่ตั้งเองไม่ได้ข้ามโดเมน
 * เป็นด่านที่สองที่ราคาถูกมาก
 */
export function requireCsrfHeader(req, res, next) {
  if (req.get('X-Admin-Request') !== '1') {
    return res.status(403).json({ error: 'คำขอไม่ถูกต้อง' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role)) {
      return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอสำหรับคำสั่งนี้' });
    }
    next();
  };
}
