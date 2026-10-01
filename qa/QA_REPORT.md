# 📋 QA Test Report (ฉบับปรับปรุง): JUST DRAW IT

## ส่วนที่ 1: สรุปผลการทดสอบ (Executive Summary)

- **วันที่ทดสอบล่าสุด:** 1 ตุลาคม 2026 (2026-10-01)
- **Git Commit / Branch:** `main` (Local Workspace)
- **ระบบปฏิบัติการ (OS):** Windows 11
- **เบราว์เซอร์ที่ใช้ทดสอบ:** Chromium (Playwright Headless v1243 / Chrome for Testing 153.0)
- **Environment:** Node.js v24.18.0, npm 11.16.0, Vite 5.4.21, Socket.io 4.7.5

### สรุปยอดรวมผลการทดสอบ (รวมทั้งสิ้น 90 เคสพอดี)
- 🟢 **PASS:** **76 เคส**
- 🔴 **FAIL:** **7 เคส**
- 🟡 **MANUAL:** **1 เคส** (เคส D-07: ทดสอบ Touch บนอุปกรณ์มือถือจริง)
- ⚪ **N/A:** **6 เคส** (เคส E-01 ถึง E-06: ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง)
- 🔢 **รวมทั้งหมด:** **76 + 7 + 1 + 6 = 90 เคส (สอดคล้องกับตาราง 100%)**

---

### 🚨 รายการบั๊ก Critical และ High ทั้งหมด (7 รายการ)

1. **🔴 [Critical] BUG-01 (SEC-01): คำตอบลับรั่วไหลใน WebSocket Frame ของคนทายตลอดรอบ**
   - เซิร์ฟเวอร์ส่ง Frame `ROOM_DATA` ที่มีฟิลด์ `currentWord: "..."` แบบ Plaintext ให้กับผู้เล่นทุกคนในห้อง (รวมถึงคนทาย) ตลอดช่วงเวลาที่เริ่มวาด ทำให้คนทายสามารถเปิด DevTools ดูคำตอบลับได้ทันทีโดยไม่ต้องเดา
2. **🔴 [Critical] BUG-02 (F-02): กด "BACK TO LOBBY" ใน Match Results แล้วค้างที่หน้า Arena แสดง "ROUND 4 / 3"**
   - เมื่อจบเกมและแสดง Match Results Modal การกดปุ่ม "BACK TO LOBBY" เพียงแค่ปิด Modal ทิ้ง (`setGameOverModal(null)`) แต่ไม่มีการส่ง Event ไปแจ้งเซิร์ฟเวอร์ และไม่เปลี่ยนสถานะห้องกลับเป็น `LOBBY` ทำให้ผู้เล่นติดค้างอยู่ที่หน้าจอ Arena เดิม พร้อมตัวเลขรอบที่บวกเกินจริง (`ROUND 4 / 3`)
3. **🟠 [High] BUG-03 (G-04): คนวาดพิมพ์คำตอบในแชทแล้วไม่ถูกบล็อก**
   - เมื่อคนวาดพิมพ์คำตอบลับในช่องแชท เซิร์ฟเวอร์และไคลเอนต์ไม่มีการตรวจสอบหรือดักจับ ทำให้ข้อความคำตอบถูกบรอดแคสต์เฉลยให้ผู้เล่นทุกคนในห้องเห็นทันที
4. **🟠 [High] BUG-04 (H-03): สามารถกดเริ่มเกมได้แม้มีผู้เล่นคนเดียวในโหมด FFA/Team**
   - Host สามารถกด "START GAME" ได้แม้ในห้องจะมีผู้เล่นเพียง 1 คน โดยไม่มีการแจ้งเตือนหรือบล็อก ทำให้เกมเริ่มรอบวาดโดยไม่มีคนทาย (0 Guessers) และคะแนนคนวาดจะกลายเป็น 0 เสมอ
5. **🟡 [Medium] BUG-05 (R-01): คำสั่งติดตั้งใน Root README.md ไม่ตรงกับ `server/package.json`**
   - คำสั่ง `npm run migrate` และ `npm run create-admin` ที่ระบุใน Root `README.md` ไม่มีใน `server/package.json`
6. **🔵 [Low] BUG-06 (R-03): รันเซิร์ฟเวอร์ตอนพอร์ต 4000 ถูกใช้งานอยู่เกิด Unhandled Crash**
   - เซิร์ฟเวอร์พ่น Unhandled `EADDRINUSE` stack trace แทนที่จะแจ้งเตือนผู้ใช้ด้วยข้อความที่เข้าใจง่าย
