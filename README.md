# JUST DRAW IT

เกมวาดรูปทายคำแบบเรียลไทม์บนเว็บ — ผลัดกันวาด คนอื่นพิมพ์ทายในแชท ใครทายถูกเร็วได้คะแนนมาก
เล่นได้หลายห้องพร้อมกัน มีโหมดแข่งเดี่ยว โหมดทีม และโหมดเล่นคนเดียวกับ AI ที่ทายภาพด้วยโมเดล DoodleNet

> README นี้อธิบายโค้ดที่ **รันจริง** ในปัจจุบัน
> README ฉบับเก่า (อธิบายเกม "วาดต่อ" และโค้ดชุด legacy) ย้ายไปที่ [`docs/legacy-README.md`](docs/legacy-README.md)

---

## โหมดเกม

| โหมด | วิธีเล่น |
|---|---|
| **Multiplayer (FFA)** | อย่างน้อย 2 คน ผลัดกันวาดคนละตาต่อรอบ ที่เหลือพิมพ์ทาย คะแนนเป็นของแต่ละคน |
| **Team** | ทีม Red กับ Blue (ทีมละอย่างน้อย 1 คน) คะแนนของสมาชิกรวมเป็นคะแนนทีม |
| **Solo vs AI** | เล่นคนเดียว server เลือกคำให้ วาดแล้ว AI (DoodleNet) ทายทุก 1 วินาที ถ้า AI ทายถูกได้ 500 คะแนน — ไม่นับเข้า leaderboard รวม |

## สิ่งที่เกมทำได้ตอนนี้

- **ห้อง:** สร้างห้องได้หลายห้อง รหัสห้อง 5 หลัก (ช่องกรอก PIN พิมพ์ต่อเนื่อง / วางทีเดียวได้) และรายการห้องสาธารณะ (มีห้องตั้งต้น `83921` เสมอ)
- **Lobby:** ทุกคนนอกจาก host ต้องกด Ready และผู้เล่นต้องครบขั้นต่ำก่อน host จะเริ่มได้ (server ตรวจซ้ำ ไม่เชื่อปุ่มฝั่ง client)
  ตั้งค่าได้: เวลาต่อตา (30–120 วิ), จำนวนรอบ (3/5/7/10), จำนวนผู้เล่นสูงสุด, ชาเลนจ์ที่เปิดใช้, ระดับคำ (Mixed / Easy / Medium / Hard)
- **รอบการเล่น:** คนวาดเลือก 1 ใน 3 คำ (ไม่เลือกใน 10 วิ ระบบเลือกให้) → วาดภายในเวลา → เฉลยคำให้ทุกคน → ตาถัดไป
  จบรอบสุดท้ายแสดงผลการแข่ง แล้ว server พาห้องกลับ Lobby เองใน 10 วินาที (คะแนนและสถานะ Ready รีเซ็ตตอนกลับ Lobby)
- **คะแนน:** คนทายได้ 100–500 ตามลำดับและเวลาที่ทายถูก, คนวาดได้ 300 × (จำนวนคนที่ทายถูก / จำนวนคนทาย)
- **ซ่อนคำตอบระดับ network:** server ส่งคำตอบให้คนวาดเท่านั้นระหว่างเลือกคำและวาด คนทายได้แค่ความยาวคำ ได้คำตอบตอนเฉลย
  คนทายถูกจะประกาศแค่ "ทายถูกแล้ว" ไม่ส่งคำตอบในแชท และคนวาดพิมพ์แชทไม่ได้ระหว่างตา
- **มินิชาเลนจ์ (สุ่มต่อตา):** Colour Fix (สีเดียว), Don't Lift Pen (ห้ามยกปากกา), Geometric Shapes Only (วาดได้แค่รูปทรง มีเส้นร่างพร้อมขนาด)
  ต้นตาแสดงป็อปอัปบอกกติกา (ปิดเองใน 3 วิ หรือกด GOT IT)
