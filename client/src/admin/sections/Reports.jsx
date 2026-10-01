import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Art from '../Art.jsx';

const STATUS_LABEL = {
  open: 'รอตรวจ',
  actioned: 'ดำเนินการแล้ว',
  dismissed: 'ปิดเรื่อง',
};

const REASON_LABEL = {
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  offensive: 'ก้าวร้าว/สร้างความเกลียดชัง',
  spam: 'สแปม',
  other: 'อื่น ๆ',
};

function ReportCard({ report, onResolve, canBan }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const open = report.status === 'open';

  const act = async (action) => {
    setBusy(true);
    try {
      await onResolve(report.id, { action, note: note || undefined, banDays: 7 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="report">
      <div className="report__art">
        <Art strokes={report.strokes} removed={report.already_removed} />
      </div>

      <div className="report__meta">
        <div className="row">
          <span className={`badge badge--${report.status}`}>{STATUS_LABEL[report.status]}</span>
          <span className="badge">{REASON_LABEL[report.reason] ?? report.reason}</span>
          <span className="dim mono" style={{ fontSize: '0.75rem' }}>
            #{report.id}
          </span>
        </div>

        <div style={{ fontSize: '0.86rem', display: 'grid', gap: '0.15rem' }}>
          <div>
            วาดโดย <b>{report.drawn_by_name ?? 'ไม่ทราบ'}</b>{' '}
            <span className="dim mono" style={{ fontSize: '0.72rem' }}>
              {report.drawn_by}
            </span>
          </div>
          {report.prompt && (
            <div className="dim">คำใบ้ตั้งต้นของสายนี้: {report.prompt}</div>
          )}
          <div className="dim">
            ห้อง <span className="mono">{report.room_code}</span> ·{' '}
            {new Date(report.created_at).toLocaleString('th-TH')}
          </div>
        </div>

        {open ? (
          <>
            <div className="field">
              <label htmlFor={`note-${report.id}`}>บันทึกเหตุผล (จะถูกเก็บถาวรพร้อมชื่อคุณ)</label>
              <input
                id={`note-${report.id}`}
                className="input"
                value={note}
                maxLength={500}
                placeholder="เช่น ภาพชัดเจนว่าไม่เหมาะสม / ภาพปกติ ผู้รายงานเข้าใจผิด"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="report__actions">
              <button className="btn" disabled={busy} onClick={() => act('dismiss')}>
                ไม่มีปัญหา ปิดเรื่อง
              </button>
              <button className="btn btn--danger" disabled={busy} onClick={() => act('remove_drawing')}>
                ลบภาพ
              </button>
              <button
                className="btn btn--danger"
                disabled={busy || !canBan}
                title={canBan ? '' : 'เฉพาะเจ้าของระบบเท่านั้น'}
                onClick={() => act('remove_and_ban')}
              >
                ลบภาพ + แบน 7 วัน
              </button>
            </div>
          </>
        ) : (
          <div className="dim" style={{ fontSize: '0.84rem' }}>
            ตรวจโดย <b>{report.reviewed_by}</b> เมื่อ{' '}
            {report.reviewed_at && new Date(report.reviewed_at).toLocaleString('th-TH')}
            {report.review_note && <div>บันทึก: {report.review_note}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports({ guard, say, role }) {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await guard(() => api.reports(status));
      setReports(data.reports);
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [guard, say, status]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id, payload) => {
    try {
      await guard(() => api.resolveReport(id, payload));
      say('บันทึกการตัดสินเรียบร้อย');
      load();
    } catch (err) {
      say(err.message, 'error');
    }
  };

  return (
    <div className="stack">
      <div className="panel">
        <div className="row">
          <div className="panel__title" style={{ margin: 0 }}>
            คิวรายงาน
          </div>
          <span className="grow" />
          <select
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">รอตรวจ</option>
            <option value="actioned">ดำเนินการแล้ว</option>
            <option value="dismissed">ปิดเรื่อง</option>
            <option value="all">ทั้งหมด</option>
          </select>
          <button className="btn btn--sm" onClick={load}>
            รีเฟรช
          </button>
        </div>
        <p className="dim" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
          ทุกการกดปุ่มในหน้านี้ถูกบันทึกพร้อมชื่อผู้ใช้ของคุณ และการลบภาพย้อนกลับไม่ได้
        </p>
      </div>

      {loading ? (
        <div className="empty">กำลังโหลด</div>
      ) : reports.length === 0 ? (
        <div className="empty">
          {status === 'open' ? 'ไม่มีรายงานค้างอยู่' : 'ไม่มีรายการในหมวดนี้'}
        </div>
      ) : (
        <div className="stack">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onResolve={resolve} canBan={role === 'owner'} />
          ))}
        </div>
      )}
    </div>
  );
}
