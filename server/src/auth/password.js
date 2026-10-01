import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

/**
 * แฮชรหัสผ่านแอดมินด้วย scrypt ที่มากับ Node เอง
 *
 * ทำไมไม่ใช้ bcrypt หรือ argon2: สองตัวนั้นต้องคอมไพล์โค้ด native ตอนติดตั้ง
 * ซึ่งพังบ่อยบนเครื่อง Windows และบนโฮสต์บางเจ้า ส่วน scrypt เป็นมาตรฐานที่ปลอดภัย
 * (แนะนำโดย OWASP เช่นกัน) และติดมากับ Node อยู่แล้ว ไม่ต้องลงอะไรเพิ่ม
 *
 * ห้ามใช้ MD5 หรือ SHA-256 เปล่า ๆ เด็ดขาด — มันเร็วเกินไป การ์ดจอใบเดียวเดารหัสได้เป็นพันล้านครั้งต่อวินาที
 */

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, PARAMS.keylen, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(plain, stored) {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = await scrypt(plain, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    // เทียบแบบเวลาคงที่ — การเทียบด้วย === ทำให้เดารหัสทีละตัวอักษรได้จากเวลาที่ใช้ตอบ
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** ตรวจความแข็งแรงของรหัสผ่านตอนสร้างบัญชีแอดมิน */
export function checkPasswordStrength(plain) {
  if (typeof plain !== 'string' || plain.length < 12) {
    return 'รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร';
  }
  if (!/[a-z]/.test(plain) || !/[A-Z]/.test(plain) || !/[0-9]/.test(plain)) {
    return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข';
  }
  return null;
}
