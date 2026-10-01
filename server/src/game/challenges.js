import { flipHorizontal, flipVertical, ghostErase, shuffleColors } from './strokeOps.js';

/**
 * ทะเบียน challenge — ทุกตัวหน้าตาเหมือนกันหมด เพิ่มตัวใหม่ได้โดยไม่ต้องแก้ตรรกะเกม
 *
 * เกมมีรอบสองแบบสลับกัน จึงต้องแยกว่า challenge ตัวไหนใช้กับรอบแบบไหน:
 *   'drawer' — ใช้กับ "รอบวาด" เปลี่ยนกติกาการวาด (บังคับที่หน้าเว็บ แต่ตรวจซ้ำที่เซิร์ฟเวอร์)
 *   'handoff' — ใช้กับ "รอบทาย" แปลงภาพก่อนส่งให้คนทายเห็น (ทำที่เซิร์ฟเวอร์ล้วน แก้ที่ browser ไม่ได้)
 *   'viewer' — ใช้กับ "รอบทาย" เปลี่ยนวิธีที่คนทายมองภาพ (เวลาดู ความชัด)
 *
 * enforce บอกว่าเซิร์ฟเวอร์ตรวจงานที่ส่งเข้ามาอย่างไร — สำคัญ เพราะกติกาฝั่งหน้าเว็บ
 * เป็นแค่ UX ผู้เล่นที่แก้ JS ข้ามได้เสมอ ถ้าไม่ตรวจซ้ำที่นี่ challenge จะไม่มีความหมาย
 */

export const CHALLENGES = {
  // ---------- ใช้ในรอบวาด ----------
  no_lift: {
    id: 'no_lift',
    name: 'ห้ามยกมือ',
    hint: 'วาดได้เส้นเดียวรวด ปล่อยเมาส์เมื่อไหร่คือจบ',
    scope: 'drawer',
    severity: 3,
    enforce: (strokes) => strokes.slice(0, 1),
  },
  shaky: {
    id: 'shaky',
    name: 'มือสั่น',
    hint: 'เส้นจะสั่นเอง ทำใจ',
    scope: 'drawer',
    severity: 1,
    client: { jitter: 0.006 },
  },
  palette_lock: {
    id: 'palette_lock',
    name: 'สีต้องห้าม',
    hint: 'เหลือให้ใช้แค่ 2 สี',
    scope: 'drawer',
    severity: 2,
    roll: (rng) => ({
      colors: rng.sample(['#16181D', '#FF3D7F', '#00C2D1', '#FFC53D', '#6C4CF1', '#2BB673'], 2),
    }),
    enforce: (strokes, payload) => {
      const allowed = new Set(payload.colors);
      return strokes.map((s) => (allowed.has(s.color) ? s : { ...s, color: payload.colors[0] }));
    },
  },
  no_undo: {
    id: 'no_undo',
    name: 'ห้ามย้อนกลับ',
    hint: 'ปุ่มเลิกทำถูกล็อก วาดผิดคือผิดเลย',
    scope: 'drawer',
    severity: 2,
  },
  rush: {
    id: 'rush',
    name: 'เร่งมือ',
    hint: 'เวลาวาดเหลือครึ่งเดียว',
    scope: 'drawer',
    severity: 2,
    timeMultiplier: 0.5,
  },
  fat_brush: {
    id: 'fat_brush',
    name: 'พู่กันยักษ์',
    hint: 'หัวปากกาใหญ่เท่าไม้กวาด',
    scope: 'drawer',
    severity: 2,
    client: { minWidth: 22 },
    enforce: (strokes) => strokes.map((s) => ({ ...s, width: Math.max(s.width, 22) })),
  },

  // ---------- ใช้ในรอบทาย: แปลงภาพก่อนให้เห็น ----------
  ghost_eraser: {
    id: 'ghost_eraser',
    name: 'ยางลบผี',
    hint: 'บางส่วนของภาพหายไปเอง',
    scope: 'handoff',
    severity: 3,
    roll: (rng) => ({ ratio: rng.float(0.2, 0.4) }),
    transform: (strokes, rng, payload) => ghostErase(strokes, rng, payload.ratio),
  },
  color_shuffle: {
    id: 'color_shuffle',
    name: 'สีเพี้ยน',
    hint: 'สีทุกเส้นถูกสลับใหม่',
    scope: 'handoff',
    severity: 1,
    transform: (strokes, rng) => shuffleColors(strokes, rng),
  },
  mirror: {
    id: 'mirror',
    name: 'กระจกเงา',
    hint: 'ภาพถูกพลิกซ้ายขวา',
    scope: 'handoff',
    severity: 2,
    transform: (strokes) => flipHorizontal(strokes),
  },
  upside_down: {
    id: 'upside_down',
    name: 'กลับหัว',
    hint: 'ภาพถูกกลับหัว',
    scope: 'handoff',
    severity: 2,
    transform: (strokes) => flipVertical(strokes),
  },

  // ---------- ใช้ในรอบทาย: เปลี่ยนวิธีมอง ----------
  quick_peek: {
    id: 'quick_peek',
    name: 'ชายตามอง',
    hint: 'เวลาดูภาพเหลือครึ่งเดียว',
    scope: 'viewer',
    severity: 3,
    peekMultiplier: 0.5,
  },
  blurry: {
    id: 'blurry',
    name: 'สายตาสั้น',
    hint: 'ภาพเบลอตลอดเวลาที่ดู',
    scope: 'viewer',
    severity: 2,
    client: { blur: 5 },
  },
};

