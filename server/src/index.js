import http from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { createApp } from './http/app.js';
import { attachSocketHandlers } from './net/handlers.js';
import { checkConnection, closePool, dbEnabled } from './db/pool.js';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigins, credentials: true },
  // ภาพวาดเป็น array ของจุด ปกติไม่ถึง 200KB — ตั้งเพดานไว้กัน payload ระเบิด
  maxHttpBufferSize: 512 * 1024,
  pingTimeout: 20_000,
  pingInterval: 10_000,
  // ข้ามการ polling ไปเลย ใช้ websocket ล้วน ลด overhead และลดช่องโจมตีแบบ long-polling
  transports: ['websocket'],
});

attachSocketHandlers(io);

server.listen(config.port, async () => {
  console.log(`[wadtor] เซิร์ฟเวอร์ทำงานที่พอร์ต ${config.port} (${config.env})`);
  console.log(`[wadtor] อนุญาตต้นทาง: ${config.corsOrigins.join(', ')}`);

  if (!dbEnabled()) {
    console.log('[wadtor] ฐานข้อมูล: ไม่ได้ตั้งค่า — เกมเล่นได้ แต่ไม่บันทึกข้อมูลและเข้าหน้าหลังบ้านไม่ได้');
    return;
  }

  const health = await checkConnection();
  if (health.ok) {
    console.log('[wadtor] ฐานข้อมูล: ต่อสำเร็จ');
  } else {
    console.error('');
    console.error('  ⚠  ตั้งค่า DATABASE_URL ไว้ แต่ต่อฐานข้อมูลไม่ได้');
    console.error(`     สาเหตุ: ${health.reason}`);
    console.error('     เกมยังเล่นได้ แต่จะไม่บันทึกอะไร และหน้าหลังบ้านจะใช้ไม่ได้');
    console.error('     วิธีแก้: สั่ง docker compose up -d หรือใส่ # หน้าบรรทัด DATABASE_URL ใน .env');
    console.error('');
  }
});

const shutdown = (signal) => {
  console.log(`\n[wadtor] ได้รับสัญญาณ ${signal} กำลังปิดเซิร์ฟเวอร์`);
  io.close(() => server.close(async () => {
    await closePool().catch(() => {});
    process.exit(0);
  }));
  setTimeout(() => process.exit(1), 8000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
