import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

function NewAdminForm({ guard, say, onDone }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'moderator' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await guard(() => api.createAdmin(form));
      say(`สร้างบัญชี ${form.username} เรียบร้อย`);
      setForm({ username: '', password: '', role: 'moderator' });
      onDone();
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="nu">ชื่อผู้ใช้</label>
        <input
          id="nu"
          className="input"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="np">รหัสผ่าน — อย่างน้อย 12 ตัว มีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข</label>
        <input
          id="np"
          className="input"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="nr">บทบาท</label>
        <select id="nr" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="moderator">ผู้ดูแล — ตรวจรายงานและลบภาพได้</option>
          <option value="owner">เจ้าของระบบ — แบนผู้เล่นและสร้างบัญชีได้ด้วย</option>
        </select>
      </div>
      <button className="btn btn--primary" disabled={busy} onClick={submit}>
        สร้างบัญชี
      </button>
    </div>
  );
}

export default function Safety({ guard, say, role }) {
  const [bans, setBans] = useState([]);
  const [entries, setEntries] = useState([]);
  const [admins, setAdmins] = useState([]);
  const isOwner = role === 'owner';

  const load = useCallback(async () => {
    try {
      const [b, a] = await Promise.all([guard(api.bans), guard(api.audit)]);
      setBans(b.bans);
      setEntries(a.entries);
      if (isOwner) {
        const list = await guard(api.admins);
        setAdmins(list.admins);
      }
    } catch (err) {
      say(err.message, 'error');
    }
  }, [guard, say, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const lift = async (id) => {
    if (!window.confirm('ยกเลิกการแบนรายการนี้?')) return;
    try {
      await guard(() => api.liftBan(id));
      say('ยกเลิกการแบนแล้ว');
      load();
    } catch (err) {
      say(err.message, 'error');
    }
  };

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel__title">แบนที่ยังมีผล</div>
        {bans.length === 0 ? (
          <div className="empty">ไม่มีรายการแบน</div>
        ) : (
          <div className="table--scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>ผู้เล่น</th>
                  <th>เหตุผล</th>
                  <th>โดย</th>
                  <th>เริ่ม</th>
                  <th>หมดอายุ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontSize: '0.76rem' }}>
                      {b.player_id ?? 'แบนตามที่อยู่เครือข่าย'}
                    </td>
                    <td>{b.reason}</td>
                    <td>{b.created_by}</td>
                    <td className="dim">{new Date(b.created_at).toLocaleDateString('th-TH')}</td>
                    <td className="dim">
                      {b.expires_at ? new Date(b.expires_at).toLocaleDateString('th-TH') : 'ถาวร'}
                    </td>
                    <td>
                      <button className="btn btn--sm" disabled={!isOwner} onClick={() => lift(b.id)}>
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="panel">
          <div className="panel__title">บัญชีผู้ดูแล</div>
          <div className="table--scroll" style={{ marginBottom: '1rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ชื่อผู้ใช้</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>เข้าล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td>{a.username}</td>
                    <td>{a.role === 'owner' ? 'เจ้าของระบบ' : 'ผู้ดูแล'}</td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge--ok' : ''}`}>
                        {a.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="dim">
                      {a.last_login_at ? new Date(a.last_login_at).toLocaleString('th-TH') : 'ยังไม่เคย'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <NewAdminForm guard={guard} say={say} onDone={load} />
        </div>
      )}

      <div className="panel">
        <div className="panel__title">บันทึกการกระทำของผู้ดูแล</div>
        <p className="dim" style={{ marginTop: 0, fontSize: '0.82rem' }}>
          บันทึกนี้เขียนอย่างเดียว ไม่มีคำสั่งลบหรือแก้ไขในระบบ
        </p>
        {entries.length === 0 ? (
          <div className="empty">ยังไม่มีบันทึก</div>
        ) : (
          <div className="table--scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ผู้ใช้</th>
                  <th>การกระทำ</th>
                  <th>เป้าหมาย</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="dim">{new Date(e.at).toLocaleString('th-TH')}</td>
                    <td>{e.admin_user}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>
                      {e.action}
                    </td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>
                      {e.target ?? '—'}
                    </td>
                    <td className="dim" style={{ fontSize: '0.78rem' }}>
                      {e.detail?.note ?? JSON.stringify(e.detail ?? {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
