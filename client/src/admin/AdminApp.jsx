import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Dashboard from './sections/Dashboard.jsx';
import Reports from './sections/Reports.jsx';
import Games from './sections/Games.jsx';
import Safety from './sections/Safety.jsx';

const TABS = [
  { id: 'dashboard', label: 'ภาพรวม' },
  { id: 'reports', label: 'คิวรายงาน' },
  { id: 'games', label: 'คลังผลงาน' },
  { id: 'safety', label: 'แบนและบันทึก' },
];

function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { profile } = await api.login(username, password);
      onSuccess(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login">
        <div>
          <h1>วาดต่อ · หลังบ้าน</h1>
          <p className="dim" style={{ margin: '0.35rem 0 0' }}>
            เฉพาะผู้ดูแลระบบ
          </p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="field">
          <label htmlFor="u">ชื่อผู้ใช้</label>
          <input
            id="u"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <div className="field">
          <label htmlFor="p">รหัสผ่าน</label>
          <input
            id="p"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="btn btn--primary" disabled={busy || !username || !password} onClick={submit}>
          {busy ? 'กำลังตรวจสอบ' : 'เข้าสู่ระบบ'}
        </button>

        <p className="dim" style={{ fontSize: '0.78rem', margin: 0 }}>
          ยังไม่มีบัญชี? สร้างที่เครื่องเซิร์ฟเวอร์ด้วยคำสั่ง <code className="mono">npm run create-admin</code>
        </p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [flash, setFlash] = useState(null);

  // เช็กว่าคุกกี้เดิมยังใช้ได้ไหม จะได้ไม่ต้องล็อกอินใหม่ทุกครั้งที่รีเฟรช
  useEffect(() => {
    api
      .me()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecking(false));
  }, []);

  const say = useCallback((message, tone = 'ok') => {
    setFlash({ message, tone });
    setTimeout(() => setFlash(null), 4000);
  }, []);

  /** ถ้าเซสชันหมดอายุกลางทาง ให้เด้งกลับหน้าล็อกอินแทนที่จะโชว์ error งง ๆ */
  const guard = useCallback(async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 401) setProfile(null);
      throw err;
    }
  }, []);

  if (checking) {
    return (
      <div className="login-wrap">
        <p className="dim">กำลังตรวจสอบเซสชัน</p>
      </div>
    );
  }

  if (!profile) return <Login onSuccess={setProfile} />;

  const sections = {
    dashboard: <Dashboard guard={guard} say={say} />,
    reports: <Reports guard={guard} say={say} role={profile.role} />,
    games: <Games guard={guard} say={say} />,
    safety: <Safety guard={guard} say={say} role={profile.role} />,
  };

  return (
    <div className="admin">
      <header className="topbar">
        <div className="topbar__brand">
          วาดต่อ<small>หลังบ้าน</small>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="grow" />
        <span className="dim mono" style={{ fontSize: '0.78rem' }}>
          {profile.username} · {profile.role === 'owner' ? 'เจ้าของระบบ' : 'ผู้ดูแล'}
        </span>
        <button
          className="btn btn--sm"
          onClick={() => api.logout().finally(() => setProfile(null))}
        >
          ออกจากระบบ
        </button>
      </header>

      <main className="content stack">
        {flash && <div className={`alert alert--${flash.tone}`}>{flash.message}</div>}
        {profile.dbEnabled === false && (
          <div className="alert alert--error">
            ยังไม่ได้ต่อฐานข้อมูล — ตั้งค่า DATABASE_URL แล้วรัน npm run migrate ก่อน
            ตอนนี้หน้าที่ต้องใช้ข้อมูลเก็บถาวรจะยังใช้ไม่ได้
          </div>
        )}
        {sections[tab]}
      </main>
    </div>
  );
}
