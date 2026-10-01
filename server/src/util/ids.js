import crypto from 'node:crypto';

// ตัดตัวอักษรที่อ่านสับสน (0/O, 1/I/L) ออก เพื่อให้บอกรหัสห้องกันทางเสียงได้
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * รหัสห้อง 6 หลัก สุ่มด้วย crypto ไม่ใช่ Math.random
 * เหตุผล: Math.random เดาลำดับต่อไปได้ ถ้าใช้สร้างรหัสห้อง คนอื่นจะไล่เดารหัสห้องส่วนตัวได้
 */
export function makeRoomCode() {
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function makeId(prefix = '') {
  return prefix + crypto.randomBytes(12).toString('base64url');
}

/** สีประจำตัวผู้เล่น ใช้ในลิสต์รายชื่อ */
const AVATAR_COLORS = [
  '#FF3D7F', '#00C2D1', '#FFC53D', '#6C4CF1',
  '#2BB673', '#FF7A45', '#3D8BFF', '#D64BC7',
];
export function pickAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
