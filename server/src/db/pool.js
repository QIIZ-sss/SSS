import pg from 'pg';
import { config } from '../config.js';

/**
 * บ่อการเชื่อมต่อฐานข้อมูล
 *
 * ตั้งใจให้เกม "เล่นได้แม้ไม่มีฐานข้อมูล" — ถ้าไม่ตั้ง DATABASE_URL ระบบจะทำงานในโหมดชั่วคราว
 * เล่นได้ปกติแต่ไม่บันทึกอะไร ส่วนหน้าแอดมินจะตอบว่ายังไม่ได้ต่อฐานข้อมูล
 *
 * เหตุผล: ตอนพัฒนาหรือตอนสาธิต ไม่ควรต้องติดตั้ง PostgreSQL ก่อนถึงจะกดเล่นได้
 * แต่พอขึ้นเซิร์ฟเวอร์จริง (production) จะบังคับให้ต้องมี ไม่งั้นข้อมูลรายงานจะหายหมด
 */

let pool = null;

if (config.databaseUrl) {
  pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
  });

  // error ของ client ที่ว่างอยู่ใน pool ถ้าไม่ดัก จะทำให้โปรเซสตายทั้งตัว
  pool.on('error', (err) => console.error('[db] client ในบ่อเกิดข้อผิดพลาด', err.message));
} else if (config.isProd) {
  throw new Error('โหมด production ต้องตั้งค่า DATABASE_URL');
} else {
  console.warn('[db] ไม่พบ DATABASE_URL — ทำงานในโหมดไม่บันทึกข้อมูล');
}

export const dbEnabled = () => pool !== null;

/**
 * ทดสอบต่อฐานข้อมูลตอนเปิดเซิร์ฟเวอร์
 *
 * ถ้าตั้ง DATABASE_URL ไว้แต่ต่อไม่ติด ต้องบอกให้รู้ตั้งแต่ตอนบูต
 * ไม่ใช่ปล่อยให้ไปพังตอนผู้เล่นกดปุ่มแล้วขึ้นข้อความที่ชี้ไปผิดที่
 */
export async function checkConnection() {
  if (!pool) return { ok: false, reason: 'ไม่ได้ตั้งค่า' };
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/**
 * ใช้ parameterized query เสมอ ($1, $2, ...) ห้ามต่อสตริง SQL เอง
 * นี่คือด่านกัน SQL injection ที่แท้จริง สำคัญกว่าการกรอง input ทุกชนิด
 */
export async function query(text, params = []) {
  if (!pool) return { rows: [], rowCount: 0 };
  const started = Date.now();
  try {
    const result = await pool.query(text, params);
    const ms = Date.now() - started;
    if (ms > 500) console.warn(`[db] คำสั่งช้า ${ms}ms: ${text.slice(0, 70)}`);
    return result;
  } catch (err) {
    console.error('[db] คำสั่งล้มเหลว:', err.message);
    throw err;
  }
}

/** ทำหลายคำสั่งให้สำเร็จหรือล้มเหลวพร้อมกัน (เช่น บันทึกเกมทั้งเกม) */
export async function transaction(fn) {
  if (!pool) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool?.end();
}
