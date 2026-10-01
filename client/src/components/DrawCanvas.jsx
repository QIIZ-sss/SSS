import { useEffect, useRef, useState } from 'react';
import { fitCanvas, renderStrokes, toNormalized } from '../lib/canvasRender.js';

const PALETTE = ['#16181D', '#FF3D7F', '#00C2D1', '#FFC53D', '#6C4CF1', '#2BB673', '#FF7A45', '#FFFFFF'];

const MIN_WIDTH = 2;
const MAX_WIDTH = 44;

/**
 * กระดานวาด — เครื่องมืออยู่แถบขวา กระดาษอยู่ซ้าย
 *
 * ที่ย้ายเครื่องมือมาไว้ข้างขวาแทนที่จะอยู่ใต้กระดาษ เพราะเวลาวาดจริงมือจะอยู่กลางจอ
 * ถ้าเครื่องมืออยู่ข้างล่างต้องลากเมาส์ผ่านภาพที่กำลังวาดทุกครั้งที่เปลี่ยนสี
 * บนจอแคบ (มือถือ) แถบจะย้ายลงล่างและเรียงแนวนอนแทน เพราะพื้นที่กว้างมีค่ากว่าบนจอนั้น
 *
 * ข้อจำกัดจาก challenge บังคับที่นี่เพื่อประสบการณ์ที่ดี (ปุ่มถูกปิด เห็นชัดว่าทำอะไรไม่ได้)
 * แต่นี่เป็นแค่ชั้นความสะดวก — เซิร์ฟเวอร์ตรวจซ้ำทุกครั้งใน enforceChallenges()
 */
export default function DrawCanvas({ constraints = {}, strokes, onChange, disabled }) {
  const drawCanvas = useRef(null);
  const frameRef = useRef(null);
  const current = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });

  const [color, setColor] = useState('#16181D');
  const [width, setWidth] = useState(8);
  const [tool, setTool] = useState('pen');

  const allowedColors = constraints.colors ?? PALETTE;
  const minWidth = Math.max(MIN_WIDTH, constraints.minWidth ?? MIN_WIDTH);
  const singleStroke = !!constraints.singleStroke;
  const jitter = constraints.jitter ?? 0;
  const canUndo = !constraints.noUndo && strokes.length > 0 && !disabled;

  // สีที่เลือกอยู่อาจถูก challenge "สีต้องห้าม" ตัดออก — ย้ายไปสีแรกที่ใช้ได้
  useEffect(() => {
    if (!allowedColors.includes(color)) setColor(allowedColors[0]);
  }, [allowedColors, color]);

  useEffect(() => {
    if (width < minWidth) setWidth(minWidth);
  }, [minWidth, width]);

  const redrawAll = () => {
    const canvas = drawCanvas.current;
    if (!canvas) return;
    const { ctx, width: w, height: h } = fitCanvas(canvas);
    sizeRef.current = { width: w, height: h };
    ctx.clearRect(0, 0, w, h);
    renderStrokes(ctx, strokes, w, h, { background: '#ffffff' });
  };

  useEffect(redrawAll, [strokes]);

  useEffect(() => {
    window.addEventListener('resize', redrawAll);
    return () => window.removeEventListener('resize', redrawAll);
  });

  const applyJitter = (point) => {
    if (!jitter) return point;
    return [
      point[0] + (Math.random() - 0.5) * jitter * 2,
      point[1] + (Math.random() - 0.5) * jitter * 2,
    ];
  };

  const beginStroke = (event) => {
    if (disabled) return;
    if (singleStroke && strokes.length >= 1) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    current.current = {
      points: [applyJitter(toNormalized(event, frameRef.current))],
      color: tool === 'eraser' ? '#000000' : color,
      width: Math.max(width, minWidth),
      tool,
    };
  };

  const extendStroke = (event) => {
    if (!current.current) return;
    const point = applyJitter(toNormalized(event, frameRef.current));
    const stroke = current.current;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);

    // วาดเฉพาะเส้นใหม่ทีละท่อน แทนที่จะล้างแล้ววาดใหม่ทั้งภาพ ไม่งั้นเส้นจะหน่วงเมื่อวาดเยอะ
    const ctx = drawCanvas.current.getContext('2d');
    const { width: w, height: h } = sizeRef.current;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(prev[0] * w, prev[1] * h);
    ctx.lineTo(point[0] * w, point[1] * h);
    ctx.stroke();
    ctx.restore();
  };

  const endStroke = () => {
    if (!current.current) return;
    const stroke = current.current;
    current.current = null;
    if (stroke.points.length === 0) return;
    onChange([...strokes, stroke]);
  };

  const previewSize = Math.max(4, Math.min(width, 40));

  return (
    <div className="board">
      <div
        className="board__paper"
        ref={frameRef}
        onPointerDown={beginStroke}
        onPointerMove={extendStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      >
        <canvas ref={drawCanvas} />
      </div>

      <aside className="tools" aria-label="เครื่องมือวาด">
        <div className="tools__group">
          <div className="tools__label">สี</div>
          <div className="tools__swatches">
            {PALETTE.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                aria-label={`เลือกสี ${c}`}
                aria-pressed={tool === 'pen' && color === c}
                disabled={disabled || !allowedColors.includes(c)}
                onClick={() => {
                  setTool('pen');
                  setColor(c);
                }}
              />
            ))}
          </div>
        </div>

        <div className="tools__group">
          <div className="tools__label">
            ขนาดหัว <span className="tools__value">{width}</span>
          </div>
          <div className="tools__preview" aria-hidden="true">
            <span
              style={{
                width: previewSize,
                height: previewSize,
                background: tool === 'eraser' ? 'transparent' : color,
                border: tool === 'eraser' ? '2px dashed var(--ink)' : '1px solid rgba(0,0,0,.15)',
              }}
            />
          </div>
          <input
            type="range"
            className="tools__slider"
            min={minWidth}
            max={MAX_WIDTH}
            value={width}
            disabled={disabled}
            aria-label="ขนาดหัวปากกา"
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </div>

        <div className="tools__group">
          <div className="tools__label">เครื่องมือ</div>
          <button
            className="tools__btn"
            aria-pressed={tool === 'pen'}
            disabled={disabled}
            onClick={() => setTool('pen')}
          >
            ปากกา
          </button>
          <button
            className="tools__btn"
            aria-pressed={tool === 'eraser'}
            disabled={disabled}
            onClick={() => setTool('eraser')}
          >
            ยางลบ
          </button>
        </div>

        <div className="tools__group">
          <button className="tools__btn" disabled={!canUndo} onClick={() => onChange(strokes.slice(0, -1))}>
            เลิกทำ
          </button>
          <button
            className="tools__btn tools__btn--warn"
            disabled={disabled || !strokes.length}
            onClick={() => onChange([])}
          >
            ล้างกระดาน
          </button>
        </div>

        {singleStroke && (
          <p className="tools__note">
            {strokes.length >= 1 ? 'ครบเส้นเดียวแล้ว' : 'รอบนี้วาดได้เส้นเดียว'}
          </p>
        )}
      </aside>
    </div>
  );
}
