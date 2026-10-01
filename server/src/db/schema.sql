-- =============================================================
--  วาดต่อ — โครงสร้างฐานข้อมูล (PostgreSQL 14+)
--  รันด้วย: npm run migrate
-- =============================================================

CREATE TABLE IF NOT EXISTS players (
  player_id   TEXT PRIMARY KEY,
  nickname    TEXT NOT NULL,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- เก็บหนึ่งแถวต่อหนึ่งเกมที่เล่นจบ
CREATE TABLE IF NOT EXISTS games (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_code     TEXT        NOT NULL,
  is_public     BOOLEAN     NOT NULL,
  host_nickname TEXT,
  player_count  INTEGER     NOT NULL,
  total_rounds  INTEGER     NOT NULL,
  settings      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  started_at    TIMESTAMPTZ NOT NULL,
  finished_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS games_finished_idx ON games (finished_at DESC);
CREATE INDEX IF NOT EXISTS games_code_idx     ON games (room_code);

-- หนึ่ง "สาย" ของภาพ เริ่มจากคำใบ้หนึ่งคำ
CREATE TABLE IF NOT EXISTS chains (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id        BIGINT  NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  chain_index    INTEGER NOT NULL,
  prompt         TEXT    NOT NULL,
  owner_nickname TEXT,
  UNIQUE (game_id, chain_index)
);

-- ภาพหนึ่งใบ = หนึ่งขั้นของสาย
-- strokes เก็บเป็น JSONB เพราะเป็น array ของจุดที่เราไม่เคยต้อง query เข้าไปข้างใน
-- แค่ดึงออกมาทั้งก้อนแล้ว render — ถ้าแตกเป็นตารางจุดจะได้หลายล้านแถวโดยไม่ได้อะไรกลับมา
CREATE TABLE IF NOT EXISTS drawings (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chain_id       BIGINT  NOT NULL REFERENCES chains (id) ON DELETE CASCADE,
  step_index     INTEGER NOT NULL,
  round_no       INTEGER NOT NULL,
  -- 'draw' = ขั้นที่เป็นภาพวาด, 'guess' = ขั้นที่เป็นคำตอบของคนทาย
  kind           TEXT    NOT NULL DEFAULT 'draw',
  guess_text     TEXT,
  player_id      TEXT,
  nickname       TEXT,
  strokes        JSONB   NOT NULL DEFAULT '[]'::jsonb,
  challenges     TEXT[]  NOT NULL DEFAULT '{}',
  skipped        BOOLEAN NOT NULL DEFAULT false,
  removed_at     TIMESTAMPTZ,
  removed_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chain_id, step_index)
);
CREATE INDEX IF NOT EXISTS drawings_player_idx ON drawings (player_id);

-- หนึ่งแถวต่อหนึ่งการกดอีโมจิของผู้เล่นหนึ่งคน
-- ทำแบบนี้แทนการเก็บตัวเลขนับ เพราะกดซ้ำต้องถอนโหวตได้ และกันคนกดรัวปั๊มยอด
CREATE TABLE IF NOT EXISTS reactions (
  drawing_id BIGINT NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
  player_id  TEXT   NOT NULL,
  emoji      TEXT   NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (drawing_id, player_id, emoji)
);

CREATE TABLE IF NOT EXISTS reports (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  drawing_id   BIGINT REFERENCES drawings (id) ON DELETE SET NULL,
  room_code    TEXT,
  reported_by  TEXT,
  drawn_by     TEXT,
  reason       TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'open',   -- open | dismissed | actioned
  snapshot     JSONB,                                  -- สำเนาภาพ เผื่อภาพต้นทางถูกลบ
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  TEXT,
  review_note  TEXT
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS admins (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'moderator',  -- moderator | owner
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  failed_logins INTEGER     NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bans (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id  TEXT,
  ip_hash    TEXT,          -- เก็บเป็นค่าแฮช ไม่เก็บ IP ตรง ๆ ตาม PDPA
  reason     TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CHECK (player_id IS NOT NULL OR ip_hash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS bans_player_idx ON bans (player_id);
CREATE INDEX IF NOT EXISTS bans_ip_idx     ON bans (ip_hash);

-- บันทึกทุกการกระทำของแอดมิน — ลบไม่ได้ แก้ไม่ได้ ใช้ตรวจย้อนหลังว่าใครทำอะไร
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     JSONB,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log (at DESC);
