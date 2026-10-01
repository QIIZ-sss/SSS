/**
 * วาด array ของเส้นลงบน canvas
 *
 * พิกัดที่เก็บเป็น 0..1 เสมอ จึงคูณด้วยขนาดจริงตอนวาด
 * ข้อดีคือภาพเดียวกันแสดงได้ทั้งบนมือถือและบนจอคอมโดยไม่เพี้ยน และย่อเป็นรูปเล็กในแกลเลอรีได้ฟรี
 */
export function renderStrokes(ctx, strokes, width, height, { background = '#ffffff' } = {}) {
  ctx.save();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (!stroke.points?.length) continue;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.points.length === 1) {
      const [x, y] = stroke.points[0];
      ctx.beginPath();
      ctx.arc(x * width, y * height, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0][0] * width, stroke.points[0][1] * height);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0] * width, stroke.points[i][1] * height);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/** ปรับ canvas ให้คมบนจอความละเอียดสูง แล้วคืนขนาดที่ใช้วาด */
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

/** แปลงตำแหน่ง pointer เป็นพิกัด 0..1 */
export function toNormalized(event, element) {
  const rect = element.getBoundingClientRect();
  return [
    Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  ];
}
