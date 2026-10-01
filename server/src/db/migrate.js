import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { closePool, dbEnabled, query } from './pool.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * สร้างตารางทั้งหมด — เขียนด้วย CREATE TABLE IF NOT EXISTS จึงรันซ้ำได้ไม่พัง
 * โปรเจกต์ที่โตกว่านี้ควรใช้เครื่องมือ migration จริง ๆ (เช่น node-pg-migrate)
 * แต่สำหรับขนาดนี้ไฟล์เดียวชัดเจนกว่าและตรวจสอบง่ายกว่า
 */
async function main() {
  if (!dbEnabled()) {
    console.error('ไม่พบ DATABASE_URL ใน .env — ตั้งค่าก่อนแล้วรันใหม่');
    process.exit(1);
  }
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  await query(sql);
  console.log('สร้างตารางเรียบร้อย');
  await closePool();
}

main().catch((err) => {
  console.error('สร้างตารางไม่สำเร็จ:', err.message);
  process.exit(1);
});