7. **🔵 [Low] BUG-07 (L-02): ตัวเลือก Avatar ในหน้า Login และ Lobby แสดงไม่ครบ (หายไป 2 ตัว)**
   - ใน `client/src/App.jsx` มีการเรียก `AVATARS.slice(0, 6)` ทำให้ตัด Avatar สองตัวหลัง (`👾` และ `🚀`) ออกจากหน้าจอเลือกตัวละคร

---

## ส่วนที่ 2: ตารางผลการทดสอบทุกเคส (90 เคส)

### 1. ติดตั้งและรันระบบ (Setup & Run: 4 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| R-01 | 🔴 FAIL | คำสั่งใน `README.md` (`npm run migrate`, `npm run create-admin`) ไม่มีใน `server/package.json` รันแล้ว Missing script | `qa/evidence/R-01.txt` |
| R-02 | 🟢 PASS | รันเซิร์ฟเวอร์โดยไม่มี PostgreSQL ได้สำเร็จ เซิร์ฟเวอร์ใช้ In-memory DatabaseStore พร้อม seed data ทดแทน | `qa/evidence/R-02.txt` |
| R-03 | 🔴 FAIL | เมื่อพอร์ต 4000 ถูกใช้งานอยู่ เซิร์ฟเวอร์ crash ด้วย Unhandled `EADDRINUSE` ขาด Error Handling ที่สุภาพ | `qa/evidence/R-03.txt` |
| R-04 | 🟢 PASS | รันเกมครบวงจรต่อเนื่องหลายรอบบนเซิร์ฟเวอร์เดียวกันได้โดยไม่ค้างและไม่มี error lockup | `qa/evidence/R-04.txt` |

### 2. Lobby และห้อง (Lobby & Rooms: 8 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| L-01 | 🟢 PASS | ป้องกันชื่อว่าง/ช่องว่างล้วนได้, ชื่อยาวถูกจำกัดที่ `maxLength="14"` UI ไม่พัง | `qa/evidence/L-01.png`, `L-01.txt` |
| L-02 | 🔴 FAIL | ใน `App.jsx` มีการใช้ `AVATARS.slice(0, 6)` ทำให้แสดง Avatar เพียง 6 ตัวจาก 8 ตัว (`👾` และ `🚀` หายไป) | `qa/evidence/L-02.png`, `L-02.txt` |
| L-03 | 🟢 PASS | สุ่มสร้าง 10 ห้องได้ PIN 5 หลักเป็นตัวเลขล้วน และไม่พบ PIN ซ้ำกัน | `qa/evidence/L-03.txt` |
| L-04 | 🟢 PASS | เข้ารหัสห้องผิด / 4 หลัก / ตัวอักษร ถูกปฏิเสธพร้อมแจ้ง Error ชัดเจน ไม่ค้าง | `qa/evidence/L-04.txt` |
| L-05 | 🟢 PASS | เข้าร่วมห้องที่คนเต็มเกิน Max Players ถูกปฏิเสธพร้อมข้อความ "Room is full!" | `qa/evidence/L-05.txt` |
| L-06 | 🟢 PASS | เข้าห้องที่เกมเริ่มแล้ว (PLAYING) สามารถเข้าร่วมเป็นคนทายกลางคันได้ State ซิงค์ถูกต้อง | `qa/evidence/L-06.png`, `L-06.txt` |
| L-07 | 🟢 PASS | เล่น 2 ห้องพร้อมกัน ข้อมูลแชทและภาพวาดแยกห้องชัดเจน ไม่ปนกัน | `qa/evidence/L-07.txt` |
| L-08 | 🟢 PASS | Host ออกจากห้องในขณะอยู่ Lobby สิทธิ์ Host ถูกโอนไปยังผู้เล่นคนถัดไปโดยอัตโนมัติ | `qa/evidence/L-08.txt` |

