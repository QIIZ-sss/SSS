import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChallengeBanner, Countdown, DrawingView } from '../components/bits.jsx';

/**
 * รอบทาย
 *
 * แบ่งเป็นสองจังหวะ: ดูภาพได้ไม่กี่วินาที แล้วภาพหายไป ค่อยพิมพ์คำตอบ
 *
 * ที่ต้องซ่อนภาพตอนพิมพ์ ไม่ใช่แค่ตั้งเวลาเฉย ๆ เพราะถ้าภาพยังอยู่ คนจะจ้องแล้วบรรยาย
 * ละเอียดยิบ ("คนใส่หมวกถือไม้ยืนข้างต้นไม้") ซึ่งทำให้ภาพรอบถัดไปเหมือนเดิมเป๊ะ
 * พอบังคับให้ตอบจากความจำ คำตอบจะกลายเป็นการตีความ ซึ่งเป็นจุดที่เกมเพี้ยนและตลก
 *
 * เวลาทั้งหมดคุมโดยเซิร์ฟเวอร์ ตรงนี้แค่คำนวณว่าตอนนี้อยู่จังหวะไหนของช่วงเวลานั้น
 */
export default function GuessRound({ round, room, onSubmit }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [peeking, setPeeking] = useState(true);
  const inputRef = useRef(null);

  const peekEndsAt = useMemo(
    () => round.endsAt - round.seconds * 1000,
    [round.endsAt, round.seconds]
  );

  useEffect(() => {
    setText('');
    setSent(false);
    setPeeking(Date.now() < peekEndsAt);

    const id = setInterval(() => {
      if (Date.now() >= peekEndsAt) {
        setPeeking(false);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [round.round, peekEndsAt]);

  // โฟกัสช่องพิมพ์ทันทีที่ภาพหาย จะได้ไม่เสียเวลาหาเมาส์
  useEffect(() => {
    if (!peeking && !sent) inputRef.current?.focus();
  }, [peeking, sent]);

  const send = useCallback(() => {
    if (sent) return;
    setSent(true);
    onSubmit(text.trim());
  }, [onSubmit, sent, text]);

  const handleExpire = useCallback(() => send(), [send]);

  const blur = round.challenges?.find((c) => c.id === 'blurry')?.client?.blur ?? 0;
  const peekLeft = Math.max(0, Math.ceil((peekEndsAt - Date.now()) / 1000));

  return (
    <div className="round">
      <div className="round__head">
        <Countdown endsAt={round.endsAt} onExpire={handleExpire} />
        <div>
          <div className="round__step">
            รอบที่ {round.round + 1} จาก {round.totalRounds} · ทาย
          </div>
          <div className="muted">
            ตอบแล้ว {room.submittedCount}/{room.players.length} คน
          </div>
        </div>
        <span className="grow" />
        <button className="btn btn--go" disabled={sent || peeking || !text.trim()} onClick={send}>
          {sent ? 'ส่งคำตอบแล้ว' : 'ส่งคำตอบ'}
        </button>
      </div>

      <ChallengeBanner challenges={round.challenges} />

      {peeking ? (
        <>
          <div className="peek-bar">
            <span className="peek-bar__count">{peekLeft}</span>
            <span>ดูภาพนี้ให้ดี เดี๋ยวมันจะหายไป</span>
          </div>
          <div className="board__paper board__paper--static" style={blur ? { filter: `blur(${blur}px)` } : undefined}>
            <DrawingView strokes={round.reference || []} />
          </div>
        </>
      ) : (
        <>
          <div className="hidden-art">ภาพหายไปแล้ว — ตอบจากที่จำได้</div>
          <div className="guess-form">
            <label htmlFor="guess">คุณคิดว่านั่นคือภาพอะไร</label>
            <input
              id="guess"
              ref={inputRef}
              className="input input--guess"
              maxLength={60}
              placeholder="เช่น แมวใส่หมวกกันน็อก"
              value={text}
              disabled={sent}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && text.trim() && send()}
            />
            <p className="muted">
              คำตอบนี้จะถูกส่งให้คนถัดไปวาดตาม โดยเขาจะไม่เห็นภาพที่คุณเพิ่งดู
            </p>
          </div>
        </>
      )}

      {sent && <p className="muted">ส่งเรียบร้อย รอคนอื่นตอบให้ครบก่อนนะ</p>}
    </div>
  );
}
