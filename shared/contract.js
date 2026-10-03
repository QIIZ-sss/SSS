// ============================================================
// JUST DRAW IT - ค่ากลาง (Single Source of Truth)
// ใช้ร่วมกันทั้ง client และ server ห้ามพิมพ์ค่าเหล่านี้ซ้ำเป็นตัวเลข/ข้อความตรง ๆ ในไฟล์อื่น
// ถ้าจะเปลี่ยนค่า ให้แก้ที่ไฟล์นี้ที่เดียว และแจ้งทีมทุกครั้ง
// ============================================================

// ---------- สถานะห้อง ----------
export const GAME_STATUS = Object.freeze({
  LOBBY: 'LOBBY',
  WORD_SELECTION: 'WORD_SELECTION',
  PLAYING: 'PLAYING',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER: 'GAME_OVER',
});

// ---------- กติกาที่ server ต้องบังคับ (client ใช้แค่แสดงผล/ปิดปุ่ม) ----------
export const GAME_RULES = Object.freeze({
  MIN_PLAYERS_FFA: 2,             // FFA ต้องมีอย่างน้อย 2 คน
  MIN_PLAYERS_PER_TEAM: 1,        // Team ต้องมีทีมละอย่างน้อย 1 คน
  MIN_PLAYERS_TEAM_TOTAL: 2,
  REQUIRE_ALL_READY: true,        // ทุกคนต้องกด Ready ก่อนเริ่ม (Host ไม่ต้องกด)
  DRAWER_CAN_CHAT: false,         // คนวาดพิมพ์แชทไม่ได้ระหว่างรอบ
  // ส่ง currentWord ให้คนทายได้เฉพาะสถานะเหล่านี้ (กันคำตอบรั่วใน WebSocket)
  REVEAL_WORD_STATUSES: Object.freeze(['ROUND_OVER', 'GAME_OVER']),
  ROOM_PIN_LENGTH: 5,
  RECONNECT_GRACE_MS: 30000,      // เก็บที่ผู้เล่นที่หลุดไว้ 30 วินาที
  GAME_OVER_DELAY_MS: 10000,      // GAME_OVER ค้างไว้ 10 วินาที แล้ว server พากลับ LOBBY เอง
  CHAT_MAX_LENGTH: 200,           // T1-06: ข้อความแชท/คำทายยาวสุด (client จำกัดช่องพิมพ์, server ไม่รับที่ยาวกว่า)
  ROOM_NAME_MAX_LENGTH: 24,       // T1-20: ชื่อห้องยาวสุด (client จำกัดช่องพิมพ์, server ตัดเอง)
  PUBLIC_ROOM_HOST: 'System',     // T1-20: host ของห้องสาธารณะ 83921 ที่ server สร้างเอง (UI ไม่แสดงเป็นชื่อผู้เล่น)
});

// ---------- U4: จำกัดความถี่ของ event ต่อ socket (server บังคับ, เกินแล้วทิ้งเงียบ ๆ ไม่ตัดการเชื่อมต่อ) ----------
// key = ชื่อ key ใน SOCKET_EVENTS; max ครั้งภายใน windowMs (หน้าต่างเลื่อน)
// DRAW = ทุก event การวาดรวมกัน (events) — เพดานสูงมาก ไม่ให้การวาดเร็วตามปกติสะดุด
// solo_ai_predict ใช้ SOLO_AI.SERVER_MIN_INTERVAL_MS แยกต่างหาก (มีอยู่แล้ว)
export const RATE_LIMITS = Object.freeze({
  SEND_CHAT: Object.freeze({ max: 5, windowMs: 2000 }),
  CREATE_ROOM: Object.freeze({ max: 5, windowMs: 10000 }),
  JOIN_ROOM: Object.freeze({ max: 10, windowMs: 10000 }),
  REJOIN_ROOM: Object.freeze({ max: 10, windowMs: 10000 }),
  TOGGLE_READY: Object.freeze({ max: 10, windowMs: 5000 }),
  UPDATE_ROOM_SETTINGS: Object.freeze({ max: 20, windowMs: 5000 }),
  SWITCH_TEAM: Object.freeze({ max: 10, windowMs: 5000 }),
  SELECT_WORD: Object.freeze({ max: 10, windowMs: 5000 }),
  DRAW: Object.freeze({ max: 600, windowMs: 1000,
    events: Object.freeze(['DRAW_BEGIN', 'DRAW_PATH', 'DRAW_END', 'DRAW_CLEAR', 'DRAW_FILL', 'SHAPE_PREVIEW']) }),
});

// ---------- เวลาแสดงผลฝั่ง client (UX เท่านั้น ไม่ใช่กติกาที่ server บังคับ) ----------
export const UI = Object.freeze({
  CHALLENGE_POPUP_MS: 3000,       // D3: ป็อปอัปชาเลนจ์ต้นเทิร์นปิดเองหลัง 3 วินาที (หรือกด GOT IT)
});

// ---------- ระดับความยากของคำ ----------
export const WORD_DIFFICULTY = Object.freeze({
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
});

