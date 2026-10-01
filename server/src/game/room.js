import { config } from '../config.js';
import { makeRng } from '../util/rng.js';
import { pickAvatarColor } from '../util/ids.js';
import { cleanText } from '../util/sanitize.js';
import { promptPool } from './promptPool.js';
import {
  rollChallenges,
  applyTimeModifiers,
  applyPeekModifiers,
  enforceChallenges,
  applyHandoff,
} from './challenges.js';

export const PHASE = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  REVEAL: 'reveal',
};

/** รอบคู่คือวาด รอบคี่คือทาย สลับกันไปตลอดเกม */
export const KIND = { DRAW: 'draw', GUESS: 'guess' };

export const DEFAULT_SETTINGS = {
  drawSeconds: 70,
  peekSeconds: 10, // เวลาที่ให้ดูภาพก่อนภาพหายไป
  guessSeconds: 20, // เวลาที่ให้พิมพ์คำตอบหลังภาพหาย
  maxRounds: 8,
  challenges: {
    enabled: ['no_lift', 'shaky', 'ghost_eraser', 'mirror', 'palette_lock', 'quick_peek'],
    frequency: 'medium',
    mode: 'random',
    specificRounds: [],
  },
};

const ALLOWED_EMOJI = ['😂', '😍', '🤯', '💀', '👏', '🤔', '😱', '🔥'];
export { ALLOWED_EMOJI };

/**
 * หนึ่งอินสแตนซ์ = หนึ่งห้องเกม
 *
 * กติกาของเกม (สำคัญ อ่านก่อนแก้โค้ด):
 *   รอบ 0  — ทุกคนได้คำใบ้คนละคำ วาดตามคำใบ้บนกระดาษเปล่า
 *   รอบ 1  — ได้ภาพของคนอื่นมาดูสั้น ๆ ภาพหายไป แล้วพิมพ์ว่าคิดว่าเป็นภาพอะไร
 *   รอบ 2  — ได้ "คำตอบ" ของคนก่อนหน้ามาอ่าน แล้ววาดตามนั้นบนกระดาษเปล่า (ไม่เห็นภาพเดิม ไม่เห็นคำใบ้ต้นทาง)
 *   รอบ 3  — ทายภาพนั้นอีกที ... สลับไปเรื่อย ๆ
 *
 * ความตลกเกิดจากการ "แปลภาพเป็นคำ แล้วแปลคำกลับเป็นภาพ" ซ้ำ ๆ ข้อมูลเลยเพี้ยนทีละนิด
 * ห้ามให้คนวาดเห็นภาพของรอบก่อนเด็ดขาด ไม่งั้นมันจะกลายเป็นการวาดต่อภาพเดิม ซึ่งไม่เพี้ยน
 *
 * state ทุกอย่างเป็นของเซิร์ฟเวอร์ หน้าเว็บได้รับแค่สิ่งที่ผู้เล่นคนนั้นควรเห็นเท่านั้น
 */
export class Room {
  constructor({ code, isPublic, bus, store = null }) {
    this.code = code;
    this.isPublic = isPublic;
    this.bus = bus;
    this.store = store;
    this.savePromise = null;
    this.drawingIds = new Map();

    this.phase = PHASE.LOBBY;
    this.players = new Map();
    this.hostId = null;
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.maxPlayers = isPublic ? config.maxPlayersPublic : config.maxPlayersPrivate;

    this.order = [];
    this.chains = [];
    this.round = 0;
    this.totalRounds = 0;
    this.roundEndsAt = 0;
    this.roundChallenges = [];
    this.submitted = new Set();
    this.timer = null;

    this.reveal = { stage: 'overview', chainIndex: 0, stepIndex: 0 };
    this.reactions = new Map();

    this.createdAt = Date.now();
    this.emptySince = Date.now();
  }

  // ---------- ผู้เล่น ----------

  get playerCount() {
    return this.players.size;
  }

  get isJoinable() {
    return this.phase === PHASE.LOBBY && this.playerCount < this.maxPlayers;
  }

  addPlayer({ id, name, socketId }) {
    if (this.players.has(id)) {
      const existing = this.players.get(id);
      existing.socketId = socketId;
      existing.connected = true;
      existing.disconnectedAt = null;
      return existing;
    }
    if (this.playerCount >= this.maxPlayers) return null;

    const player = {
      id,
      name,
      socketId,
      color: pickAvatarColor(this.playerCount),
      connected: true,
      disconnectedAt: null,
      joinedAt: Date.now(),
    };
    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;
    this.emptySince = null;
    return player;
  }

  markDisconnected(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.connected = false;
    p.disconnectedAt = Date.now();
    p.socketId = null;
  }

