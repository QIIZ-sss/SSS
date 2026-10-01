// ============================================================
// JUST DRAW IT - ค่ากลาง (Single Source of Truth)
// ใช้ร่วมกันทั้ง client และ server ห้ามพิมพ์ค่าเหล่านี้ซ้ำเป็นตัวเลข/ข้อความตรง ๆ ในไฟล์อื่น
// ถ้าจะเปลี่ยนค่า ให้แก้ที่ไฟล์นี้ที่เดียว และแจ้งทีมทุกครั้ง
// ============================================================

// ---------- สถานะห้อง ----------
const GAME_STATUS = Object.freeze({
  LOBBY: 'LOBBY',
  WORD_SELECTION: 'WORD_SELECTION',
  PLAYING: 'PLAYING',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER: 'GAME_OVER',
});

// ---------- กติกาที่ server ต้องบังคับ (client ใช้แค่แสดงผล/ปิดปุ่ม) ----------
const GAME_RULES = Object.freeze({
  MIN_PLAYERS_FFA: 2,             // FFA ต้องมีอย่างน้อย 2 คน
  MIN_PLAYERS_PER_TEAM: 1,        // Team ต้องมีทีมละอย่างน้อย 1 คน
  MIN_PLAYERS_TEAM_TOTAL: 2,
  REQUIRE_ALL_READY: true,        // ทุกคนต้องกด Ready ก่อนเริ่ม (Host ไม่ต้องกด)
  DRAWER_CAN_CHAT: false,         // คนวาดพิมพ์แชทไม่ได้ระหว่างรอบ
  // ส่ง currentWord ให้คนทายได้เฉพาะสถานะเหล่านี้ (กันคำตอบรั่วใน WebSocket)
  REVEAL_WORD_STATUSES: Object.freeze(['ROUND_OVER', 'GAME_OVER']),
  ROOM_PIN_LENGTH: 5,
  RECONNECT_GRACE_MS: 30000,      // เก็บที่ผู้เล่นที่หลุดไว้ 30 วินาที
});

// ---------- ระดับความยากของคำ ----------
const WORD_DIFFICULTY = Object.freeze({
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
});

// ---------- Solo vs AI ----------
const SOLO_AI = Object.freeze({
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
// client -> server  : SOCKET_EVENTS.SOLO_AI_PREDICT
//   { targetWord: string, pixels: number[784] }
//
// server -> client  : SOCKET_EVENTS.SOLO_AI_PREDICTION_RESULT
//   {
//     targetWord: string,                         // ส่งกลับคำเดิม ให้ client ทิ้งผลของคำเก่า
//     guess: string,                              // คำในเกมที่ AI คิดว่าใช่ที่สุด
//     confidence: number,                         // 0..100 (ส่วนแบ่งในกลุ่มคำของเกม)
//     top3: [{ label: string, confidence: number }],
//     modelSees: { label: string, confidence: number } | null,  // อันดับ 1 จาก 345 หมวด
//     isCorrect: boolean
//   }

function isValidPredictRequest(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const { targetWord, pixels } = payload;
  if (typeof targetWord !== 'string' || !(targetWord in SOLO_AI.GAME_WORDS)) return false;
  if (!Array.isArray(pixels) || pixels.length !== SOLO_AI.PIXEL_COUNT) return false;
  return pixels.every((v) => typeof v === 'number' && v >= 0 && v <= 1);
}

module.exports = {
  GAME_STATUS,
  GAME_RULES,
  WORD_DIFFICULTY,
  SOLO_AI,
  isValidPredictRequest,
};
