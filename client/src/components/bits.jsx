import { useEffect, useRef, useState } from 'react';
import { fitCanvas, renderStrokes } from '../lib/canvasRender.js';

/**
 * นาฬิกานับถอยหลัง
 * รับเวลาสิ้นสุดเป็น timestamp จากเซิร์ฟเวอร์ ไม่ใช่จำนวนวินาที
 * เพราะถ้านับจากวินาทีที่หน้าเว็บได้รับ คนเน็ตช้าจะได้เวลามากกว่าคนอื่น
 */
export function Countdown({ endsAt, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const tick = () => {
      const remaining = Math.max(0, endsAt - Date.now());
      setLeft(remaining);
      if (remaining === 0 && !fired.current) {
        fired.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const seconds = Math.ceil(left / 1000);
  return (
    <div className="timer" data-low={seconds <= 10} role="timer" aria-live="off">
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </div>
  );
}

export function ChallengeBanner({ challenges }) {
  if (!challenges?.length) return null;
  return (
    <div className="challenge-banner">
      <div className="challenge-banner__title">
        {challenges.length > 1 ? 'รอบนี้มีของแถมสองอย่าง' : 'รอบนี้มีของแถม'}
      </div>
      {challenges.map((c) => (
        <div key={c.id} className="challenge-banner__item">
          <b>{c.name}</b> — {c.hint}
        </div>
      ))}
    </div>
  );
}

/** รูปนิ่งของภาพวาด ใช้ในแกลเลอรีและหน้าเฉลย */
export function DrawingView({ strokes, className, style }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const paint = () => {
      const { ctx, width, height } = fitCanvas(canvas);
      renderStrokes(ctx, strokes, width, height);
    };
    paint();
    window.addEventListener('resize', paint);
    return () => window.removeEventListener('resize', paint);
  }, [strokes]);

  return <canvas ref={ref} className={className} style={style} />;
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
