import { useEffect, useState } from 'react';
import { DrawingView } from '../components/bits.jsx';

const EMOJI = ['😂', '😍', '🤯', '💀', '👏', '🤔', '😱', '🔥'];

/**
 * ช่วงเปิดผลงาน แบ่งเป็นสองจังหวะ:
 *   1. ภาพรวม — เห็นภาพสุดท้ายของทุกสายพร้อมกัน เป็นจังหวะ "ฮาแรก"
 *   2. ไล่ทีละสาย — เห็นเป็นเรื่องเล่า คำใบ้ → ภาพ → คำตอบ → ภาพ → คำตอบ
 *      จังหวะที่ตลกที่สุดคือตอนเห็นว่าคำตอบเพี้ยนจากคำใบ้ตั้งต้นไปไกลแค่ไหน
 *
 * เจ้าของห้องคุมจังหวะ แต่คนอื่นกด "ดูเอง" เพื่อเลื่อนอิสระได้
 * เพราะจากการเล่นจริง จะมีคนอยากย้อนกลับไปดูขั้นเมื่อกี้เสมอ
 */
export default function Reveal({ data, view, reactions, isHost, onView, onReact, onReport, onReset }) {
  const [freeBrowse, setFreeBrowse] = useState(false);
  const [local, setLocal] = useState(view);

  useEffect(() => {
    if (!freeBrowse) setLocal(view);
  }, [view, freeBrowse]);

  const active = freeBrowse ? local : view;
  const chain = data.chains[active.chainIndex];

  const move = (next) => {
    if (freeBrowse || !isHost) setLocal(next);
    if (isHost && !freeBrowse) onView(next);
  };

  if (active.stage === 'overview') {
    return (
      <div className="stack">
        <div className="row">
          <h2>ผลงานทั้งหมด {data.chains.length} สาย</h2>
          <span className="grow" />
          {isHost && (
            <button className="btn btn--primary" onClick={onReset}>
              กลับไปห้องรอ
            </button>
          )}
        </div>
        <p className="muted">
          กดที่สายไหนก็ได้ เพื่อดูว่าคำใบ้ตั้งต้นเดินทางผ่านมือทุกคนแล้วกลายเป็นอะไร
        </p>

        <div className="gallery">
          {data.chains.map((c) => {
            const lastDraw = [...c.steps].reverse().find((s) => s.kind === 'draw');
            const lastGuess = [...c.steps].reverse().find((s) => s.kind === 'guess');
            return (
              <button
                key={c.index}
                className="gallery__item"
                onClick={() => move({ stage: 'chain', chainIndex: c.index, stepIndex: 0 })}
              >
                <DrawingView strokes={lastDraw?.strokes || []} />
                <div className="gallery__caption">
                  <div className="gallery__from">เริ่มจาก “{c.prompt}”</div>
                  {lastGuess && <div className="gallery__to">จบที่ “{lastGuess.text}”</div>}
                </div>
              </button>
            );
          })}
        </div>

        {!isHost && <p className="muted">เจ้าของห้องคุมจังหวะ แต่คุณกดดูเองก่อนได้</p>}
      </div>
    );
  }

  const step = chain.steps[active.stepIndex];
  const key = `${active.chainIndex}:${active.stepIndex}`;
  const counts = reactions[key] || {};

  return (
    <div className="stack">
      <div className="row">
        <button
          className="btn btn--sm"
          onClick={() => move({ stage: 'overview', chainIndex: active.chainIndex, stepIndex: 0 })}
        >
          กลับไปภาพรวม
        </button>
        <span className="grow" />
        {!isHost && (
          <button className="btn btn--sm btn--ghost" onClick={() => setFreeBrowse((v) => !v)}>
            {freeBrowse ? 'ตามเจ้าของห้อง' : 'ดูเอง'}
          </button>
        )}
        {isHost && active.chainIndex < data.chains.length - 1 && (
          <button
            className="btn btn--sm"
            onClick={() => move({ stage: 'chain', chainIndex: active.chainIndex + 1, stepIndex: 0 })}
          >
            สายถัดไป
          </button>
        )}
      </div>

      <div className="prompt-card">
        <div className="prompt-card__label">คำใบ้ตั้งต้น — {chain.ownerName} ได้คำนี้ไป</div>
        <div className="prompt-card__text">{chain.prompt}</div>
      </div>

      {step.kind === 'draw' ? (
        <div className="board__paper board__paper--static">
          <DrawingView strokes={step.strokes || []} />
        </div>
      ) : (
        <div className="guess-card">
          <div className="guess-card__label">ตีความว่าเป็นภาพ</div>
          <div className="guess-card__text">“{step.text}”</div>
        </div>
      )}

      <div className="row">
        <div>
          <div className="round__step">
            ขั้นที่ {active.stepIndex + 1} จาก {chain.steps.length} ·{' '}
            {step.kind === 'draw' ? 'วาด' : 'ทาย'}
          </div>
          <div>
            โดย <b>{step.byName}</b>
            {step.skipped && <span className="muted"> (ไม่ได้ส่งงาน)</span>}
          </div>
          {step.challenges?.length > 0 && (
            <div className="muted">รอบนี้มีของแถม: {step.challenges.join(', ')}</div>
          )}
        </div>
        <span className="grow" />
        <button
          className="btn btn--sm"
          disabled={active.stepIndex === 0}
          onClick={() => move({ ...active, stepIndex: active.stepIndex - 1 })}
        >
          ย้อนกลับ
        </button>
        <button
          className="btn btn--sm btn--primary"
          disabled={active.stepIndex >= chain.steps.length - 1}
          onClick={() => move({ ...active, stepIndex: active.stepIndex + 1 })}
        >
          ถัดไป
        </button>
      </div>

      <div className="filmstrip">
        {chain.steps.map((s) => (
          <button
            key={s.index}
            aria-current={s.index === active.stepIndex}
            data-kind={s.kind}
            onClick={() => move({ ...active, stepIndex: s.index })}
          >
            {s.kind === 'draw' ? '✏' : '💬'}
            <small>{s.index + 1}</small>
          </button>
        ))}
      </div>

      <div className="card card--flat stack">
        <div className="card__label">คิดยังไงกับขั้นนี้</div>
        <div className="emoji-bar">
          {EMOJI.map((e) => (
            <button
              key={e}
              className="emoji-btn"
              onClick={() => onReact(active.chainIndex, active.stepIndex, e)}
            >
              {e}
              {counts[e] > 0 && <span>{counts[e]}</span>}
            </button>
          ))}
        </div>
        {step.kind === 'draw' && (
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => onReport(active.chainIndex, active.stepIndex)}
            style={{ justifySelf: 'start' }}
          >
            รายงานภาพนี้
          </button>
        )}
      </div>
    </div>
  );
}