export const CHALLENGE_IDS = Object.keys(CHALLENGES);

/** ข้อมูลย่อสำหรับส่งไปแสดงในหน้าตั้งค่าของเจ้าของห้อง */
export const CHALLENGE_CATALOG = CHALLENGE_IDS.map((id) => ({
  id,
  name: CHALLENGES[id].name,
  hint: CHALLENGES[id].hint,
  scope: CHALLENGES[id].scope,
  severity: CHALLENGES[id].severity,
}));

const FREQUENCY_CHANCE = { off: 0, low: 0.25, medium: 0.5, high: 0.75, always: 1 };

/** challenge ตัวไหนใช้กับรอบแบบไหนได้ */
const SCOPES_FOR_KIND = {
  draw: ['drawer'],
  guess: ['handoff', 'viewer'],
};

/**
 * ตัดสินว่ารอบนี้จะมี challenge อะไรบ้าง
 *
 * ทุกคนในรอบเดียวกันได้ challenge ชุดเดียวกัน — ตั้งใจแบบนี้เพราะถ้าสุ่มรายคน
 * จะมีคนบ่นว่าไม่ยุติธรรม และเวลาที่ให้แต่ละคนจะไม่เท่ากันด้วย
 *
 * @param {number} round       รอบปัจจุบัน เริ่มที่ 0
 * @param {number} totalRounds จำนวนรอบทั้งหมด
 * @param {object} settings    settings ของห้อง
 * @param {object} rng         ตัวสุ่มที่มี seed แล้ว
 * @param {'draw'|'guess'} kind ประเภทของรอบนี้
 */
export function rollChallenges(round, totalRounds, settings, rng, kind) {
  const cfg = settings.challenges;
  if (!cfg || cfg.frequency === 'off' || cfg.enabled.length === 0) return [];

  const allowedScopes = SCOPES_FOR_KIND[kind] ?? [];
  const pool = cfg.enabled
    .filter((id) => CHALLENGES[id])
    .filter((id) => allowedScopes.includes(CHALLENGES[id].scope));
  if (pool.length === 0) return [];

  let shouldFire;
  if (cfg.mode === 'rounds') {
    shouldFire = (cfg.specificRounds || []).includes(round + 1);
  } else if (cfg.mode === 'second_half') {
    shouldFire = round >= Math.floor(totalRounds / 2) && rng.chance(FREQUENCY_CHANCE[cfg.frequency]);
  } else {
    shouldFire = rng.chance(FREQUENCY_CHANCE[cfg.frequency]);
  }
  if (!shouldFire) return [];

  // ความถี่สูงมีโอกาสได้สองใบพร้อมกัน แต่ไม่เกินนั้น — สามใบขึ้นไปเกมเละจนไม่สนุก
  const count = cfg.frequency === 'always' || cfg.frequency === 'high' ? (rng.chance(0.35) ? 2 : 1) : 1;
  const chosen = rng.sample(pool, count);

  return chosen.map((id) => {
    const def = CHALLENGES[id];
    return {
      id,
      name: def.name,
      hint: def.hint,
      scope: def.scope,
      payload: def.roll ? def.roll(rng) : {},
      client: def.client || null,
    };
  });
}

/** คูณเวลาวาดตาม challenge ที่ออก (เช่น เร่งมือ = ครึ่งเดียว) */
export function applyTimeModifiers(baseSeconds, active) {
  let seconds = baseSeconds;
  for (const c of active) {
    const def = CHALLENGES[c.id];
    if (def?.timeMultiplier) seconds *= def.timeMultiplier;
  }
  return Math.max(10, Math.round(seconds));
}

/** คูณเวลาดูภาพในรอบทาย */
export function applyPeekModifiers(baseSeconds, active) {
  let seconds = baseSeconds;
  for (const c of active) {
    const def = CHALLENGES[c.id];
    if (def?.peekMultiplier) seconds *= def.peekMultiplier;
  }
  return Math.max(3, Math.round(seconds));
}

/** ตรวจงานที่ผู้เล่นส่งเข้ามาให้เป็นไปตาม challenge จริง ๆ */
export function enforceChallenges(strokes, active) {
  let out = strokes;
  for (const c of active) {
    const def = CHALLENGES[c.id];
    if (def?.enforce) out = def.enforce(out, c.payload || {});
  }
  return out;
}

/** แปลงภาพก่อนส่งให้คนทายเห็น */
export function applyHandoff(strokes, active, rng) {
  let out = strokes;
  for (const c of active) {
    const def = CHALLENGES[c.id];
    if (def?.scope === 'handoff' && def.transform) out = def.transform(out, rng, c.payload || {});
  }
  return out;
}
