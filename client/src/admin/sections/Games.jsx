import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Art from '../Art.jsx';

function GameDetail({ gameId, guard, say, onBack }) {
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      setDetail(await guard(() => api.game(gameId)));
    } catch (err) {
      say(err.message, 'error');
    }
  }, [gameId, guard, say]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (drawingId) => {
    const note = window.prompt('เหตุผลที่ลบภาพนี้ (จะถูกบันทึกถาวร)');
    if (note === null) return;
    try {
      await guard(() => api.removeDrawing(drawingId, note));
      say('ลบภาพเรียบร้อย');
      load();
    } catch (err) {
      say(err.message, 'error');
    }
  };

  if (!detail) return <div className="empty">กำลังโหลด</div>;

  return (
    <div className="stack">
      <div className="panel">
        <div className="row">
          <button className="btn btn--sm" onClick={onBack}>
            กลับไปรายการ
          </button>
          <span className="grow" />
          <span className="dim mono" style={{ fontSize: '0.78rem' }}>
            ห้อง {detail.game.room_code} · {detail.game.player_count} คน ·{' '}
            {new Date(detail.game.finished_at).toLocaleString('th-TH')}
          </span>
        </div>
      </div>

      {detail.chains.map((chain) => (
        <div className="panel" key={chain.index}>
          <div className="panel__title">
            สายที่ {chain.index + 1} · เริ่มโดย {chain.ownerName ?? 'ไม่ทราบ'}
          </div>
          <p style={{ marginTop: 0, fontSize: '0.95rem' }}>
            คำใบ้ตั้งต้น: <b>{chain.prompt}</b>
          </p>

          <div className="chain-grid">
            {chain.steps.map((step) => (
              <div className="chain-cell" key={step.drawingId}>
                {step.kind === 'guess' ? (
                  <div className="chain-cell__guess">“{step.text}”</div>
                ) : (
                  <Art strokes={step.strokes} removed={step.removed} />
                )}
                <div className="chain-cell__foot">
                  <div>
                    <span className="dim">ขั้น {step.index + 1} · </span>
                    {step.byName ?? 'ไม่ทราบ'}
                  </div>
                  {step.challenges?.length > 0 && (
                    <div className="dim mono" style={{ fontSize: '0.68rem' }}>
                      {step.challenges.join(' · ')}
                    </div>
                  )}
                  {step.kind === 'draw' && !step.removed && (
                    <button className="btn btn--sm" onClick={() => remove(step.drawingId)}>
                      ลบภาพนี้
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Games({ guard, say }) {
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await guard(() => api.games());
      setGames(data.games);
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [guard, say]);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return <GameDetail gameId={selected} guard={guard} say={say} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <div className="panel__title" style={{ margin: 0 }}>
          เกมที่เล่นจบแล้ว
        </div>
        <span className="grow" />
        <button className="btn btn--sm" onClick={load}>
          รีเฟรช
        </button>
      </div>

      {loading ? (
        <div className="empty">กำลังโหลด</div>
      ) : games.length === 0 ? (
        <div className="empty">ยังไม่มีเกมที่เล่นจบ</div>
      ) : (
        <div className="table--scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>ประเภท</th>
                <th>เจ้าของห้อง</th>
                <th>คน</th>
                <th>รอบ</th>
                <th>สาย</th>
                <th>จบเมื่อ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td className="mono">{g.room_code}</td>
                  <td>{g.is_public ? 'สาธารณะ' : 'ห้องเพื่อน'}</td>
                  <td>{g.host_nickname ?? '—'}</td>
                  <td className="mono">{g.player_count}</td>
                  <td className="mono">{g.total_rounds}</td>
                  <td className="mono">{g.chain_count}</td>
                  <td className="dim">{new Date(g.finished_at).toLocaleString('th-TH')}</td>
                  <td>
                    <button className="btn btn--sm" onClick={() => setSelected(g.id)}>
                      เปิดดู
                    </button>
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
