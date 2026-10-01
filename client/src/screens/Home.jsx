import { useState } from 'react';

export default function Home({ onCreate, onJoin, onQuickPlay, busy }) {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');

  const nameReady = nickname.trim().length >= 2;

  return (
    <div className="home">
      <div className="card stack">
        <p className="home__lede">
          ทุกคนได้คำใบ้คนละคำแล้ววาดพร้อมกัน พอหมดเวลา ภาพของคุณจะถูกส่งไปให้คนถัดไปวาดต่อ
          วนไปจนครบทุกคน แล้วค่อยเปิดดูพร้อมกันตอนจบว่าภาพเดินทางไปไกลแค่ไหน
        </p>

        <ol className="home__steps">
          <li>
            <b>1</b> ตั้งชื่อเล่น
          </li>
          <li>
            <b>2</b> สร้างห้องแล้วส่งรหัสให้เพื่อน หรือกดหาห้องสาธารณะ
          </li>
          <li>
            <b>3</b> วาด ทาย วาด ทาย แล้วดูผลลัพธ์พร้อมกัน
          </li>
        </ol>
      </div>

      <div className="card stack">
        <div className="field">
          <label htmlFor="nickname">ชื่อเล่น</label>
          <input
            id="nickname"
            className="input"
            maxLength={16}
            placeholder="เรียกคุณว่าอะไรดี"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="home__actions">
          <button
            className="btn btn--go btn--block"
            disabled={!nameReady || busy}
            onClick={() => onCreate(nickname.trim(), false)}
          >
            สร้างห้องเล่นกับเพื่อน
          </button>

          <div className="split">
            <div className="field">
              <label htmlFor="code">มีรหัสห้องอยู่แล้ว</label>
              <input
                id="code"
                className="input input--code"
                maxLength={6}
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <button
              className="btn btn--primary"
              disabled={!nameReady || code.length !== 6 || busy}
              onClick={() => onJoin(nickname.trim(), code)}
            >
              เข้าห้อง
            </button>
          </div>

          <button
            className="btn btn--block"
            disabled={!nameReady || busy}
            onClick={() => onQuickPlay(nickname.trim())}
          >
            หาห้องสาธารณะ (สูงสุด 10 คน)
          </button>
        </div>

        <p className="muted">
          ห้องเพื่อนรับได้ถึง 25 คน และเจ้าของห้องตั้งกติกาเองได้ ส่วนห้องสาธารณะใช้ค่ามาตรฐานเพื่อให้เริ่มเล่นได้เร็ว
        </p>
      </div>
    </div>
  );
}