// ---------- Solo vs AI ----------
export const SOLO_AI = Object.freeze({
  // ภาพที่ส่งให้โมเดล
  IMAGE_SIZE: 28,
  PIXEL_COUNT: 784,               // 28 x 28, ค่า 0..1, พื้น = 0, เส้น = 1

  // ความถี่การส่ง
  PREDICT_INTERVAL_MS: 1000,      // client ส่งทุก 1 วินาที
  SERVER_MIN_INTERVAL_MS: 500,    // server ไม่รับถี่กว่านี้ (rate limit)

  // เกณฑ์ตัดสิน
  MIN_GAME_SHARE: 0.5,            // คำเป้าหมายต้องได้ส่วนแบ่ง >= 50% ในกลุ่มคำของเกม
  MIN_RAW_PROB: 0.1,              // และความน่าจะเป็นดิบจาก 345 หมวด >= 10%
  MIN_INK: 5,                     // ผลรวมหมึกต่ำกว่านี้ = ยังไม่ได้วาด
  CORRECT_SCORE: 500,

  // โมเดล
  MODEL_NAME: 'DoodleNet (Yining Shi, 345 classes)',
  MODEL_DIR: 'ai_model',          // อยู่ใน server/src/

  // T1-23: Solo สลับตา — HUMAN = คนวาด / AI ทาย, AI = AI วาด / คนทาย (room_data.soloTurn เป็นตัวบอกตาที่ถูกต้อง)
  TURNS: Object.freeze({ HUMAN: 'HUMAN', AI: 'AI' }),
  // คำที่ AI วาดได้ (มี stroke template ใน server/src/utils/aiDrawer.js) — Stage 1 มี 7 คำเท่านั้น
  AI_DRAW_WORDS: Object.freeze(['Sun', 'House', 'Tree', 'Apple', 'Clock', 'Rainbow', 'Car']),
  AI_STROKE_INTERVAL_MS: 60,      // server ส่งจุดของเส้นที่ AI วาดทีละจุดทุก 60 ms (draw_begin / draw_path / draw_end เดิม)

  // คำในเกม -> ชื่อหมวดในโมเดล DoodleNet
  GAME_WORDS: Object.freeze({
    'Apple': 'apple', 'Cat': 'cat', 'House': 'house', 'Car': 'car', 'Tree': 'tree',
    'Sun': 'sun', 'Pizza': 'pizza', 'Guitar': 'guitar', 'Bicycle': 'bicycle',
    'Helicopter': 'helicopter', 'Airplane': 'airplane', 'Elephant': 'elephant',
    'Computer': 'computer', 'Eiffel Tower': 'The_Eiffel_Tower', 'Submarine': 'submarine',
    'Dragon': 'dragon', 'Rainbow': 'rainbow', 'Clock': 'clock', 'Basketball': 'basketball',
  }),
});

// ---------- รูปแบบข้อมูลที่รับส่งผ่าน socket (ห้ามเปลี่ยนชื่อฟิลด์) ----------
//
// D1 ระดับความยากของคำ (host เลือกใน lobby)
//   client -> server : SOCKET_EVENTS.UPDATE_ROOM_SETTINGS  { wordDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | null }  (null = Mixed)
//   server -> client : SOCKET_EVENTS.ROOM_DATA             { ..., wordDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | null }
//
// client -> server  : SOCKET_EVENTS.SOLO_AI_PREDICT
//   { targetWord: string, pixels: number[784] }
//
// server -> client  : SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT
//   {
//     targetWord: string,                         // ส่งกลับคำเดิม ให้ client ทิ้งผลของคำเก่า
//     ready: boolean,                             // false = โมเดลยังไม่พร้อม (ไม่มีการเดาสุ่ม, isCorrect = false)
//     guess: string | null,                       // คำในเกมที่ AI คิดว่าใช่ที่สุด (null = ยังไม่ได้วาด / ยังไม่พร้อม)
//     confidence: number,                         // 0..100 (ส่วนแบ่งในกลุ่มคำของเกม)
//     isConfident: boolean,                       // ความน่าจะเป็นดิบ >= MIN_RAW_PROB (false → client แสดง "Not sure yet…")
//     top3: [{ label: string, confidence: number }],
//     modelSees: { label: string, confidence: number } | null,  // อันดับ 1 จาก 345 หมวด
//     isCorrect: boolean
//   }
//   (A8/A9: เพิ่ม ready และ isConfident; server เป็นเจ้าของ targetWord — client ส่ง room_data.currentWord กลับมาเท่านั้น)

export function isValidPredictRequest(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const { targetWord, pixels } = payload;
  if (typeof targetWord !== 'string' || !(targetWord in SOLO_AI.GAME_WORDS)) return false;
  if (!Array.isArray(pixels) || pixels.length !== SOLO_AI.PIXEL_COUNT) return false;
  return pixels.every((v) => typeof v === 'number' && v >= 0 && v <= 1);
}

// รองรับทั้ง ESM (client/Vite) และ CommonJS (server) แบบเดียวกับ shared/events.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_STATUS,
    GAME_RULES,
    RATE_LIMITS,
    UI,
    WORD_DIFFICULTY,
    SOLO_AI,
    isValidPredictRequest,
  };
}
