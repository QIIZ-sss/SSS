import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

function Stat({ value, label, alert }) {
  return (
    <div className="stat" data-alert={!!alert}>
      <div className="stat__value">{value ?? '—'}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

export default function Dashboard({ guard, say }) {
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([guard(api.stats), guard(api.rooms)]);
      setStats(s);
      setRooms(r.rooms);
    } catch (err) {
      say(err.message, 'error');
    }
  }, [guard, say]);

  // รีเฟรชเองทุก 15 วินาที เพราะตัวเลขห้องที่กำลังเล่นเปลี่ยนตลอด
  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const stored = stats?.stored;

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel__title">กำลังเกิดขึ้นตอนนี้</div>
        <div className="stat-grid">
          <Stat value={stats?.live.rooms} label="ห้องทั้งหมด" />
          <Stat value={stats?.live.publicRooms} label="ห้องสาธารณะ" />
          <Stat value={stats?.live.players} label="ผู้เล่นออนไลน์" />
          <Stat value={stats?.live.playing} label="ห้องที่กำลังเล่น" />
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">ข้อมูลสะสม</div>
        <div className="stat-grid">
          <Stat value={stored?.reports_open} label="รายงานรอตรวจ" alert={Number(stored?.reports_open) > 0} />
          <Stat value={stored?.games_today} label="เกมใน 24 ชม." />
          <Stat value={stored?.games_total} label="เกมทั้งหมด" />
          <Stat value={stored?.drawings_total} label="ภาพทั้งหมด" />
          <Stat value={stored?.drawings_removed} label="ภาพที่ถูกลบ" />
          <Stat value={stored?.players_total} label="ผู้เล่นที่เคยเข้า" />
          <Stat value={stored?.bans_active} label="แบนที่ยังมีผล" />
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <div className="panel__title" style={{ margin: 0 }}>
            ห้องที่เปิดอยู่
          </div>
          <span className="grow" />
          <button className="btn btn--sm" onClick={load}>
            รีเฟรช
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="empty">ยังไม่มีห้องเปิดอยู่</div>
        ) : (
          <div className="table--scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>คน</th>
                  <th>รอบ</th>
                  <th>เปิดเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.code}>
                    <td className="mono">{r.code}</td>
                    <td>{r.isPublic ? 'สาธารณะ' : 'ห้องเพื่อน'}</td>
                    <td>
                      <span className={`badge ${r.phase === 'lobby' ? '' : 'badge--ok'}`}>
                        {r.phase === 'lobby' ? 'รออยู่' : r.phase === 'drawing' ? 'กำลังวาด' : 'ดูผลงาน'}
                      </span>
                    </td>
                    <td className="mono">{r.players}</td>
                    <td className="mono">
                      {r.totalRounds ? `${r.round}/${r.totalRounds}` : '—'}
                    </td>
                    <td className="dim">{new Date(r.createdAt).toLocaleTimeString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats?.prompts?.length > 0 && (
        <div className="panel">
          <div className="panel__title">คำใบ้ที่ถูกใช้บ่อยที่สุด</div>
          <p className="dim" style={{ marginTop: 0, fontSize: '0.82rem' }}>
            ตัวเลขควรใกล้เคียงกันทุกคำ ถ้าคำใดนำห่างชัดเจน แปลว่าถุงสุ่มมีปัญหา
          </p>
          <table className="table">
            <tbody>
              {stats.prompts.map((p) => (
                <tr key={p.prompt}>
                  <td>{p.prompt}</td>
                  <td className="mono" style={{ width: '4rem', textAlign: 'right' }}>
                    {p.uses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
