import { z } from 'zod';
import { config } from '../config.js';
import { CHALLENGE_IDS } from '../game/challenges.js';
import { ALLOWED_EMOJI } from '../game/room.js';

/**
 * ทุก event ที่เข้ามาทาง socket ต้องผ่าน schema ตรงนี้ก่อนเสมอ
 *
 * เหตุผล: socket ไม่มี "route" ให้ middleware ดักเหมือน HTTP นักพัฒนาจึงมักลืมตรวจ input
 * แล้วเปิดช่องให้ส่ง object แปลก ๆ เข้าไปทำให้เซิร์ฟเวอร์ล่ม หรือส่ง array ยาวล้านช่องจนหน่วยความจำเต็ม
 */

const normalized = z.number().finite().min(-0.2).max(1.2);

const point = z.tuple([normalized, normalized]);

const stroke = z.object({
  points: z.array(point).min(1).max(1200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().min(1).max(80),
  tool: z.enum(['pen', 'eraser']).default('pen'),
});

export const submitSchema = z.object({
  strokes: z.array(stroke).max(config.maxStrokesPerSubmit),
});

export const guessSchema = z.object({
  text: z.string().max(60),
});

export const createRoomSchema = z.object({
  isPublic: z.boolean(),
});

export const joinRoomSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9]{6}$/),
});

export const settingsSchema = z.object({
  drawSeconds: z.number().int().min(20).max(180).optional(),
  peekSeconds: z.number().int().min(3).max(30).optional(),
  guessSeconds: z.number().int().min(10).max(60).optional(),
  maxRounds: z.number().int().min(2).max(25).optional(),
  challenges: z
    .object({
      enabled: z.array(z.enum(CHALLENGE_IDS)).max(20).optional(),
      frequency: z.enum(['off', 'low', 'medium', 'high', 'always']).optional(),
      mode: z.enum(['random', 'rounds', 'second_half']).optional(),
      specificRounds: z.array(z.number().int().min(1).max(25)).max(25).optional(),
    })
    .optional(),
});

export const revealViewSchema = z.object({
  stage: z.enum(['overview', 'chain']),
  chainIndex: z.number().int().min(0).max(99),
  stepIndex: z.number().int().min(0).max(99),
});

export const reactSchema = z.object({
  chainIndex: z.number().int().min(0).max(99),
  stepIndex: z.number().int().min(0).max(99),
  emoji: z.enum(ALLOWED_EMOJI),
});

export const kickSchema = z.object({
  playerId: z.string().min(4).max(64),
});

export const chatSchema = z.object({
  text: z.string().min(1).max(140),
});

export const reportSchema = z.object({
  chainIndex: z.number().int().min(0).max(99),
  stepIndex: z.number().int().min(0).max(99),
  reason: z.enum(['inappropriate', 'offensive', 'spam', 'other']),
});
