import { PROMPTS } from '../data/prompts.js';

/**
 * ถุงสุ่มคำใบ้ (shuffle bag) — อายุเท่ากับอายุของโปรเซสเซิร์ฟเวอร์
 *
 * พฤติกรรมที่ต้องการ: หยิบคำใบ้ไปเรื่อย ๆ โดยไม่ซ้ำ จนกว่าจะหมดคลัง
 * ครบ 50 คำแล้วค่อยสับใหม่ทั้งกอง (ถ้าไม่สับใหม่ เกมจะเล่นต่อไม่ได้เมื่อคำหมด)
 * รีสตาร์ตเซิร์ฟเวอร์ = ถุงถูกเทใหม่ทั้งหมด
 *
 * ถ้าย้ายไปรันหลาย instance ต้องเปลี่ยนตัวนี้ไปเก็บใน Redis
 * (ใช้ LPOP บน list ที่สับไว้แล้ว) ไม่งั้นแต่ละ instance จะมีถุงของตัวเอง
 */
class PromptPool {
  constructor(source) {
    this.source = source;
    this.bag = [];
    this.cycles = 0;
    this.refill();
  }

  refill() {
    const next = this.source.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    this.bag = next;
    this.cycles += 1;
  }

  /** หยิบคำใบ้ n คำ รับประกันว่าไม่ซ้ำกันภายในเกมเดียว */
  take(n) {
    const out = [];
    const usedThisGame = new Set();

    while (out.length < n) {
      if (this.bag.length === 0) this.refill();
      const prompt = this.bag.pop();

      // ถ้าถุงสับใหม่กลางเกม อาจเจอคำที่เพิ่งใช้ไปในเกมนี้ — ดันกลับลงถุงแล้วหยิบใหม่
      if (usedThisGame.has(prompt)) {
        this.bag.unshift(prompt);
        // กันวนไม่รู้จบเมื่อจำนวนผู้เล่นมากกว่าจำนวนคำใบ้ทั้งคลัง
        if (usedThisGame.size >= this.source.length) {
          out.push(prompt);
        }
        continue;
      }

      usedThisGame.add(prompt);
      out.push(prompt);
    }
    return out;
  }

  get remaining() {
    return this.bag.length;
  }
}

export const promptPool = new PromptPool(PROMPTS);
export const PROMPT_TOTAL = PROMPTS.length;
