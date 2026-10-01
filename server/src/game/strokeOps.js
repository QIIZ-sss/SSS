/**
 * การแปลงเส้นวาด — ใช้กับ challenge ประเภท handoff (แปลงภาพก่อนส่งให้คนถัดไป)
 *
 * เหตุผลที่เราเก็บภาพเป็น "เส้น" ไม่ใช่ PNG อยู่ตรงนี้:
 * ถ้าเก็บเป็นรูป จะทำ "ยางลบผี" หรือ "สีเพี้ยน" ไม่ได้เลยโดยไม่ต้องประมวลผลภาพหนัก ๆ
 * แต่พอเป็น array ของจุด มันกลายเป็นการแก้ตัวเลขธรรมดา ทำที่เซิร์ฟเวอร์ได้สบาย
 *
 * ระบบพิกัด: x, y เป็น 0..1 เสมอ (normalize ตามขนาด canvas) ทำให้จอขนาดไหนก็ตรงกัน
 */

/** พลิกซ้าย-ขวา */
export function flipHorizontal(strokes) {
  return strokes.map((s) => ({ ...s, points: s.points.map((p) => [1 - p[0], p[1]]) }));
}

/** กลับหัว */
export function flipVertical(strokes) {
  return strokes.map((s) => ({ ...s, points: s.points.map((p) => [p[0], 1 - p[1]]) }));
}

/**
 * ยางลบผี — สุ่มลบบางช่วงของเส้น ไม่ใช่ลบทั้งเส้น
 * ตั้งใจให้ลบเป็น "ช่วง" เพราะการลบทั้งเส้นทำให้ภาพหายไปทีละก้อนใหญ่แล้วเดาต่อไม่ออก
 * แต่การเจาะรูกลางเส้นทำให้ภาพยัง "อ่านออกครึ่ง ๆ" ซึ่งเป็นจุดที่สนุกที่สุด
 */
export function ghostErase(strokes, rng, ratio = 0.3) {
  const out = [];
  for (const s of strokes) {
    if (s.points.length < 4) {
      if (rng.chance(1 - ratio)) out.push(s);
      continue;
    }
    // เจาะ 1-2 รูต่อเส้น
    const holes = rng.int(1, 2);
    const keep = new Array(s.points.length).fill(true);
    for (let h = 0; h < holes; h++) {
      const len = Math.max(2, Math.floor(s.points.length * ratio * rng.float(0.5, 1)));
      const start = rng.int(0, Math.max(0, s.points.length - len));
      for (let i = start; i < start + len && i < keep.length; i++) keep[i] = false;
    }
    // ตัดเป็นชิ้นตามช่วงที่เหลือ
    let piece = [];
    for (let i = 0; i < s.points.length; i++) {
      if (keep[i]) piece.push(s.points[i]);
      else if (piece.length >= 2) {
        out.push({ ...s, points: piece });
        piece = [];
      } else piece = [];
    }
    if (piece.length >= 2) out.push({ ...s, points: piece });
  }
  return out;
}

const SHUFFLE_COLORS = ['#FF3D7F', '#00C2D1', '#FFC53D', '#6C4CF1', '#2BB673', '#FF7A45'];

/** สีเพี้ยน — สลับสีทุกเส้นแบบสุ่ม */
export function shuffleColors(strokes, rng) {
  return strokes.map((s) => ({ ...s, color: rng.pick(SHUFFLE_COLORS) }));
}

/** นับจำนวนจุดทั้งหมด ใช้ตรวจขนาด payload */
export function countPoints(strokes) {
  let n = 0;
  for (const s of strokes) n += s.points.length;
  return n;
}

/**
 * ลดความละเอียดของเส้น (Ramer–Douglas–Peucker แบบง่าย)
 * ใช้ตอนรับข้อมูลเข้า เพื่อไม่ให้เมาส์ความถี่สูงส่งจุดมาเป็นหมื่น
 */
export function simplify(points, tolerance = 0.002) {
  if (points.length < 3) return points;
  const out = [points[0]];
  let last = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const dx = points[i][0] - last[0];
    const dy = points[i][1] - last[1];
    if (dx * dx + dy * dy >= tolerance * tolerance) {
      out.push(points[i]);
      last = points[i];
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
