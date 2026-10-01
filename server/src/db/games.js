import { dbEnabled, query, transaction } from './pool.js';

/**
 * บันทึกเกมที่เล่นจบแล้วลงฐานข้อมูล
 *
 * บันทึกตอน "เริ่มเปิดผลงาน" ไม่ใช่ตอนทุกคนออกจากห้อง เพราะถ้ารอ ผู้เล่นปิดแท็บหนีก่อน
 * แล้วข้อมูลจะหาย และที่สำคัญคือปุ่มรายงานอยู่ในหน้าเปิดผลงาน — ต้องมี id ของภาพให้อ้างถึงแล้ว
 *
 * คืนค่าเป็น Map "chainIndex:stepIndex" -> drawingId เพื่อให้ปุ่มรายงานอ้างถึงภาพที่ถูกต้อง
 */
export async function saveGame(room) {
  if (!dbEnabled()) return new Map();

  return transaction(async (client) => {
    const hostName = room.players.get(room.hostId)?.name ?? null;

    const { rows: gameRows } = await client.query(
      `INSERT INTO games (room_code, is_public, host_nickname, player_count, total_rounds, settings, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        room.code,
        room.isPublic,
        hostName,
        room.order.length,
        room.totalRounds,
        JSON.stringify(room.settings),
        new Date(room.createdAt),
      ]
    );
    const gameId = gameRows[0].id;

    const idMap = new Map();

    for (let ci = 0; ci < room.chains.length; ci++) {
      const chain = room.chains[ci];
      const { rows: chainRows } = await client.query(
        `INSERT INTO chains (game_id, chain_index, prompt, owner_nickname)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [gameId, ci, chain.prompt, room.players.get(chain.ownerId)?.name ?? null]
      );
      const chainId = chainRows[0].id;

      for (let si = 0; si < chain.steps.length; si++) {
        const step = chain.steps[si];
        // แต่ละขั้นเป็นอิสระจากกัน — ภาพวาดบนกระดาษเปล่า หรือคำตอบหนึ่งบรรทัด
        // ไม่มีภาพสะสมอีกแล้ว เพราะกติกาใหม่คนวาดไม่เคยเห็นภาพของรอบก่อน
        const { rows } = await client.query(
          `INSERT INTO drawings
             (chain_id, step_index, round_no, kind, guess_text, player_id, nickname, strokes, challenges, skipped)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            chainId,
            si,
            step.round,
            step.kind ?? 'draw',
            step.kind === 'guess' ? step.text : null,
            step.by,
            room.players.get(step.by)?.name ?? null,
            JSON.stringify(step.strokes ?? []),
            step.challenges ?? [],
            !!step.skipped,
          ]
        );
        idMap.set(`${ci}:${si}`, rows[0].id);
      }
    }

    return idMap;
  });
}

export async function touchPlayer(playerId, nickname) {
  if (!dbEnabled()) return;
  await query(
    `INSERT INTO players (player_id, nickname) VALUES ($1, $2)
     ON CONFLICT (player_id) DO UPDATE SET nickname = EXCLUDED.nickname, last_seen = now()`,
    [playerId, nickname]
  );
}

/** กดอีโมจิ = เพิ่มแถว, กดซ้ำ = ลบแถว */
export async function toggleReaction(drawingId, playerId, emoji, isAdding) {
  if (!dbEnabled() || !drawingId) return;
  if (isAdding) {
    await query(
      `INSERT INTO reactions (drawing_id, player_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [drawingId, playerId, emoji]
    );
  } else {
    await query(
      `DELETE FROM reactions WHERE drawing_id = $1 AND player_id = $2 AND emoji = $3`,
      [drawingId, playerId, emoji]
    );
  }
}

// ---------- อ่านข้อมูลสำหรับหน้าแอดมิน ----------

export async function listGames({ limit = 30, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT g.id, g.room_code, g.is_public, g.host_nickname, g.player_count,
            g.total_rounds, g.started_at, g.finished_at,
            (SELECT count(*) FROM chains c WHERE c.game_id = g.id) AS chain_count
     FROM games g
     ORDER BY g.finished_at DESC
     LIMIT $1 OFFSET $2`,
    [Math.min(limit, 100), offset]
  );
  return rows;
}

export async function getGameDetail(gameId) {
  const { rows: games } = await query(`SELECT * FROM games WHERE id = $1`, [gameId]);
  if (!games.length) return null;

  const { rows } = await query(
    `SELECT c.chain_index, c.prompt, c.owner_nickname,
            d.id AS drawing_id, d.step_index, d.round_no, d.nickname,
            d.kind, d.guess_text, d.strokes, d.challenges, d.skipped, d.removed_at
     FROM chains c
     JOIN drawings d ON d.chain_id = c.id
     WHERE c.game_id = $1
     ORDER BY c.chain_index, d.step_index`,
    [gameId]
  );

  const chains = [];
  for (const row of rows) {
    if (!chains[row.chain_index]) {
      chains[row.chain_index] = {
        index: row.chain_index,
        prompt: row.prompt,
        ownerName: row.owner_nickname,
        steps: [],
      };
    }
    chains[row.chain_index].steps.push({
      drawingId: row.drawing_id,
      index: row.step_index,
      round: row.round_no,
      kind: row.kind,
      text: row.guess_text,
      byName: row.nickname,
      // ภาพที่ถูกลบจะไม่ถูกส่งออกไปอีก แม้ในหน้าแอดมิน
      strokes: row.removed_at ? [] : row.strokes,
      challenges: row.challenges,
      skipped: row.skipped,
      removed: !!row.removed_at,
    });
  }
  return { game: games[0], chains: chains.filter(Boolean) };
}

export async function removeDrawing(drawingId, reason) {
  const { rowCount } = await query(
    `UPDATE drawings
     SET strokes = '[]'::jsonb, removed_at = now(), removed_reason = $2
     WHERE id = $1 AND removed_at IS NULL`,
    [drawingId, reason]
  );
  return rowCount > 0;
}

export async function dashboardStats() {
  if (!dbEnabled()) return null;
  const { rows } = await query(`
    SELECT
      (SELECT count(*) FROM games)                                              AS games_total,
      (SELECT count(*) FROM games WHERE finished_at > now() - interval '24 hours') AS games_today,
      (SELECT count(*) FROM drawings)                                           AS drawings_total,
      (SELECT count(*) FROM drawings WHERE removed_at IS NOT NULL)              AS drawings_removed,
      (SELECT count(*) FROM reports WHERE status = 'open')                      AS reports_open,
      (SELECT count(*) FROM players)                                            AS players_total,
      (SELECT count(*) FROM bans WHERE expires_at IS NULL OR expires_at > now()) AS bans_active
  `);
  return rows[0];
}

/** คำใบ้ที่ถูกใช้บ่อยที่สุด ใช้ดูว่าถุงสุ่มกระจายดีไหม */
export async function promptUsage(limit = 12) {
  const { rows } = await query(
    `SELECT prompt, count(*)::int AS uses
     FROM chains GROUP BY prompt ORDER BY uses DESC, prompt LIMIT $1`,
    [limit]
  );
  return rows;
}
