import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { roomManager } from '../game/roomManager.js';
import { PHASE } from '../game/room.js';
import { CHALLENGE_CATALOG } from '../game/challenges.js';
import { countPoints, simplify } from '../game/strokeOps.js';
import { cleanText, containsBlockedWord } from '../util/sanitize.js';
import * as gameStore from '../db/games.js';
import { createReport, isBanned } from '../db/moderation.js';
import {
  chatSchema,
  createRoomSchema,
  joinRoomSchema,
  kickSchema,
  reactSchema,
  reportSchema,
  revealViewSchema,
  settingsSchema,
  submitSchema,
  guessSchema,
} from './schemas.js';

/**
 * ถังโทเคนต่อ socket — กันคนยิง event รัวจนเซิร์ฟเวอร์ตาย
 * ตั้งไว้ 25 event/วินาที ซึ่งสูงกว่าการเล่นปกติมาก แต่ต่ำกว่าสคริปต์ยิงถล่มมาก
 */
function makeBucket(capacity = 25, refillPerSec = 25) {
  let tokens = capacity;
  let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * refillPerSec);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

const ok = (data = {}) => ({ ok: true, ...data });
const fail = (message) => ({ ok: false, error: message });

export function attachSocketHandlers(io) {
  /** ตัวส่งข้อความของห้อง — Room ไม่รู้จัก socket.io เลย ทำให้เทสต์แยกได้ */
  const busFor = (code) => ({
    toRoom: (event, data) => io.to(`room:${code}`).emit(event, data),
    toPlayer: (playerId, event, data) => {
      const room = roomManager.get(code);
      const sid = room?.players.get(playerId)?.socketId;
      if (sid) io.to(sid).emit(event, data);
    },
  });

  /**
   * ตรวจตั๋วตอน handshake ไม่ใช่ตอนเรียก event
   * ถ้าตรวจทีหลัง จะมี socket ที่ยังไม่ยืนยันตัวตนค้างอยู่ในระบบ ซึ่งเป็นช่องให้ยิงถล่มฟรี
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('ไม่พบตั๋วเข้าใช้งาน'));

    // ขั้นที่ 1 — ตรวจตั๋ว
    // แยก try/catch ออกจากขั้นที่ 2 โดยตั้งใจ ไม่งั้น error ของฐานข้อมูล
    // จะถูกรายงานให้ผู้ใช้เห็นว่า "ตั๋วไม่ถูกต้อง" ซึ่งชี้ไปผิดที่และทำให้ตามหาสาเหตุยากมาก
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { issuer: 'wadtor' });
    } catch {
      return next(new Error('ตั๋วเข้าใช้งานไม่ถูกต้องหรือหมดอายุ'));
    }

    // ขั้นที่ 2 — ตรวจรายชื่อแบน
    // ตรวจที่นี่ด้วย ไม่ใช่แค่ตอนขอตั๋ว เพราะตั๋วมีอายุหลายชั่วโมง
    // คนที่ถูกแบนหลังได้ตั๋วไปแล้วต้องเข้าไม่ได้ทันทีที่เชื่อมต่อครั้งถัดไป
    const ip = socket.handshake.address;
    const ban = await isBanned({ playerId: payload.sub, ip });
    if (ban) return next(new Error(`บัญชีนี้ถูกระงับ: ${ban.reason}`));

    socket.data.playerId = payload.sub;
    socket.data.name = payload.name;
    socket.data.ip = ip;
    socket.data.allow = makeBucket();
    gameStore.touchPlayer(payload.sub, payload.name).catch(() => {});
    next();
  });

  io.on('connection', (socket) => {
    const { playerId, name } = socket.data;

    /** ครอบ handler ทุกตัวด้วยการตรวจ rate limit + schema + จับ error */
    const on = (event, schema, handler) => {
      socket.on(event, (raw, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!socket.data.allow()) return reply(fail('ส่งคำสั่งถี่เกินไป รอสักครู่'));
        let input = {};
        if (schema) {
          const parsed = schema.safeParse(raw ?? {});
          if (!parsed.success) return reply(fail('ข้อมูลที่ส่งมาไม่ถูกต้อง'));
          input = parsed.data;
        }
        try {
          // handler เป็น async ได้ (เช่นตัวที่ต้องคุยกับฐานข้อมูล) — ห่อด้วย Promise.resolve
          Promise.resolve(handler(input))
            .then((result) => reply(result ?? ok()))
            .catch((err) => {
              console.error(`[socket:${event}]`, err);
              reply(fail('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'));
            });
        } catch (err) {
          console.error(`[socket:${event}]`, err);
          reply(fail('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'));
        }
      });
    };

    const enterRoom = (room) => {
      const player = room.addPlayer({ id: playerId, name, socketId: socket.id });
      if (!player) return fail('ห้องเต็มแล้ว');
      roomManager.bindPlayer(playerId, room.code);
      socket.join(`room:${room.code}`);
      room.bus.toRoom('room:state', room.snapshot());
      return ok({ room: room.snapshot(), you: playerId, catalog: CHALLENGE_CATALOG });
    };

    on('room:create', createRoomSchema, ({ isPublic }) => {
      if (roomManager.roomOfPlayer(playerId)) return fail('คุณอยู่ในห้องอื่นอยู่แล้ว');
      const room = roomManager.create({ isPublic, bus: busFor, store: gameStore });
      return enterRoom(room);
    });

    on('room:join', joinRoomSchema, ({ code }) => {
      const room = roomManager.get(code);
      if (!room) return fail('ไม่พบห้องรหัสนี้');
      // ผู้เล่นเดิมที่หลุดไปกลับเข้ามาได้แม้เกมเริ่มแล้ว แต่คนใหม่ต้องรอรอบถัดไป
      const returning = room.players.has(playerId);
      if (!returning && room.phase !== PHASE.LOBBY) return fail('ห้องนี้กำลังเล่นอยู่ รอรอบหน้านะ');
      if (!returning && room.playerCount >= room.maxPlayers) return fail('ห้องเต็มแล้ว');
      return enterRoom(room);
    });

    on('room:quickplay', null, () => {
      if (roomManager.roomOfPlayer(playerId)) return fail('คุณอยู่ในห้องอื่นอยู่แล้ว');
      const existing = roomManager.findPublicRoom();
      const room = existing || roomManager.create({ isPublic: true, bus: busFor, store: gameStore });
      return enterRoom(room);
    });

    on('room:leave', null, () => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return ok();
      socket.leave(`room:${room.code}`);
      room.removePlayer(playerId);
      roomManager.unbindPlayer(playerId);
      room.bus.toRoom('room:state', room.snapshot());
      return ok();
    });

    on('room:settings', settingsSchema, (patch) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      if (!room.isHost(playerId)) return fail('เฉพาะเจ้าของห้องเท่านั้นที่แก้ไขได้');
      if (room.phase !== PHASE.LOBBY) return fail('แก้ไขได้เฉพาะตอนอยู่ในห้องรอ');
      if (room.isPublic) return fail('ห้องสาธารณะใช้ค่าตั้งต้นของระบบ');
      room.updateSettings(patch);
      room.bus.toRoom('room:state', room.snapshot());
      return ok();
    });

    on('room:kick', kickSchema, ({ playerId: targetId }) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      if (!room.isHost(playerId)) return fail('เฉพาะเจ้าของห้องเท่านั้นที่เตะได้');
      if (targetId === playerId) return fail('เตะตัวเองไม่ได้');
      const target = room.players.get(targetId);
      if (!target) return fail('ไม่พบผู้เล่นคนนี้');
      if (target.socketId) {
        io.to(target.socketId).emit('room:kicked', { by: name });
        io.sockets.sockets.get(target.socketId)?.leave(`room:${room.code}`);
      }
      room.removePlayer(targetId);
      roomManager.unbindPlayer(targetId);
      room.bus.toRoom('room:state', room.snapshot());
      return ok();
    });

    on('game:start', null, () => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      if (!room.isHost(playerId)) return fail('เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้');
      const result = room.startGame();
      return result.ok ? ok() : fail(result.error);
    });

    on('draw:submit', submitSchema, ({ strokes }) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');

      // ลดจุดที่ถี่เกินจำเป็นก่อน แล้วค่อยตรวจเพดาน
      const trimmed = strokes.map((s) => ({ ...s, points: simplify(s.points) }));
      if (countPoints(trimmed) > config.maxPointsPerSubmit) {
        return fail('ภาพมีรายละเอียดมากเกินไป ลองลดเส้นลงหน่อย');
      }
      const result = room.submitDrawing(playerId, trimmed);
      return result.ok ? ok() : fail(result.error);
    });

    on('guess:submit', guessSchema, ({ text }) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const result = room.submitGuess(playerId, text);
      return result.ok ? ok() : fail(result.error);
    });

    on('reveal:view', revealViewSchema, (view) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const result = room.setRevealView(playerId, view);
      return result.ok ? ok() : fail(result.error);
    });

    on('reveal:react', reactSchema, async (payload) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const result = room.react(playerId, payload);
      if (!result.ok) return fail(result.error);

      // บันทึกลงฐานข้อมูลแบบไม่ให้ผู้เล่นต้องรอ — ตัวเลขบนหน้าจอมาจากหน่วยความจำอยู่แล้ว
      room
        .drawingIdFor(payload.chainIndex, payload.stepIndex)
        .then((drawingId) =>
          gameStore.toggleReaction(drawingId, playerId, payload.emoji, result.isAdding)
        )
        .catch((err) => console.error('[reaction] บันทึกไม่สำเร็จ', err.message));

      return ok();
    });

    on('reveal:report', reportSchema, async (payload) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const chain = room.chains[payload.chainIndex];
      const step = chain?.steps[payload.stepIndex];
      if (!step) return fail('ไม่พบผลงานนี้');
      if (step.by === playerId) return fail('รายงานผลงานของตัวเองไม่ได้');

      // เก็บสำเนาภาพไว้ในรายงานด้วย เผื่อภาพต้นทางถูกลบไปก่อนแอดมินจะได้ดู
      const snapshot = chain.steps
        .slice(0, payload.stepIndex + 1)
        .flatMap((s) => s.strokes);

      const drawingId = await room.drawingIdFor(payload.chainIndex, payload.stepIndex);
      await createReport({
        drawingId,
        roomCode: room.code,
        reportedBy: playerId,
        drawnBy: step.by,
        reason: payload.reason,
        snapshot,
      });

      return ok({ message: 'รับเรื่องแล้ว ทีมงานจะตรวจสอบ' });
    });

    on('room:reset', null, () => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const result = room.returnToLobby(playerId);
      return result.ok ? ok() : fail(result.error);
    });

    on('chat:send', chatSchema, ({ text }) => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return fail('คุณไม่ได้อยู่ในห้อง');
      const clean = cleanText(text, 140);
      if (!clean) return fail('ข้อความว่าง');
      if (containsBlockedWord(clean)) return fail('ข้อความนี้ส่งไม่ได้');
      room.bus.toRoom('chat:message', {
        from: name,
        color: room.players.get(playerId)?.color,
        text: clean,
        at: Date.now(),
      });
      return ok();
    });

    socket.on('disconnect', () => {
      const room = roomManager.roomOfPlayer(playerId);
      if (!room) return;
      // ไม่ลบทันที เผื่อเน็ตกระตุก — RoomManager.sweep จะลบให้เองถ้าไม่กลับมาในเวลาที่กำหนด
      room.markDisconnected(playerId);
      room.bus.toRoom('room:state', room.snapshot());
    });
  });
}