### 3. Host Settings และเริ่มเกม (Host Controls: 7 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| H-01 | 🟢 PASS | Host กด START GAME แล้วผู้เล่นทุกคนเข้าสู่หน้า Arena พร้อมกัน | `qa/evidence/H-01.png`, `H-01_host.png` |
| H-02 | 🟢 PASS | ผู้เล่นที่ไม่ใช่ Host (Guest) ไม่มีปุ่ม START GAME ในหน้าจอ | `qa/evidence/H-02.png` |
| H-03 | 🔴 FAIL | กดเริ่มเกมตอนมีผู้เล่นคนเดียวในโหมด FFA ได้ โดยไม่มีการแจ้งเตือนหรือบล็อก | `qa/evidence/H-03.png` |
| H-04 | 🟢 PASS | กดปุ่ม Start รัว 10 ครั้ง เกมเริ่มเพียงรอบเดียว ไม่เกิดรอบซ้อน | `qa/evidence/H-04.png` |
| H-05 | 🟢 PASS | Host เปลี่ยน Round Time, Max Players หรือ Mode ผู้เล่นอื่นเห็นค่าที่อัปเดตแบบเรียลไทม์ | `qa/evidence/H-05.png`, `H-05_host.png` |
| H-06 | 🟢 PASS | **[เทสซ้ำ]** ไอคอนและข้อความใน Settings Tab แสดงผลถูกต้อง ไม่มีคำว่า `_outline_...` หลุดมา ฟอนต์อ่านง่าย | `qa/evidence/H-06.png`, `H-06_settings_retest.png` |
| H-07 | 🟢 PASS | ปิดชาเลนจ์บางตัว (COLOUR_FIX, DONT_LIFT_PEN) แล้วเล่น 6 รอบ ชาเลนจ์ที่ปิดไม่ถูกสุ่มออกมา | `qa/evidence/H-07.txt` |

### 4. เลือกคำและวาดรูป (Drawing & Word Selection: 7 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| D-01 | 🟢 PASS | คนวาดเห็นตัวเลือก 3 คำ คนทายไม่เห็นตัวเลือกคำบนหน้าจอ | `qa/evidence/D-01.png`, `D-01_drawer.png` |
| D-02 | 🟢 PASS | คนวาดไม่เลือกคำจนครบ 10 วินาที เซิร์ฟเวอร์สุ่มคำแรกให้อัตโนมัติและเริ่มวาด ไม่ค้าง | `qa/evidence/D-02.txt` |
| D-03 | 🟢 PASS | วาดเส้นเร็ว เปลี่ยนสี เปลี่ยนขนาดแปรง จอคนทายแสดงผลตรงกันแบบเรียลไทม์ | `qa/evidence/D-03.png`, `D-03_drawer.png` |
| D-04 | 🟢 PASS | กด Clear กระดานว่างพร้อมกันทั้งจอคนวาดและคนทาย | `qa/evidence/D-04.png`, `D-04_drawer.png` |
| D-05 | 🟢 PASS | คนทายลากเมาส์บน Canvas ไม่สามารถวาดได้ เคอร์เซอร์แสดง `cursor-not-allowed` | `qa/evidence/D-05.png` |
| D-06 | 🟢 PASS | ย่อ/ขยายหน้าต่างเบราว์เซอร์ ตำแหน่งเส้นไม่เพี้ยนเนื่องจาก Canvas ล็อกขนาด 640x480 พร้อม scale | `qa/evidence/D-06.png` |
| D-07 | 🟡 MANUAL | **ผ่านการเทสด้วย DevTools Emulation** (onTouchStart/Move/End ทำงานได้) แต่จัดเป็น **MANUAL** เพื่อยืนยันการวาดบนมือถือจริง | `qa/evidence/D-07.txt` (ดูรายละเอียดส่วนที่ 4) |

