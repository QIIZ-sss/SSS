import { useState } from 'react';

const FREQUENCIES = [
  { id: 'off', label: 'ปิด' },
  { id: 'low', label: 'นาน ๆ ครั้ง' },
  { id: 'medium', label: 'กลาง ๆ' },
  { id: 'high', label: 'บ่อย' },
  { id: 'always', label: 'ทุกรอบ' },
];

const MODES = [
  { id: 'random', label: 'สุ่มเอง' },
  { id: 'second_half', label: 'เฉพาะครึ่งหลัง' },
  { id: 'rounds', label: 'กำหนดรอบเอง' },
];

export default function Lobby({ room, catalog, me, onStart, onSettings, onKick, onLeave, notice }) {
  const isHost = room.hostId === me;
  const editable = isHost && !room.isPublic;
  const [copied, setCopied] = useState(false);
  const s = room.settings;

  const patch = (next) => onSettings(next);
  const toggleChallenge = (id) => {
    const enabled = s.challenges.enabled.includes(id)
      ? s.challenges.enabled.filter((x) => x !== id)
      : [...s.challenges.enabled, id];
    patch({ challenges: { enabled } });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="stack">
      <div className="ticket">
        <div>
          <div className="ticket__note">รหัสห้อง — บอกเพื่อนได้เลย</div>
          <div className="ticket__code">{room.code}</div>
        </div>
        <div className="row">
          <button className="btn btn--sm" onClick={copyCode}>
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}
          </button>
          <button className="btn btn--sm btn--ghost" onClick={onLeave}>
            ออกจากห้อง
          </button>
        </div>
      </div>

      <div className="card stack">
        <div className="row">
          <div className="card__label">
            ผู้เล่น {room.players.length}/{room.maxPlayers}
          </div>
          <span className="grow" />
          {room.isPublic && <span className="tag">ห้องสาธารณะ</span>}
        </div>

        <div className="roster">
          {room.players.map((p) => (
            <div key={p.id} className="roster__row" data-offline={!p.connected}>
              <span className="dot" style={{ background: p.color }} />
              <span>{p.name}</span>
              {p.isHost && <span className="tag tag--host">เจ้าของห้อง</span>}
              {!p.connected && <span className="muted">หลุดการเชื่อมต่อ</span>}
              <span className="grow" />
              {isHost && p.id !== me && (
                <button className="btn btn--sm btn--ghost" onClick={() => onKick(p.id)}>
                  เตะออก
                </button>
              )}
            </div>
          ))}
        </div>

        {room.players.length < 2 && (
          <p className="muted">ต้องมีอย่างน้อย 2 คนถึงจะเริ่มได้ ชวนเพื่อนด้วยรหัสด้านบน</p>
        )}

        {isHost ? (
          <button className="btn btn--go btn--block" disabled={room.players.length < 2} onClick={onStart}>
            เริ่มเกม
          </button>
        ) : (
          <p className="muted">รอเจ้าของห้องกดเริ่มเกม</p>
        )}
      </div>

      <div className="card stack">
        <div className="card__label">เกมนี้เล่นยังไง</div>
        <ol className="home__steps">
          <li>
            <b>1</b> ทุกคนได้คำใบ้คนละคำ วาดตามคำใบ้บนกระดาษเปล่า
          </li>
          <li>
            <b>2</b> ได้ภาพของคนอื่นมาดูสั้น ๆ ภาพหายไป แล้วพิมพ์ว่าคิดว่าเป็นภาพอะไร
          </li>
          <li>
            <b>3</b> ได้คำตอบของคนก่อนหน้ามาอ่าน แล้ววาดตามนั้น โดยไม่เห็นภาพเดิม
          </li>
          <li>
            <b>4</b> วน 2–3 สลับกันจนครบทุกคน แล้วเปิดดูพร้อมกันว่าเพี้ยนไปไกลแค่ไหน
          </li>
        </ol>
      </div>

      <div className="card stack">
        <div className="card__label">กติกาของห้องนี้</div>

        {!editable && (
          <p className="muted">
            {room.isPublic
              ? 'ห้องสาธารณะใช้ค่ามาตรฐานเพื่อให้ทุกห้องเล่นเหมือนกัน สร้างห้องเพื่อนถ้าอยากตั้งเอง'
              : 'เฉพาะเจ้าของห้องเท่านั้นที่แก้กติกาได้'}
          </p>
        )}

        <div className="settings-grid">
          <div className="field">
            <label htmlFor="secs">เวลาวาดต่อรอบ — {s.drawSeconds} วินาที</label>
            <input
              id="secs"
              type="range"
              min="20"
              max="180"
              step="5"
              value={s.drawSeconds}
              disabled={!editable}
              onChange={(e) => patch({ drawSeconds: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="peek">เวลาดูภาพก่อนตอบ — {s.peekSeconds} วินาที</label>
            <input
              id="peek"
              type="range"
              min="3"
              max="30"
              value={s.peekSeconds}
              disabled={!editable}
              onChange={(e) => patch({ peekSeconds: Number(e.target.value) })}
            />
            <span className="muted">ยิ่งสั้นยิ่งเพี้ยน ยิ่งเพี้ยนยิ่งตลก</span>
          </div>
          <div className="field">
            <label htmlFor="guess">เวลาพิมพ์คำตอบ — {s.guessSeconds} วินาที</label>
            <input
              id="guess"
              type="range"
              min="10"
              max="60"
              value={s.guessSeconds}
              disabled={!editable}
              onChange={(e) => patch({ guessSeconds: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="rounds">จำนวนรอบสูงสุด — {s.maxRounds}</label>
            <input
              id="rounds"
              type="range"
              min="2"
              max="25"
              value={s.maxRounds}
              disabled={!editable}
              onChange={(e) => patch({ maxRounds: Number(e.target.value) })}
            />
            <span className="muted">
              เกมจบเมื่อครบจำนวนนี้ หรือครบทุกคน แล้วแต่ว่าอะไรถึงก่อน
            </span>
          </div>
        </div>

        <div className="field">
          <label>ของแถมโผล่มาบ่อยแค่ไหน</label>
          <div className="chip-set">
            {FREQUENCIES.map((f) => (
              <button
                key={f.id}
                className="chip"
                aria-pressed={s.challenges.frequency === f.id}
                disabled={!editable}
                onClick={() => patch({ challenges: { frequency: f.id } })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>โผล่มาตอนไหน</label>
          <div className="chip-set">
            {MODES.map((m) => (
              <button
                key={m.id}
                className="chip"
                aria-pressed={s.challenges.mode === m.id}
                disabled={!editable}
                onClick={() => patch({ challenges: { mode: m.id } })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {s.challenges.mode === 'rounds' && (
          <div className="field">
            <label>เลือกรอบที่จะให้มีของแถม</label>
            <div className="chip-set">
              {Array.from({ length: s.maxRounds }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className="chip"
                  aria-pressed={s.challenges.specificRounds.includes(n)}
                  disabled={!editable}
                  onClick={() =>
                    patch({
                      challenges: {
                        specificRounds: s.challenges.specificRounds.includes(n)
                          ? s.challenges.specificRounds.filter((x) => x !== n)
                          : [...s.challenges.specificRounds, n],
                      },
                    })
                  }
                >
                  รอบ {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>เปิดของแถมแต่ละอย่าง</label>
          <div className="challenge-list">
            {catalog.map((c) => {
              const on = s.challenges.enabled.includes(c.id);
              return (
                <label key={c.id} className="challenge" data-on={on}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!editable}
                    onChange={() => toggleChallenge(c.id)}
                  />
                  <span>
                    <span className="challenge__name">{c.name}</span>{' '}
                    <span className="challenge__scope">
                      {c.scope === 'drawer' ? 'มีผลกับคนวาด' : 'มีผลกับภาพที่ส่งต่อ'}
                    </span>
                    <br />
                    <span className="challenge__hint">{c.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {notice && <p className="muted">{notice}</p>}
    </div>
  );
}
