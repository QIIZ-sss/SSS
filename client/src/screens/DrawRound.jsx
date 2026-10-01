import { useCallback, useEffect, useMemo, useState } from 'react';
import DrawCanvas from '../components/DrawCanvas.jsx';
import { ChallengeBanner, Countdown } from '../components/bits.jsx';

/**
 * แปลง challenge ที่เซิร์ฟเวอร์ส่งมา ให้เป็นข้อจำกัดที่กระดานวาดเข้าใจ
 * เก็บ mapping ไว้ที่เดียวเพื่อให้เพิ่ม challenge ใหม่แล้วแก้จุดเดียว
 */
function toConstraints(challenges) {
  const out = {};
  for (const c of challenges) {
    if (c.id === 'no_lift') out.singleStroke = true;
    if (c.id === 'no_undo') out.noUndo = true;
    if (c.id === 'shaky') out.jitter = c.client?.jitter ?? 0.006;
    if (c.id === 'fat_brush') out.minWidth = c.client?.minWidth ?? 22;
    if (c.id === 'palette_lock') out.colors = c.payload?.colors ?? null;
  }
  return out;
}

/**
 * รอบวาด
 *
 * คนวาดเห็นแค่ "ข้อความ" อย่างเดียว — รอบแรกคือคำใบ้ของระบบ รอบถัด ๆ ไปคือคำตอบของคนก่อนหน้า
 * ไม่มีทางเห็นภาพของรอบก่อนเลย ซึ่งเป็นหัวใจของเกม ถ้าเห็นภาพเดิมความเพี้ยนจะหายไปหมด
 */
export default function DrawRound({ round, room, onSubmit }) {
  const [strokes, setStrokes] = useState([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setStrokes([]);
    setSent(false);
  }, [round.round]);

  const constraints = useMemo(() => toConstraints(round.challenges || []), [round.challenges]);

  const send = useCallback(() => {
    if (sent) return;
    setSent(true);
    onSubmit(strokes);
  }, [onSubmit, sent, strokes]);

  const handleExpire = useCallback(() => send(), [send]);

  return (
    <div className="round">
      <div className="round__head">
        <Countdown endsAt={round.endsAt} onExpire={handleExpire} />
        <div>
          <div className="round__step">
            รอบที่ {round.round + 1} จาก {round.totalRounds} · วาด
          </div>
          <div className="muted">
            ส่งงานแล้ว {room.submittedCount}/{room.players.length} คน
          </div>
        </div>
        <span className="grow" />
        <button className="btn btn--go" disabled={sent} onClick={send}>
          {sent ? 'ส่งงานแล้ว รอเพื่อน' : 'ส่งงาน'}
        </button>
      </div>

      <div className="prompt-card">
        <div className="prompt-card__label">
          {round.isFirstRound ? 'คำใบ้ของคุณ' : 'คนก่อนหน้าตอบไว้ว่า — วาดตามนี้'}
        </div>
        <div className="prompt-card__text">{round.prompt}</div>
      </div>

      {!round.isFirstRound && (
        <p className="muted" style={{ margin: 0 }}>
          คุณไม่เห็นภาพต้นฉบับและไม่เห็นคำใบ้ตั้งต้น มีแค่ประโยคข้างบนนี้อย่างเดียว
        </p>
      )}

      <ChallengeBanner challenges={round.challenges} />

      <DrawCanvas constraints={constraints} strokes={strokes} onChange={setStrokes} disabled={sent} />

      {sent && <p className="muted">ส่งเรียบร้อย รอคนอื่นวาดให้เสร็จก่อนนะ</p>}
    </div>
  );
}
