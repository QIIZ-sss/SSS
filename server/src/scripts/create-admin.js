import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { closePool, dbEnabled, query } from '../db/pool.js';
import { checkPasswordStrength, hashPassword } from '../auth/password.js';

/**
 * สร้างบัญชีแอดมินคนแรก — รันด้วย: npm run create-admin
 *
 * ตั้งใจให้ไม่มีบัญชีเริ่มต้นแบบ admin/admin ในระบบเลย
 * บัญชีเริ่มต้นที่ทุกคนรู้รหัสคือช่องโหว่ที่พบบ่อยที่สุดในโปรเจกต์นักศึกษา
 */
async function main() {
  if (!dbEnabled()) {
    console.error('ไม่พบ DATABASE_URL ใน .env');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const username = (await rl.question('ชื่อผู้ใช้แอดมิน: ')).trim();
  const password = (await rl.question('รหัสผ่าน (อย่างน้อย 12 ตัว มีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข): ')).trim();
  const roleInput = (await rl.question('บทบาท [owner/moderator] (ค่าเริ่มต้น owner): ')).trim();
  rl.close();

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    console.error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z A-Z 0-9 . _ - ความยาว 3–32 ตัว');
    process.exit(1);
  }
  const weak = checkPasswordStrength(password);
  if (weak) {
    console.error(weak);
    process.exit(1);
  }

  const role = roleInput === 'moderator' ? 'moderator' : 'owner';
  const hash = await hashPassword(password);

  try {
    await query(`INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3)`, [
      username,
      hash,
      role,
    ]);
    console.log(`สร้างบัญชี "${username}" (${role}) เรียบร้อย เข้าใช้งานที่ /admin.html`);
  } catch (err) {
    console.error('สร้างบัญชีไม่สำเร็จ:', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
