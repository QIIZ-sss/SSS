import { config } from '../config.js';
import { makeRoomCode } from '../util/ids.js';
import { Room, PHASE } from './room.js';

/**
 * ที่เก็บห้องทั้งหมด — ตอนนี้อยู่ในหน่วยความจำของโปรเซสเดียว
 *
 * ตอนขยายเป็นหลายเครื่อง ให้เปลี่ยนตรงนี้เป็น Redis (เก็บ state ห้อง + ใช้ socket.io-redis adapter)
 * ส่วนที่เหลือของโค้ดไม่ต้องแก้ เพราะทุกอย่างคุยผ่าน RoomManager อยู่แล้ว
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
    this.playerRoom = new Map(); // playerId -> code
    this.janitor = setInterval(() => this.sweep(), 60_000);
    this.janitor.unref?.();
  }

  create({ isPublic, bus, store = null }) {
    let code = makeRoomCode();
    let guard = 0;
    while (this.rooms.has(code) && guard++ < 20) code = makeRoomCode();
    if (this.rooms.has(code)) throw new Error('สร้างรหัสห้องไม่สำเร็จ ลองใหม่อีกครั้ง');

    const room = new Room({ code, isPublic, bus: bus(code), store });
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').toUpperCase());
  }

  /**
   * จับคู่ห้องสาธารณะ — เลือกห้องที่ "เกือบเต็ม" ก่อน
   * เพราะห้องที่มี 8 คนเริ่มเล่นได้ทันที ส่วนห้องที่มี 2 คนต้องรอ ทำให้คนรอแล้วออก
   */
  findPublicRoom() {
    let best = null;
    for (const room of this.rooms.values()) {
      if (!room.isPublic || !room.isJoinable) continue;
      if (!best || room.playerCount > best.playerCount) best = room;
    }
    return best;
  }

  bindPlayer(playerId, code) {
    this.playerRoom.set(playerId, code);
  }

  roomOfPlayer(playerId) {
    const code = this.playerRoom.get(playerId);
    return code ? this.rooms.get(code) : null;
  }

  unbindPlayer(playerId) {
    this.playerRoom.delete(playerId);
  }

  /** เก็บกวาดห้องร้างและผู้เล่นที่หลุดเน็ตนานเกินกำหนด */
  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      for (const player of [...room.players.values()]) {
        if (
          !player.connected &&
          player.disconnectedAt &&
          now - player.disconnectedAt > config.reconnectGraceMs
        ) {
          room.removePlayer(player.id);
          this.unbindPlayer(player.id);
          room.bus.toRoom('room:state', room.snapshot());
        }
      }
      if (room.playerCount === 0 && room.emptySince && now - room.emptySince > config.emptyRoomTtlMs) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }

  stats() {
    let publicRooms = 0;
    let players = 0;
    let playing = 0;
    for (const room of this.rooms.values()) {
      if (room.isPublic) publicRooms++;
      players += room.playerCount;
      if (room.phase !== PHASE.LOBBY) playing++;
    }
    return { rooms: this.rooms.size, publicRooms, players, playing };
  }
}

export const roomManager = new RoomManager();