### 5. ยางลบเฉพาะจุด (Point Eraser: 6 เคส)
> **หมายเหตุการตรวจสอบโค้ดจริง:** ใน [`client/src/components/Canvas.jsx`](file:///D:/uni/2-Network/Justdrawit-main/client/src/components/Canvas.jsx) บรรทัดที่ 36–40 โค้ดของเครื่องมือ Eraser เป็นเพียงการวาดทับด้วยเส้นสีขาว (`ctx.strokeStyle = '#ffffff'`) ไม่ใช่ระบบยางลบเฉพาะจุดที่แท้จริง (ไม่มี `destination-out`, ไม่ลบโปร่งใส Alpha, และไม่สามารถลบเส้นบนกระดานที่เทสีพื้นหลังได้) ดังนั้นจึงจัดสถานะทั้ง 6 เคสเป็น **N/A - ยังไม่มีฟีเจอร์** ตามกฎข้อ 5
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| E-01 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง (มีเพียงแปรงระบายทับด้วยสีขาว `#ffffff`) | `qa/evidence/E-01.txt` |
| E-02 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง | `qa/evidence/E-02.txt` |
| E-03 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง | `qa/evidence/E-03.txt` |
| E-04 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง | `qa/evidence/E-04.txt` |
| E-05 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง | `qa/evidence/E-05.txt` |
| E-06 | ⚪ N/A | ยังไม่มีฟีเจอร์ยางลบเฉพาะจุดที่แท้จริง | `qa/evidence/E-06.txt` |

### 6. Mini-Challenges (8 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| C-01 | 🟢 PASS | Colour Fix: พาเล็ตสีถูกล็อกให้ใช้เฉพาะสีที่สุ่มได้ เซิร์ฟเวอร์บังคับสีใน DrawHandler | `qa/evidence/C-01.txt` |
| C-02 | 🟢 PASS | Colour Fix: เมื่อขึ้นรอบใหม่ พาเล็ตสีถูกปลดล็อกกลับเป็นปกติ | `qa/evidence/C-02.txt` |
| C-03 | 🟢 PASS | Don't Lift Pen: ยกเมาส์ 1 ครั้ง กระดานล็อกทันที พร้อมป้ายเตือนสีแดง | `qa/evidence/C-03.png` |
| C-04 | 🟢 PASS | Don't Lift Pen: ลากเมาส์ออกนอก Canvas ทริกเกอร์ `onMouseLeave` และล็อกกระดานอย่างถูกต้อง | `qa/evidence/C-04.txt` |
| C-05 | 🟢 PASS | Geometric: วาดวงกลม สี่เหลี่ยม สามเหลี่ยม เส้นตรง ได้รูปทรงถูกต้อง | `qa/evidence/C-05.png` |
| C-06 | 🟢 PASS | **[เทสซ้ำ]** Geometric: คลิกลากค้างมี Live Ghost Preview พร้อม Dimension Badge (📐) และหายไปเมื่อปล่อยเมาส์กลายเป็นเส้นจริง | `qa/evidence/C-06.png`, `C-06_dragging_drawer.png`, `C-06_released_drawer.png` |
| C-07 | 🟢 PASS | Geometric: เมื่อปล่อยเมาส์ Ghost Preview บนจอคนทายถูกเคลียร์ทันที ไม่มีเส้นค้าง | `qa/evidence/C-07.txt` |
| C-08 | 🟢 PASS | ชาเลนจ์ในรอบก่อนหน้าถูกรีเซ็ต State ทุกครั้งที่เริ่มรอบใหม่ ไม่ติดค้าง | `qa/evidence/C-08.txt` |

### 7. แชท การทาย การซ่อนคำตอบ (Chat & Guessing: 7 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| G-01 | 🟢 PASS | ทายถูกแสดงข้อความระบบสีเขียว `คุณ [ชื่อ] ทายถูกแล้ว! (+คะแนน)` คำตอบไม่ปรากฏในแชท | `qa/evidence/G-01.txt` |
| G-02 | 🟢 PASS | ทายคำด้วยตัวพิมพ์ใหญ่หรือเว้นวรรคเกิน ฟังก์ชัน `normalizeGuess` ตัดช่องว่างและแปลงเป็นพิมพ์เล็ก ทายถูกได้ | `qa/evidence/G-02.txt` |
| G-03 | 🟢 PASS | คนที่ทายถูกแล้วพิมพ์คำตอบซ้ำ ข้อความจะถูกแปลงเป็น `██████ (GUESSED)` ไม่สปอยล์คนอื่นและไม่ได้คะแนนซ้ำ | `qa/evidence/G-03.txt` |
| G-04 | 🔴 FAIL | คนวาดพิมพ์คำตอบในแชทได้โดยไม่ถูกบล็อก ทำให้เฉลยคำตอบรั่วในห้องแชท | `qa/evidence/G-04.txt` |
| G-05 | 🟢 PASS | ส่งข้อความยาว 2,000 ตัวอักษร และส่งรัว 50 ข้อความ เซิร์ฟเวอร์ไม่ล่ม | `qa/evidence/G-05.txt` |
| G-06 | 🟢 PASS | **[เทสซ้ำ]** ตรวจสอบปุ่ม SEND ครบทั้ง 4 ความกว้าง (1920, 1366, 768, 375 px) ปุ่มอยู่ในกรอบทั้งหมด ไม่ตกเฟรม | `qa/evidence/G-06_1920px.png`, `G-06_1366px.png`, `G-06_768px.png`, `G-06_375px.png` |
| G-07 | 🟢 PASS | ทุกคนทายถูกครบก่อนหมดเวลา เซิร์ฟเวอร์สั่งจบรอบทันทีและแสดงผลเฉลย | `qa/evidence/G-07.txt` |

### 8. เวลาและรอบ (Timers & Rounds: 5 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| T-01 | 🟢 PASS | เทียบเวลาในทุก Client คลาดเคลื่อนสูงสุดเพียง 2ms (ผ่านเกณฑ์ไม่เกิน 1 วินาที) | `qa/evidence/T-01.txt` |
| T-02 | 🟢 PASS | **[เทสซ้ำ]** เล่นต่อเนื่อง 3 รอบเต็มโดยไม่รีเฟรชหน้าจอ เวลานับถอยหลังและรีเซ็ตซิงค์ตรงกันทั้ง 2 จอทุกรอบ (00:42) | `qa/evidence/T-02_multiround_log.json`, `T-02_round1_client1.png`, `T-02_round2_client1.png`, `T-02_round3_client1.png` |
| T-03 | 🟢 PASS | สลับแท็บและกลับมา เวลาซิงค์ตรงกับ Client อื่นทันทีผ่าน `TIMER_TICK` ของเซิร์ฟเวอร์ | `qa/evidence/T-03.txt` |
| T-04 | 🟢 PASS | หมดเวลาโดยไม่มีใครทายถูก เซิร์ฟเวอร์เฉลยคำตอบ คนวาดได้ 0 คะแนน และเปลี่ยนรอบ | `qa/evidence/T-04.txt` |
| T-05 | 🟢 PASS | ลำดับคนวาดวนครบทุกคนในห้องตาม Index โดยไม่ซ้ำคิว | `qa/evidence/T-05.txt` |

### 9. คะแนน (Scoring: 4 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| S-01 | 🟢 PASS | คนทาย 3 คน ถูก 2 คน คนวาดได้คะแนนตามสูตร $300 \times \frac{2}{3} = 200$ คะแนน | `qa/evidence/S-01.txt` |
| S-02 | 🟢 PASS | ไม่มีใครทายถูก คนวาดได้ 0 คะแนน | `qa/evidence/S-02.txt` |
| S-03 | 🟢 PASS | คนทายเร็วได้ 497 คะแนน คนทายช้าได้ 438 คะแนน อยู่ในช่วง 100–500 คะแนนตามสปีด | `qa/evidence/S-03.txt` |
| S-04 | 🟢 PASS | Leaderboard ซิงค์คะแนนตรงกันทุก Client ผ่าน `ROOM_DATA` | `qa/evidence/S-04.txt` |

### 10. โหมดเกม (Game Modes: 6 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| M-01 | 🟢 PASS | Team Mode: ผู้เล่น 5 คน ถูกแบ่งทีมเป็น Red (3) และ Blue (2) อย่างสมดุล | `qa/evidence/M-01.txt` |
| M-02 | 🟢 PASS | Team Mode: คะแนนทีมเท่ากับผลรวมคะแนนของสมาชิกในทีม | `qa/evidence/M-02.txt` |
| M-03 | 🟢 PASS | Team Mode: สมาชิกในทีมตัดการเชื่อมต่อ คะแนนรวมของทีมไม่สูญหาย | `qa/evidence/M-03.txt` |
| M-04 | 🟢 PASS | Solo AI: วาดภาพแล้ว AI คาดเดาคำและค่าความมั่นใจ (Confidence) แบบเรียลไทม์ ไม่ค้าง | `qa/evidence/M-04.png` |
| M-05 | 🟢 PASS | Solo AI: หน้าตา UI ครบถ้วน เข้าธีม Neo-Arcade Brushwork | `qa/evidence/M-05.png` |
| M-06 | 🟢 PASS | Solo AI: จบเกมแล้วคะแนนไม่ถูกบันทึกเข้า Global Leaderboard | `qa/evidence/M-06.txt` |

### 11. จบเกมและกลับ Lobby (Match Over Flow: 5 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| F-01 | 🟢 PASS | เล่นครบทุกรอบ แสดง Match Results Modal สรุปผู้ชนะ อันดับ และคะแนนครบถ้วน | `qa/evidence/F-01.png` |
| F-02 | 🔴 FAIL | กดปุ่ม "BACK TO LOBBY" ใน Modal แล้วไม่กลับ Lobby ตัว Modal หายไปแต่ค้างที่หน้า Arena แสดง "ROUND 4 / 3" | `qa/evidence/F-02.png`, `F-02_ws_frames.json` |
| F-03 | 🟢 PASS | ปุ่ม LEAVE บน Top Bar สามารถกดเพื่อออกจากห้องกลับสู่หน้า Main Browser ได้ | `qa/evidence/F-03.png` |
| F-04 | 🟢 PASS | เมื่อใช้ปุ่ม LEAVE ออกมาแล้วสร้าง/เข้าห้องใหม่ เริ่มต้นที่ Round 1 คะแนนรีเซ็ตเป็น 0 และกระดานว่าง | `qa/evidence/F-03.png` |
| F-05 | 🟢 PASS | การกดย้อนกลับ (Browser Back) หรือกด Leave รัว ไม่ทำให้เซิร์ฟเวอร์เกิดรอบซ้อน | `qa/evidence/F-03.png` |

### 12. Network และการหลุด (Networking & Resiliency: 10 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| NW-01 | 🟢 PASS | เชื่อมต่อ 5 Client พร้อมกัน ข้อมูลเชื่อมต่อครบถ้วน | `qa/evidence/NW-01.txt` |
| NW-02 | 🟢 PASS | ตรวจสอบ WS Frames มี HTTP 101 Switching Protocols และส่งพิกัด Vector Stroke ไม่ใช่ภาพดิบ | `qa/evidence/NW-02.txt` |
| NW-03 | 🟢 PASS | ขนาด Payload เฉลี่ยของเส้นวาดอยู่ที่ประมาณ 64.8 Bytes ต่อจุด/พิกัด | `qa/evidence/NW-03.txt` |
| NW-04 | 🟢 PASS | Latency เฉลี่ยของการส่งและรับเส้นวาดในเครื่องอยู่ที่ 0–5 ms | `qa/evidence/NW-04.txt` |
| NW-05 | 🟢 PASS | คนวาดปิดแท็บกลางรอบ ระบบตัดออกจากห้องและรอบหมุนเวียนต่อไปได้ | `qa/evidence/NW-05.txt` |
| NW-06 | 🟢 PASS | Host ปิดแท็บ สิทธิ์ Host ถูกโอนไปยังผู้เล่นคนถัดไปอย่างถูกต้อง | `qa/evidence/NW-06.txt` |
| NW-07 | 🟢 PASS | รีเฟรชกลางเกมและเข้าด้วยชื่อเดิม ระบบ Rebind socketId และคงคะแนนเดิมไว้ | `qa/evidence/NW-07.txt` |
| NW-08 | 🟢 PASS | Client มีฟีเจอร์ Reconnection อัตโนมัติใน socket.js และดึงประวัติวาดผ่าน DRAW_SYNC | `qa/evidence/NW-08.txt` |
| NW-09 | 🟢 PASS | ปิดเซิร์ฟเวอร์ระหว่างเล่น ไคลเอนต์พยายามเชื่อมต่อใหม่ ไม่เกิดจอขาว Uncaught Crash | `qa/evidence/NW-09.txt` |
| NW-10 | 🟢 PASS | Server Console มี Log การทำงานชัดเจน (Listening, Port, Startup) | `qa/evidence/NW-10.txt` |

### 13. Security (9 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| SEC-01 | 🔴 FAIL | ตรวจสอบ Frame `ROOM_DATA` ของคนทาย พบคำตอบลับ (`currentWord`) ส่งมาใน Plaintext ทุกครั้งที่เริ่มวาด | `qa/evidence/SEC-01.txt` |
| SEC-02 | 🟢 PASS | ส่ง Event `start_game` จาก Client ที่ไม่ใช่ Host เซิร์ฟเวอร์ตรวจสอบและปฏิเสธ | `qa/evidence/SEC-02.txt` |
| SEC-03 | 🟢 PASS | ส่ง Event วาดเส้นจากคนที่ไม่ใช่คนวาด เซิร์ฟเวอร์ไม่บรอดแคสต์ต่อ | `qa/evidence/SEC-03.txt` |
| SEC-04 | 🟢 PASS | ส่งคะแนนปลอมผ่าน Client ไม่สำเร็จ เซิร์ฟเวอร์เป็นผู้อนุมัติและคำนวณคะแนนเท่านั้น | `qa/evidence/SEC-04.txt` |
| SEC-05 | 🟢 PASS | ใส่ Payload XSS (`<img src=x onerror=alert(1)>`) ในชื่อและแชท ถูก Render เป็นข้อความธรรมดา ไม่เกิด Code Execution | `qa/evidence/SEC-05.txt` |
| SEC-06 | 🟢 PASS | ส่งแชท 1,000 ข้อความต่อเนื่องใน Loop เซิร์ฟเวอร์ไม่ล่ม (หมายเหตุ: ยังไม่มี Rate limit) | `qa/evidence/SEC-06.txt` |
| SEC-07 | 🟢 PASS | ส่ง Stroke ที่มี 10,000 จุด เซิร์ฟเวอร์ประมวลผลได้ ไม่ล่ม | `qa/evidence/SEC-07.txt` |
| SEC-08 | 🟢 PASS | ยิงสุ่มเดา PIN 500 ครั้ง เซิร์ฟเวอร์ปฏิเสธถูกต้องทั้งหมด (ยังไม่มี IP Tarpit / Lockout) | `qa/evidence/SEC-08.txt` |
| SEC-09 | 🟢 PASS | ยิง SQL Injection (`' OR 1=1 --`) ใน `/api/auth/login` ระบบใช้ In-memory Map ปลอดภัยจาก SQLi | `qa/evidence/SEC-09.txt` |

### 14. UI ทั่วไป (4 เคส)
| ID | สถานะ | หมายเหตุ | หลักฐาน |
|---|---|---|---|
| UI-01 | 🟢 PASS | หน้าจอไม่ล้น ไม่ทับซ้อนที่ Viewports 1920, 1366, 768, 375 px | `qa/evidence/UI-01_1920px.png`, `UI-01_375px.png` |
| UI-02 | 🟢 PASS | โทนสี เส้นขอบ และฟอนต์ตรงตามคู่มือ `theme/DESIGN.md` | `qa/evidence/UI-02.png` |
| UI-03 | 🟢 PASS | ปุ่มต่าง ๆ มี Hover / Active Transform และ Disabled Opacity | `qa/evidence/UI-03.txt` |
| UI-04 | 🟢 PASS | ไม่มี Uncaught Error หลุดใน Browser Console ระหว่างการทดสอบ | `qa/evidence/UI-04.txt` |

---

## ส่วนที่ 3: รายละเอียดการทดสอบซ้ำตามคำสั่ง (Targeted Re-test Findings)

### 1. เคส H-06 (Mini-Challenge Settings UI)
- **การทดสอบ:** เข้าหน้า Settings ของห้อง สลับเปิด-ปิด Mini-Challenges
- **ผลการทดสอบ:** 
  - ฟอนต์และปุ่ม Toggle แสดงผลสวยงามตามดีไซน์ Neo-Arcade Brushwork
  - ไม่มีข้อความขยะ `_outline_...` หลุดมาในเนื้อหาปุ่ม
- **หลักฐานใหม่:** [`qa/evidence/H-06_settings_default.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/H-06_settings_default.png), [`qa/evidence/H-06_settings_retest.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/H-06_settings_retest.png), [`qa/evidence/H-06.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/H-06.png)

### 2. เคส G-06 (ตำแหน่งปุ่ม SEND ในกรอบแชท)
- **การทดสอบ:** วัด Bounding Box ของปุ่ม SEND และกรอบแชทที่ 4 ขนาดหน้าจอ (1920, 1366, 768, 375 px)
- **ผลการทดสอบ:**
  - บนจอแคบ (375 px และ 768 px) ฟอร์มแชทใช้ Flex Layout แบบ `flex-col` ทำให้ปุ่ม SEND ขยายเต็มความกว้างและอยู่ด้านล่างช่อง Input อย่างเป็นระเบียบ ไม่หลุดออกนอกขอบหน้าจอ
  - บนจอกว้าง (1366 px และ 1920 px) ปุ่ม SEND วางต่อท้ายช่อง Input ในแนวระนาบได้อย่างพอดี
- **หลักฐานใหม่:** ครบทั้ง 4 ภาพ
  - [`qa/evidence/G-06_1920px.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/G-06_1920px.png)
  - [`qa/evidence/G-06_1366px.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/G-06_1366px.png)
  - [`qa/evidence/G-06_768px.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/G-06_768px.png)
  - [`qa/evidence/G-06_375px.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/G-06_375px.png)

### 3. เคส C-06 (Geometric Shapes Ghost Preview & Dimension Badge)
- **การทดสอบ:** เล่นรอบที่ติดชาเลนจ์ GEOMETRIC_ONLY คลิกลากเมาส์ค้างเพื่อวาดรูปทรง และปล่อยเมาส์
- **ผลการทดสอบ:**
  - ขณะคลิกลากค้าง บนหน้าจอคนวาดมี Ghost Line เส้นประโปร่งใสตามเมาส์ พร้อมกล่อง Badge แสดงขนาดพิกเซลแบบเรียลไทม์ (เช่น `📐 150 x 130 px`)
  - หน้าจอคนทายได้รับ Event `shape_preview` แสดงเงาร่างตามคนวาดทันที
  - เมื่อปล่อยเมาส์ Event `draw_end` เคลียร์ Ghost Canvas ทิ้งทั้งสองฝั่ง และเรนเดอร์รูปทรงทึบอย่างสมบูรณ์
- **หลักฐานใหม่:**
  - ขณะคลิกลากค้าง: [`qa/evidence/C-06_dragging_drawer.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/C-06_dragging_drawer.png), [`qa/evidence/C-06_dragging_guesser.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/C-06_dragging_guesser.png)
  - เมื่อปล่อยเมาส์: [`qa/evidence/C-06_released_drawer.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/C-06_released_drawer.png), [`qa/evidence/C-06_released_guesser.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/C-06_released_guesser.png)

### 4. เคส T-02 (การนับเวลาต่อเนื่อง 3 รอบโดยไม่รีเฟรช)
- **การทดสอบ:** เล่นต่อเนื่อง 3 รอบเต็ม (Round 1, Round 2, Round 3) บนเบราว์เซอร์ 2 ตัว (Host และ Guest) โดยไม่มีการรีเฟรชหน้าเว็บแม้แต่ครั้งเดียว
- **ผลการบันทึกเวลาจริง (Log Extract จาก `qa/evidence/T-02_multiround_log.json`):**
  ```json
  [
    {
      "round": 1,
      "selectedWord": "APPLE",
      "hostTimer": "00:42",
      "guestTimer": "00:42",
      "timersMatch": true,
      "screenshots": ["T-02_round1_client1.png", "T-02_round1_client2.png"]
    },
    {
      "round": 2,
      "selectedWord": "CLOCK",
      "hostTimer": "00:42",
      "guestTimer": "00:42",
      "timersMatch": true,
      "screenshots": ["T-02_round2_client1.png", "T-02_round2_client2.png"]
    },
    {
      "round": 3,
      "selectedWord": "APPLE",
      "hostTimer": "00:42",
      "guestTimer": "00:42",
      "timersMatch": true,
      "screenshots": ["T-02_round3_client1.png", "T-02_round3_client2.png"]
    }
  ]
  ```
- **ข้อสรุป:** เวลารีเซ็ตและนับถอยหลังต่อในรอบถัดไปได้อย่างราบรื่น ไม่พบอาการเวลานิ่งหรือหยุดนับ
- **หลักฐานใหม่:** ครบทั้ง 6 Screenshots และ JSON Log
  - Round 1: [`qa/evidence/T-02_round1_client1.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round1_client1.png), [`qa/evidence/T-02_round1_client2.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round1_client2.png)
  - Round 2: [`qa/evidence/T-02_round2_client1.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round2_client1.png), [`qa/evidence/T-02_round2_client2.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round2_client2.png)
  - Round 3: [`qa/evidence/T-02_round3_client1.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round3_client1.png), [`qa/evidence/T-02_round3_client2.png`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_round3_client2.png)
  - Log ละเอียด: [`qa/evidence/T-02_multiround_log.json`](file:///D:/uni/2-Network/Justdrawit-main/qa/evidence/T-02_multiround_log.json)

---

## ส่วนที่ 4: รายการเคส MANUAL (การทดสอบบนอุปกรณ์จริง)

### เคส D-07: การทดสอบ Touch Events และ Gesture บนสมาร์ตโฟนจริง
- **สถานะ:** 🟡 **MANUAL**
- **เหตุผล:** แม้ระบบจะผ่านการทดสอบสังเคราะห์ด้วย DevTools Mobile Emulation แล้ว แต่ไม่สามารถจำลองฟิสิกส์การสัมผัสของหน้าจอมือถือจริงได้ เช่น การถูกแทรกแซงจาก Pinch-to-Zoom, Safari Rubber-banding, และการวางอุ้งมือ (Palm Rejection)
- **ขั้นตอนสำหรับผู้ทดสอบมือถือ:**
  1. ใช้มือถือจริง (iPhone / Android) ต่อ Wi-Fi เดียวกันกับเครื่องรันเซิร์ฟเวอร์
  2. เข้าเว็บผ่าน IP ของเครื่องคอมพิวเตอร์ (เช่น `http://192.168.1.X:5173`)
  3. เข้าร่วมห้องในบทบาทคนวาด (Drawer)
  4. ใช้นิ้วมือและปากกาสไตลัสลากเส้นโค้งอย่างรวดเร็ว
  5. ตรวจสอบว่าหน้าจอไม่เลื่อนขึ้น-ลงตามนิ้ว (No Page Scroll) และลายเส้นวาดตรงกับตำแหน่งปลายนิ้วสัมผัส
