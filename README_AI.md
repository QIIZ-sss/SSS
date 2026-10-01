# ติดตั้ง AI ทายภาพวาด (Solo with AI) ด้วยโมเดลสำเร็จรูป DoodleNet

## 1. ดาวน์โหลดโมเดล (3 ไฟล์ ประมาณ 2 MB)
เปิด PowerShell ที่โฟลเดอร์ `Justdrawit-main` แล้วรันทีละบรรทัด

```
Remove-Item -Recurse -Force server\src\ai_model -ErrorAction SilentlyContinue
New-Item -ItemType Directory server\src\ai_model | Out-Null
$base = "https://raw.githubusercontent.com/yining1023/doodleNet/master/demo/DoodleClassifier_345/model"
Invoke-WebRequest "$base/model.json" -OutFile server\src\ai_model\model.json
Invoke-WebRequest "$base/group1-shard1of1.bin" -OutFile server\src\ai_model\group1-shard1of1.bin
Invoke-WebRequest "$base/class_names.txt" -OutFile server\src\ai_model\class_names.txt
```

บรรทัดแรกจะลบโมเดลปลอมที่ agy สร้างไว้ออกก่อน ต้องใช้โมเดลจากโฟลเดอร์ `demo/DoodleClassifier_345/model`
เท่านั้น เพราะในโปรเจกต์ DoodleNet มีโมเดลอีกชุดที่ชื่อเหมือนกันแต่ทดสอบแล้วแม่นน้อยกว่า

## 2. ติดตั้ง TensorFlow.js ฝั่ง server
```
cd server
npm install @tensorflow/tfjs
```

## 3. วางไฟล์ทับ
| ไฟล์ใหม่ | วางที่ |
|---|---|
| `client/src/utils/canvasToPixels.js` | ทับไฟล์เดิม |
| `client/src/gameModes/SoloAIGame.jsx` | ทับไฟล์เดิม |
| `server/src/utils/aiPredictor.js` | ทับไฟล์เดิม |
| `server/src/socket/gameHandler_SOLO_AI_PATCH.js` | **ไม่ต้องวางเป็นไฟล์** ก๊อปโค้ดข้างในไปแทนบล็อก `SOLO_AI_PREDICT` ใน `gameHandler.js` |

## 4. ทดสอบ
1. รัน server ต้องเห็น `[AI] โหลด DoodleNet สำเร็จ: 345 หมวด, ใช้ในเกม 19 คำ`
   (มีคำเตือนเรื่อง tfjs-node และ `input tensor ... conv2d_1` ไม่ต้องสนใจ ไม่มีผลกับการทาย)
2. เข้าโหมด Solo vs AI แล้ววาด ช่อง Current guess จะเปลี่ยนทุก 1 วินาที
3. F12 > Network > Socket > Messages จะเห็น `solo_ai_predict` ↑ และ `solo_ai_prediction_result` ↓

## วิธีที่ AI ตัดสิน
- โมเดลให้ความน่าจะเป็นครบ 345 หมวด ระบบเลือกเฉพาะ 19 คำที่มีในเกมมาจัดอันดับ
- นับว่าทายถูกเมื่อคำเป้าหมายเป็นอันดับ 1 ในกลุ่มคำของเกม (ส่วนแบ่ง ≥ 50%)
  **และ** โมเดลให้ความน่าจะเป็นดิบของคำนั้น ≥ 10% จากทั้ง 345 หมวด กันวาดมั่วแล้วบังเอิญถูก
- หน้าจอแสดงบรรทัด "Out of 345 doodle types…" บอกว่าโมเดลเห็นภาพเป็นอะไรจริง ๆ
- ปรับความยากได้ที่ `MIN_GAME_SHARE` และ `MIN_RAW_PROB` ใน `aiPredictor.js`
- แปรงเส้นบาง (ประมาณ 4–8 px) จะทายแม่นกว่าแปรงหนามาก

## ผลทดสอบเบื้องต้น (รูปวาดจำลอง ไม่ใช่ผลจากเกมจริง)
| วาด | แปรงบาง สีดำ | แปรงหนา สีแดง |
|---|---|---|
| ดวงอาทิตย์ | Sun ✔ (โมเดลเห็น sun 100%) | Sun ✔ |
| บ้าน | House ✔ (house 91%) | House ✔ |
| รุ้ง | Rainbow ✔ (rainbow 89%) | Rainbow ✔ |
| นาฬิกา | Clock ✔ (clock 99%) | Clock ✔ |
| วงกลมเปล่า (เป้าหมาย Clock) | ไม่นับ ✔ (โมเดลเห็นเป็น circle) | ไม่นับ ✔ |
| ขีดมั่ว (เป้าหมาย Dragon) | ไม่นับ ✔ | — |

ทีมควรทดสอบในเกมจริงทุกคำอีกรอบ แล้วเก็บผลไว้เป็นหลักฐาน

## สิ่งที่ต้องอ้างอิงในงาน (เกณฑ์ข้อ 5a)
- **โมเดล:** DoodleNet โดย Yining Shi — https://github.com/yining1023/doodleNet
  (ต่อยอดจาก Sketcher notebook ของ Zaid Alyafeai) CNN เทรนจาก Quick, Draw! ทั้ง 345 หมวด หมวดละ 50,000 ภาพ
  repo นี้ไม่ได้ระบุ license ไว้ ต้องให้เครดิตชัดเจนว่าเป็นโมเดลของคนอื่น
- **Dataset:** Google Quick, Draw! — https://quickdraw.withgoogle.com/data (CC BY 4.0)
- **ส่วนที่ทีมทำเอง:** ส่งภาพผ่าน WebSocket แบบเรียลไทม์, แปลงภาพบน canvas ให้ตรงรูปแบบที่โมเดลต้องการ,
  จำกัดคำตอบให้อยู่ในคำของเกม, เกณฑ์ตัดสินกันวาดมั่ว, ตรวจข้อมูลและจำกัดความถี่ฝั่ง server
- **AI ที่ช่วยเขียนโค้ด:** ระบุชื่อ model ที่ใช้จริง (เช่น Claude Opus 5.5) พร้อมแนบตัวอย่าง prompt