  removePlayer(playerId) {
    if (!this.players.delete(playerId)) return;
    if (this.playerCount === 0) {
      this.emptySince = Date.now();
      this.clearTimer();
      return;
    }
    if (this.hostId === playerId) {
      const next = [...this.players.values()]
        .filter((p) => p.connected)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostId = next ? next.id : [...this.players.keys()][0];
    }
  }

  isHost(playerId) {
    return this.hostId === playerId;
  }

  // ---------- ตั้งค่า ----------

  updateSettings(patch) {
    const s = this.settings;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v)));

    if (typeof patch.drawSeconds === 'number') s.drawSeconds = clamp(patch.drawSeconds, 20, 180);
    if (typeof patch.peekSeconds === 'number') s.peekSeconds = clamp(patch.peekSeconds, 3, 30);
    if (typeof patch.guessSeconds === 'number') s.guessSeconds = clamp(patch.guessSeconds, 10, 60);
    if (typeof patch.maxRounds === 'number') s.maxRounds = clamp(patch.maxRounds, 2, 25);

    if (patch.challenges) {
      const c = patch.challenges;
      if (Array.isArray(c.enabled)) s.challenges.enabled = c.enabled.slice(0, 20);
      if (typeof c.frequency === 'string') s.challenges.frequency = c.frequency;
      if (typeof c.mode === 'string') s.challenges.mode = c.mode;
      if (Array.isArray(c.specificRounds)) {
        s.challenges.specificRounds = c.specificRounds
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
          .slice(0, 25);
      }
    }
  }

  // ---------- วงจรเกม ----------

  roundKind(round = this.round) {
    return round % 2 === 0 ? KIND.DRAW : KIND.GUESS;
  }

  startGame() {
    if (this.phase !== PHASE.LOBBY) return { ok: false, error: 'เกมเริ่มไปแล้ว' };
    if (this.playerCount < 2) return { ok: false, error: 'ต้องมีผู้เล่นอย่างน้อย 2 คน' };

    this.order = [...this.players.keys()];
    this.totalRounds = Math.min(this.order.length, this.settings.maxRounds);

    const prompts = promptPool.take(this.order.length);
    this.chains = this.order.map((ownerId, i) => ({
      ownerId,
      prompt: prompts[i],
      steps: [],
    }));

    this.round = 0;
    this.reactions.clear();
    this.drawingIds = new Map();
    this.savePromise = null;
    this.phase = PHASE.PLAYING;
    this.beginRound();
    return { ok: true };
  }

  /** รอบที่ r: ผู้เล่นลำดับที่ i ทำงานบนสายหมายเลข (i + r) % N */
  chainIndexFor(playerIndex, round) {
    return (playerIndex + round) % this.order.length;
  }

  beginRound() {
    this.clearTimer();
    this.submitted.clear();

    const kind = this.roundKind();
    const rng = makeRng(`${this.code}:round:${this.round}`);
    this.roundChallenges = rollChallenges(this.round, this.totalRounds, this.settings, rng, kind);

    let seconds;
    let peekSeconds = 0;
    if (kind === KIND.DRAW) {
      seconds = applyTimeModifiers(this.settings.drawSeconds, this.roundChallenges);
    } else {
      peekSeconds = applyPeekModifiers(this.settings.peekSeconds, this.roundChallenges);
      seconds = this.settings.guessSeconds;
    }
    const totalSeconds = seconds + peekSeconds;
    this.roundEndsAt = Date.now() + totalSeconds * 1000;

    // เตรียมสิ่งที่แต่ละสายจะส่งให้คนถัดไปเห็น
    for (let c = 0; c < this.chains.length; c++) {
      const chain = this.chains[c];
      const prev = chain.steps[chain.steps.length - 1];

      if (kind === KIND.GUESS) {
        // คนทายเห็นเฉพาะภาพของรอบที่แล้วรอบเดียว ไม่ใช่ภาพสะสม
        const handoffRng = makeRng(`${this.code}:handoff:${this.round}:${c}`);
        chain.currentView = applyHandoff(prev?.strokes ?? [], this.roundChallenges, handoffRng);
        chain.currentPrompt = null;
      } else {
        // คนวาดเห็นเฉพาะข้อความ ไม่เห็นภาพใด ๆ ทั้งสิ้น
        chain.currentView = null;
        chain.currentPrompt = this.round === 0 ? chain.prompt : (prev?.text ?? '(ไม่มีคำตอบ)');
      }
    }

    // ส่งโจทย์รายคน — แต่ละคนเห็นไม่เหมือนกัน จึงส่งแยก ไม่ broadcast
    this.order.forEach((playerId, i) => {
      const chainIndex = this.chainIndexFor(i, this.round);
      const chain = this.chains[chainIndex];
      this.bus.toPlayer(playerId, 'round:begin', {
        round: this.round,
        totalRounds: this.totalRounds,
        kind,
        endsAt: this.roundEndsAt,
        seconds,
        peekSeconds,
        chainIndex,
        isFirstRound: this.round === 0,
        prompt: chain.currentPrompt,
        reference: chain.currentView,
        challenges: this.roundChallenges,
      });
    });

    this.bus.toRoom('room:state', this.snapshot());

    // ตัวจับเวลาอยู่ที่เซิร์ฟเวอร์ หน้าเว็บแค่แสดงผล — client แก้เวลาให้ตัวเองไม่ได้
    this.timer = setTimeout(() => this.finishRound(), totalSeconds * 1000 + config.submitGraceMs);
  }

  /** ตรวจเงื่อนไขร่วมของการส่งงานทั้งสองแบบ */
  #checkSubmit(playerId, expectedKind) {
    if (this.phase !== PHASE.PLAYING) return { ok: false, error: 'ตอนนี้ยังไม่ถึงช่วงส่งงาน' };
    if (this.roundKind() !== expectedKind) return { ok: false, error: 'รอบนี้ไม่ใช่รอบนั้น' };
    const i = this.order.indexOf(playerId);
    if (i === -1) return { ok: false, error: 'คุณไม่ได้อยู่ในเกมรอบนี้' };
    if (this.submitted.has(playerId)) return { ok: false, error: 'ส่งงานไปแล้ว' };
    if (Date.now() > this.roundEndsAt + config.submitGraceMs) {
      return { ok: false, error: 'หมดเวลาส่งแล้ว' };
    }
    return { ok: true, chainIndex: this.chainIndexFor(i, this.round) };
  }

  submitDrawing(playerId, strokes) {
    const check = this.#checkSubmit(playerId, KIND.DRAW);
    if (!check.ok) return check;

    this.chains[check.chainIndex].steps.push({
      kind: KIND.DRAW,
      by: playerId,
      round: this.round,
      strokes: enforceChallenges(strokes, this.roundChallenges),
      challenges: this.roundChallenges.map((c) => c.id),
    });
    return this.#afterSubmit(playerId);
  }

  submitGuess(playerId, rawText) {
    const check = this.#checkSubmit(playerId, KIND.GUESS);
    if (!check.ok) return check;

    const text = cleanText(rawText, 60);
    this.chains[check.chainIndex].steps.push({
      kind: KIND.GUESS,
      by: playerId,
      round: this.round,
      text: text || '(ไม่ได้ตอบ)',
      skipped: !text,
      challenges: this.roundChallenges.map((c) => c.id),
    });
    return this.#afterSubmit(playerId);
  }

  #afterSubmit(playerId) {
    this.submitted.add(playerId);
    this.bus.toRoom('round:progress', {
      submitted: this.submitted.size,
      total: this.order.length,
    });
    // ทุกคนส่งครบก่อนหมดเวลา — ไม่ต้องรอเวลาหมด
    if (this.submitted.size >= this.order.length) this.finishRound();
    return { ok: true };
  }

  finishRound() {
    if (this.phase !== PHASE.PLAYING) return;
    this.clearTimer();

    const kind = this.roundKind();

    // คนที่ไม่ส่ง (หลุดเน็ต / หมดเวลา) ได้ผลงานเปล่า เพื่อให้สายไม่ขาดตอน
    this.order.forEach((playerId, i) => {
      if (this.submitted.has(playerId)) return;
      const chainIndex = this.chainIndexFor(i, this.round);
      this.chains[chainIndex].steps.push({
        kind,
        by: playerId,
        round: this.round,
        strokes: kind === KIND.DRAW ? [] : undefined,
        text: kind === KIND.GUESS ? '(ไม่ได้ตอบ)' : undefined,
        challenges: this.roundChallenges.map((c) => c.id),
        skipped: true,
      });
    });

    this.round += 1;
    if (this.round >= this.totalRounds) this.startReveal();
    else this.beginRound();
  }

  // ---------- ช่วงเฉลย ----------

  startReveal() {
    this.phase = PHASE.REVEAL;
    this.reveal = { stage: 'overview', chainIndex: 0, stepIndex: 0 };

    // บันทึกลงฐานข้อมูลแบบไม่บล็อก — ถ้าฐานข้อมูลล่ม เกมต้องยังเปิดผลงานได้ตามปกติ
    if (this.store) {
      this.savePromise = this.store
        .saveGame(this)
        .then((map) => {
          this.drawingIds = map ?? new Map();
          return this.drawingIds;
        })
        .catch((err) => {
          console.error('[room] บันทึกเกมไม่สำเร็จ', err.message);
          this.drawingIds = new Map();
          return this.drawingIds;
        });
    }

    this.bus.toRoom('reveal:begin', this.revealPayload());
    this.bus.toRoom('room:state', this.snapshot());
  }

  async drawingIdFor(chainIndex, stepIndex) {
    if (this.savePromise) await this.savePromise;
    return this.drawingIds.get(`${chainIndex}:${stepIndex}`) ?? null;
  }

  /**
   * ส่งผลงานทั้งหมดทีเดียวตอนเริ่มเฉลย
   * ทำแบบนี้เพราะช่วงเฉลยเป็นการเลื่อนดู ไม่ใช่การเล่น — ถ้าส่งทีละภาพ
   * ทุกครั้งที่เจ้าของห้องกดถัดไปจะมีคนเห็นช้ากว่าคนอื่นเพราะ latency แล้วมุกจะเสีย
   */
  revealPayload() {
    return {
      chains: this.chains.map((chain, ci) => ({
        index: ci,
        prompt: chain.prompt,
        ownerName: this.players.get(chain.ownerId)?.name ?? 'ผู้เล่นที่ออกไปแล้ว',
        steps: chain.steps.map((step, si) => ({
          index: si,
          kind: step.kind,
          byName: this.players.get(step.by)?.name ?? 'ผู้เล่นที่ออกไปแล้ว',
          challenges: step.challenges,
          skipped: !!step.skipped,
          strokes: step.kind === KIND.DRAW ? step.strokes : undefined,
          text: step.kind === KIND.GUESS ? step.text : undefined,
        })),
      })),
      reactions: this.reactionSnapshot(),
    };
  }

  setRevealView(playerId, view) {
    if (this.phase !== PHASE.REVEAL) return { ok: false, error: 'ยังไม่ถึงช่วงดูผลงาน' };
    if (!this.isHost(playerId)) return { ok: false, error: 'เฉพาะเจ้าของห้องเท่านั้นที่เลื่อนได้' };

    const stage = view.stage === 'chain' ? 'chain' : 'overview';
    const chainIndex = Math.min(Math.max(0, view.chainIndex | 0), this.chains.length - 1);
    const maxStep = Math.max(0, (this.chains[chainIndex]?.steps.length ?? 1) - 1);
    const stepIndex = Math.min(Math.max(0, view.stepIndex | 0), maxStep);

    this.reveal = { stage, chainIndex, stepIndex };
    this.bus.toRoom('reveal:view', this.reveal);
    return { ok: true };
  }

  react(playerId, { chainIndex, stepIndex, emoji }) {
    if (this.phase !== PHASE.REVEAL) return { ok: false, error: 'กดอีโมจิได้ตอนดูผลงาน' };
    if (!ALLOWED_EMOJI.includes(emoji)) return { ok: false, error: 'อีโมจินี้ใช้ไม่ได้' };
    if (!this.chains[chainIndex]?.steps[stepIndex]) return { ok: false, error: 'ไม่พบผลงานนี้' };

    const key = `${chainIndex}:${stepIndex}`;
    if (!this.reactions.has(key)) this.reactions.set(key, new Map());
    const forStep = this.reactions.get(key);
    if (!forStep.has(emoji)) forStep.set(emoji, new Set());
    const voters = forStep.get(emoji);

    // กดซ้ำ = ถอนออก เก็บเป็น Set ของ playerId จึงกดรัวเพื่อปั๊มยอดไม่ได้
    const isAdding = !voters.has(playerId);
    if (isAdding) voters.add(playerId);
    else voters.delete(playerId);

    this.bus.toRoom('reveal:reaction', {
      key,
      counts: Object.fromEntries([...forStep].map(([e, set]) => [e, set.size])),
    });
    return { ok: true, isAdding };
  }

  reactionSnapshot() {
    const out = {};
    for (const [key, forStep] of this.reactions) {
      out[key] = Object.fromEntries([...forStep].map(([e, set]) => [e, set.size]));
    }
    return out;
  }

  returnToLobby(playerId) {
    if (!this.isHost(playerId)) return { ok: false, error: 'เฉพาะเจ้าของห้องเท่านั้น' };
    this.clearTimer();
    this.phase = PHASE.LOBBY;
    this.chains = [];
    this.order = [];
    this.round = 0;
    this.roundChallenges = [];
    this.submitted.clear();
    this.reactions.clear();
    this.drawingIds = new Map();
    this.savePromise = null;
    this.bus.toRoom('room:state', this.snapshot());
    return { ok: true };
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  destroy() {
    this.clearTimer();
  }

  snapshot() {
    return {
      code: this.code,
      isPublic: this.isPublic,
      phase: this.phase,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      settings: this.settings,
      round: this.round,
      totalRounds: this.totalRounds,
      roundKind: this.phase === PHASE.PLAYING ? this.roundKind() : null,
      roundEndsAt: this.phase === PHASE.PLAYING ? this.roundEndsAt : null,
      submittedCount: this.submitted.size,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: p.connected,
        isHost: p.id === this.hostId,
        hasSubmitted: this.submitted.has(p.id),
      })),
    };
  }
}