- **เครื่องมือวาด:** ปากกา, ยางลบเฉพาะจุด, ถังสี (ระบายพื้นหลัง), วงกลม / สี่เหลี่ยม / สามเหลี่ยม / เส้นตรง, ล้างกระดาน, ขนาดแปรง 1–50 px
  ภาพซิงก์แบบเรียลไทม์ และคนที่เข้ากลางเกมจะได้ภาพที่วาดไปแล้ว
- **มือถือ / ไอแพด:** ใช้ Pointer Events วาดด้วยนิ้วโดยหน้าไม่เลื่อน และ layout ไม่ล้นจอที่ 375 px (ตรวจด้วย headless Chrome — ยังไม่ได้ทดสอบบนเครื่องจริง ดู [ข้อจำกัด](#ข้อจำกัดที่รู้อยู่))
- **รีเฟรช / เน็ตหลุด:** กลับเข้าห้องเดิมได้อัตโนมัติภายใน 30 วินาที (คะแนนเดิม)
- **Leaderboard:** คะแนนรวมจากเกม Multiplayer และ Team เก็บในหน่วยความจำ (เริ่มต้นมีชื่อตัวอย่าง 5 ชื่อที่ seed ไว้ใน `server/src/config/database.js`)

สิ่งที่ **ไม่มี** ในเกมที่รันจริง: ฐานข้อมูล (ข้อมูลหายเมื่อปิด server), ระบบบัญชีผู้ใช้ / รหัสผ่าน, หน้าหลังบ้าน (`client/admin.html` เป็นของโค้ดชุดเก่า ใช้กับ server ปัจจุบันไม่ได้)

---

## ติดตั้งและรัน

ต้องมี **Node.js 22.12+ หรือ 20.19+** (ทดสอบบน Node.js 24.18) เพราะ server `require()` ไฟล์ใน `shared/` ที่เขียนแบบ ES module

```bash
# ติดตั้งครั้งแรก
(cd server && npm ci)
(cd client && npm ci)

# หน้าต่างที่ 1: server (พอร์ต 4000)
cd server
npm run dev

# หน้าต่างที่ 2: หน้าเว็บ (พอร์ต 5173)
cd client
npm run dev              # เปิดได้เฉพาะเครื่องนี้: http://localhost:5173
npm run dev -- --host    # ให้มือถือ/ไอแพดในวง Wi-Fi เดียวกันเข้า http://<IP ของเครื่อง>:5173
```

- server ต้องแสดง `JUST DRAW IT Server listening on port 4000` และ `[AI] โหลด DoodleNet สำเร็จ: 345 หมวด, ใช้ในเกม 19 คำ`
  (มีคำเตือนเรื่อง tfjs-node และ `conv2d_1` — ไม่มีผลกับการทาย)
- เปลี่ยนพอร์ต server ได้ด้วย `PORT=4001 npm run dev` ถ้าพอร์ตถูกใช้อยู่ server จะแจ้งข้อความแล้วออก
- เปิดผ่าน `localhost` → หน้าเว็บต่อ server ที่ `localhost:4000` ตรง ๆ; เปิดผ่าน IP (อุปกรณ์อื่น) → ต่อผ่าน proxy ของ Vite (`/socket.io`, `/api` → `127.0.0.1:4000` ใน `client/vite.config.js`) — ดู `client/src/services/socket.js`
- ทดสอบหลายคนบนเครื่องเดียว: เปิดหน้าต่างไม่ระบุตัวตนเพิ่ม (แต่ละแท็บมี session ของตัวเอง)
- server ปัจจุบันไม่อ่านไฟล์ `.env` และไม่ต้องใช้ PostgreSQL / Docker (`server/.env.example` และ `docker-compose.yml` เป็นของโค้ดชุดเก่า)

## รัน regression tests

```bash
tests/check_all.sh
```

ใช้เวลาประมาณ 12–13 นาที ไม่ต้องติดตั้งอะไรเพิ่ม (ใช้ของใน `server/node_modules` และ `client/node_modules`)
ชุดทดสอบจะเปิด server ของตัวเองที่พอร์ต **4100** จึงไม่ชนกับ server ที่รันอยู่บน 4000

- browser tests ต้องมี Google Chrome (ตั้ง `CHROME_PATH` ได้) — ถ้าไม่มีจะขึ้น SKIP ไม่ใช่ FAIL
- layout test ต้องต่อเน็ตเพื่อโหลด Tailwind CDN — ถ้าไม่มีจะขึ้น SKIP
- รายละเอียด ตัวแปร และวิธีรันทีละไฟล์: [`tests/README.md`](tests/README.md)
- `tests/negative-control/` รันเทสต์ปัจจุบันกับ commit เก่าเพื่อพิสูจน์ว่าเทสต์จับบั๊กได้ (คาดว่าจะ fail — ไม่อยู่ใน `check_all.sh`)

ผลรันล่าสุดบันทึกไว้ใน [`TASKS.md`](TASKS.md) หัวข้อ "Regression suite"
ชุดทดสอบอัตโนมัติ **ไม่แทน** การทดสอบด้วยมือบนอุปกรณ์จริง

---

## โครงสร้างโค้ด (ส่วนที่รันจริง)

```
server/src/
  server.js                    จุดเริ่ม: Express + Socket.io (พอร์ต 4000)
  gameLogic/RoomManager.js     ทะเบียนห้อง, รหัส 5 หลัก, room_data แยกตามบทบาท (ซ่อนคำตอบ)
  gameLogic/RoundManager.js    state machine: LOBBY → WORD_SELECTION → PLAYING → ROUND_OVER → … → GAME_OVER → LOBBY
  gameLogic/TimerManager.js    นับเวลาฝั่ง server + ตั้งเวลาเปลี่ยนสถานะ (ยกเลิกได้)
  socket/gameHandler.js        สร้าง/เข้า/ออกห้อง, ready, ตั้งค่า, เริ่มเกม, reconnect, Solo AI
  socket/chatHandler.js        แชทและตรวจคำทาย, คะแนนคนทาย
  socket/drawHandler.js        ส่งต่อเส้นวาด + ประวัติภาพ
  utils/aiPredictor.js         โหลด DoodleNet (@tensorflow/tfjs) และทาย
  ai_model/                    ไฟล์โมเดล DoodleNet
  config/database.js           คลังคำ + leaderboard ในหน่วยความจำ
client/src/
  App.jsx                      หน้าหลัก, login, สร้าง/เข้าห้อง, reconnect, modal ผลการแข่ง
  gameModes/                   MultiplayerGame, TeamGame, SoloAIGame
  components/                  Canvas, ChatBox, RoomLobby, RoomList, Leaderboard, ChallengeOverlay, TimerBadge
shared/
  contract.js                  ค่ากลางและรูปแบบ payload ที่ client/server ใช้ร่วมกัน (สถานะ, กติกา, Solo AI, ระดับคำ)
  events.js                    ชื่อ socket events
  gameConfig.js, utils.js      โหมด, ชาเลนจ์, avatar, สีพาเล็ต, สูตรคะแนน
tests/                         regression suite (ดู tests/README.md)
```

ใน repo ยังมีโค้ดชุดเก่า (legacy) ที่ไม่ได้ถูกรัน เช่น `server/src/index.js`, `server/src/net|game|http|db|auth`, `client/src/screens`, `client/src/admin`
ห้ามแก้ไฟล์เหล่านี้โดยไม่ได้ตั้งใจ — รายการเต็มอยู่ใน [`ARCHITECTURE.md`](ARCHITECTURE.md) §2.3

## ข้อมูลสำหรับนักพัฒนา

- อ่านก่อนแก้โค้ด: [`AGENTS.md`](AGENTS.md) (กฎการทำงาน), [`ARCHITECTURE.md`](ARCHITECTURE.md) (โครงสร้างปัจจุบัน + เป้าหมาย), [`TASKS.md`](TASKS.md) (สถานะงานและหลักฐาน)
- server เป็นผู้ตัดสินทุกกติกา (ready, จำนวนผู้เล่น, ใครวาด, คะแนน, การเปลี่ยนรอบ) — การปิดปุ่มฝั่ง client เป็นแค่ UX
- ค่ากลางอยู่ใน `shared/contract.js` ห้าม hardcode ซ้ำ และการเปลี่ยนชื่อ event หรือ payload ต้องขออนุมัติก่อน (ดู `AGENTS.md`)
- งานที่เปลี่ยนพฤติกรรมควรเพิ่ม/แก้เทสต์ใน `tests/` และให้ `tests/check_all.sh` ผ่าน
- งานพัฒนาอยู่บน branch `dev`; `main` เก็บ baseline + เอกสารควบคุม

---

## ข้อจำกัดที่รู้อยู่

จาก [`TASKS.md`](TASKS.md) (รายละเอียดและหลักฐานอยู่ที่นั่น):

- ตัวตนผู้เล่นผูกกับชื่อ — เข้าห้องด้วยชื่อซ้ำจะได้ช่องของผู้เล่นเดิม (U1)
- ยังไม่มี rate limit / การตรวจ payload ของ event ทั่วไป (มีเฉพาะ Solo AI) (U4)
- กติกา Don't Lift Pen และ Geometric Shapes บังคับเฉพาะฝั่ง client (U5)
- กดโลโก้ด้านบนตอนอยู่ในห้อง ออกจากห้องเฉพาะฝั่ง client — server ยังนับว่าอยู่ (U8)
- ไม่มีปุ่มสลับทีม — ถ้าทีมหนึ่งว่างใน Lobby ต้องรอคนเข้าใหม่ (U9)
- `create_room` ไม่จำกัดค่าตั้งค่าเหมือนหน้า Settings (U10)
- ผู้เล่นที่หลุดยังนับเป็นคนทาย/คนวาดจนครบ 30 วินาที; คนเข้ากลางเกมทำให้รอบนั้นยาวขึ้น
- Solo vs AI: ไม่มีปุ่ม Skip (เอาออกเพราะเดิม client สุ่มคำเอง); ป็อปอัปชาเลนจ์ใช้เวลาวาดได้สูงสุด 3 วินาทีในโหมดนี้
- ถังสีระบายพื้นหลังด้านหลังเส้น ไม่ทับเส้นที่วาดแล้ว
- ข้อมูลทั้งหมดอยู่ในหน่วยความจำ ปิด server แล้วหาย
- `README_AI.md` และ `HANDOFF.md` บางส่วนอธิบายสถานะก่อนแก้ (เช่นตำแหน่งค่าเกณฑ์ของ AI ซึ่งตอนนี้อยู่ใน `shared/contract.js`)
- การ map BUG-03 กับ A8/A9 ยัง **รอคนยืนยัน**

**การทดสอบด้วยมือ** (บันทึกใน `TASKS.md`): ข้อ 1–4 (จบเกม → Lobby, ปุ่ม START, ตรวจ `currentWord` ใน DevTools, รีเฟรชกลางเกม) ทดสอบแล้วบน Chrome desktop 2 แท็บ ไม่มีรายงานปัญหา
**ยังไม่ได้ทดสอบ:** วาดด้วยนิ้วบนมือถือ/ไอแพดจริง, ช่อง PIN บนมือถือจริง, เล่นผ่าน LAN มากกว่า 3 เครื่อง, Safari / iPad, ระดับคำ (D1) และป็อปอัปชาเลนจ์ (D3) ในเบราว์เซอร์จริง, วาด Sun / House / Clock / Rainbow ด้วยมือในโหมด Solo vs AI

---

## เครดิต

- **โมเดล AI:** DoodleNet โดย Yining Shi — https://github.com/yining1023/doodleNet (repo ไม่ได้ระบุ license — ให้เครดิตว่าเป็นโมเดลของผู้อื่น)
- **Dataset ที่ใช้เทรนโมเดล:** Google Quick, Draw! — https://quickdraw.withgoogle.com/data (CC BY 4.0)
- รายละเอียดการติดตั้งโมเดลเดิม: [`README_AI.md`](README_AI.md)
