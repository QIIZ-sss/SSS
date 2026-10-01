import { useEffect, useRef } from 'react';

/**
 * แสดงภาพวาดจากข้อมูลเส้น
 *
 * หน้าแอดมินต้องเห็นภาพจริงถึงจะตัดสินได้ว่าเนื้อหาไม่เหมาะสมจริงไหม
 * แต่ภาพที่ถูกลบไปแล้วจะไม่ถูกส่งมาจากเซิร์ฟเวอร์เลย (strokes เป็น array ว่าง)
 * จึงไม่มีทางที่แอดมินคนอื่นจะเปิดดูภาพที่ถูกลบไปแล้วซ้ำได้
 */
export default function Art({ strokes, removed }) {
  const ref = useRef(null);

  useEffect(() => {
    if (removed) return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;

    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const s of strokes || []) {
        if (!s.points?.length) continue;
        ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.points[0][0] * w, s.points[0][1] * h);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i][0] * w, s.points[i][1] * h);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, [strokes, removed]);

  if (removed) return <div className="removed-art">ภาพนี้ถูกลบแล้ว</div>;
  return <canvas ref={ref} />;
}
