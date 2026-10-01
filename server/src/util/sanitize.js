/**
 * ทำความสะอาดข้อความที่ผู้ใช้พิมพ์เข้ามา
 *
 * ฝั่งหน้าเว็บเรา render ข้อความเป็น text node เสมอ (React ทำให้อัตโนมัติ) จึงไม่มีช่อง XSS
 * แต่ยังต้องกันอีกสองอย่าง: อักขระซ่อนตัว (zero-width) ที่ใช้ปลอมชื่อให้ซ้ำกับคนอื่น
 * และอักขระควบคุมที่ทำให้ layout เพี้ยน
 */

const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

export function cleanText(input, maxLength) {
  if (typeof input !== 'string') return '';
  return input
    .replace(CONTROL, '')
    .replace(ZERO_WIDTH, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function cleanNickname(input) {
  const name = cleanText(input, 16);
  if (name.length < 2) return null;
  return name;
}

/**
 * กรองคำหยาบเบื้องต้น — ตั้งใจให้เป็นแค่ด่านแรก
 * ด่านจริงคือปุ่มรายงาน + สิทธิ์เตะของเจ้าของห้อง เพราะ blocklist หลบง่ายมาก
 */
const BLOCKLIST = ['เหี้ย', 'สัตว์', 'ควาย', 'fuck', 'shit', 'bitch'];

export function containsBlockedWord(text) {
  const lower = text.toLowerCase().replace(/\s/g, '');
  return BLOCKLIST.some((w) => lower.includes(w));
}
