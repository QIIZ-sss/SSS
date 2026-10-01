/**
 * ตัวสุ่มแบบมี seed — ใช้ที่ฝั่งเซิร์ฟเวอร์เท่านั้น
 *
 * เหตุผลที่ต้องมี seed: ผลการสุ่ม challenge ของรอบเดียวกันต้องคำนวณซ้ำได้
 * (เช่น ตอน reconnect หรือตอนตรวจย้อนหลังว่าเกมสุ่มอะไรไป) และที่สำคัญกว่านั้น
 * การสุ่มต้องเกิดที่เซิร์ฟเวอร์ ไม่ใช่ที่ browser — ไม่งั้นผู้เล่นแก้ JS ปิด challenge ตัวเองได้
 */

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — เล็ก เร็ว พอสำหรับเกม (ไม่ใช่ cryptographic) */
export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** จำนวนเต็มในช่วง [min, max] */
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    /** true ตามความน่าจะเป็นที่กำหนด */
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** Fisher–Yates — คืน array ใหม่ ไม่แก้ของเดิม */
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** สุ่มหยิบ n ตัวไม่ซ้ำ */
    sample: (arr, n) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out.slice(0, Math.min(n, out.length));
    },
  };
}
