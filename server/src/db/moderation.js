import crypto from 'node:crypto';
import { config } from '../config.js';
import { dbEnabled, query } from './pool.js';

// ---------- รายงาน ----------

export async function createReport({ drawingId, roomCode, reportedBy, drawnBy, reason, snapshot }) {
  if (!dbEnabled()) return null;
  // กันคนเดิมรายงานภาพเดิมซ้ำ ๆ เพื่อดันคิวให้ท่วม
  const { rows: dupe } = await query(
    `SELECT id FROM reports WHERE drawing_id = $1 AND reported_by = $2 LIMIT 1`,
    [drawingId, reportedBy]
  );
  if (dupe.length) return dupe[0].id;

  const { rows } = await query(
    `INSERT INTO reports (drawing_id, room_code, reported_by, drawn_by, reason, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [drawingId, roomCode, reportedBy, drawnBy, reason, JSON.stringify(snapshot ?? [])]
  );
  return rows[0].id;
}

export async function listReports({ status = 'open', limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT r.id, r.room_code, r.reason, r.status, r.created_at, r.reviewed_at,
            r.reviewed_by, r.review_note, r.drawn_by, r.drawing_id,
            COALESCE(d.strokes, r.snapshot) AS strokes,
            d.nickname AS drawn_by_name,
            d.removed_at IS NOT NULL       AS already_removed,
            c.prompt
     FROM reports r
     LEFT JOIN drawings d ON d.id = r.drawing_id
     LEFT JOIN chains   c ON c.id = d.chain_id
     WHERE ($1 = 'all' OR r.status = $1)
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [status, Math.min(limit, 200)]
  );
  return rows;
}

export async function resolveReport({ id, status, adminUser, note }) {
  const { rows } = await query(
    `UPDATE reports
     SET status = $2, reviewed_at = now(), reviewed_by = $3, review_note = $4
     WHERE id = $1 AND status = 'open'
     RETURNING id, drawing_id, drawn_by`,
    [id, status, adminUser, note ?? null]
  );
  return rows[0] ?? null;
}

// ---------- แบน ----------

/**
 * เก็บ IP เป็นค่าแฮชพร้อมเกลือ ไม่เก็บ IP ตรง ๆ
 * ตาม PDPA เลข IP ถือเป็นข้อมูลส่วนบุคคล การแฮชทำให้ยังตรวจซ้ำได้ว่าเป็นคนเดิมไหม
 * แต่ถ้าฐานข้อมูลหลุด คนที่ได้ไปก็ย้อนกลับเป็น IP จริงไม่ได้
 */
export function hashIp(ip) {
  return crypto.createHmac('sha256', config.jwtSecret).update(String(ip)).digest('hex').slice(0, 40);
}

export async function isBanned({ playerId, ip }) {
  if (!dbEnabled()) return null;
  try {
    const { rows } = await query(
      `SELECT reason, expires_at FROM bans
       WHERE (player_id = $1 OR ip_hash = $2)
         AND (expires_at IS NULL OR expires_at > now())
       LIMIT 1`,
      [playerId ?? null, ip ? hashIp(ip) : null]
    );
    return rows[0] ?? null;
  } catch (err) {
    // ฐานข้อมูลล่ม = ปล่อยผ่าน ไม่ใช่ปิดประตูใส่ทุกคน
    //
    // นี่คือการตัดสินใจโดยตั้งใจ: ถ้าเลือก "ล่มแล้วห้ามเข้า" คนดี ๆ ทั้งหมดเล่นไม่ได้
    // เพื่อกันคนที่ถูกแบนไม่กี่คน ซึ่งไม่คุ้ม — คนที่ถูกแบนกลับมาเล่นได้ชั่วคราวยอมรับได้
    // แต่ถ้าเป็นระบบที่ความปลอดภัยสำคัญกว่าการใช้งาน (เช่น ระบบเงิน) ต้องเลือกทางตรงข้าม
    console.error('[ban] ตรวจรายการแบนไม่ได้ ปล่อยผ่านชั่วคราว:', err.message);
    return null;
  }
}

export async function createBan({ playerId, ip, reason, createdBy, days }) {
  const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;
  const { rows } = await query(
    `INSERT INTO bans (player_id, ip_hash, reason, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [playerId ?? null, ip ? hashIp(ip) : null, reason, createdBy, expiresAt]
  );
  return rows[0].id;
}

export async function listBans() {
  const { rows } = await query(
    `SELECT id, player_id, reason, created_by, created_at, expires_at
     FROM bans
     WHERE expires_at IS NULL OR expires_at > now()
     ORDER BY created_at DESC LIMIT 100`
  );
  return rows;
}

export async function liftBan(id) {
  const { rowCount } = await query(`DELETE FROM bans WHERE id = $1`, [id]);
  return rowCount > 0;
}

// ---------- บันทึกการกระทำของแอดมิน ----------

/**
 * เขียนอย่างเดียว ไม่มี endpoint ให้ลบหรือแก้
 * ถ้าแอดมินคนหนึ่งลบภาพของผู้ใช้ ต้องมีร่องรอยเสมอว่าใครลบ ตอนไหน ด้วยเหตุผลอะไร
 */
export async function audit(adminUser, action, target, detail) {
  if (!dbEnabled()) return;
  await query(
    `INSERT INTO audit_log (admin_user, action, target, detail) VALUES ($1, $2, $3, $4)`,
    [adminUser, action, target ? String(target) : null, JSON.stringify(detail ?? {})]
  ).catch((err) => console.error('[audit] เขียนบันทึกไม่สำเร็จ', err.message));
}

export async function listAudit(limit = 100) {
  const { rows } = await query(
    `SELECT id, admin_user, action, target, detail, at
     FROM audit_log ORDER BY at DESC LIMIT $1`,
    [Math.min(limit, 300)]
  );
  return rows;
}
