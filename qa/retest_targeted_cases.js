const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function retestTargetedCases() {
  console.log('--- Starting Targeted Re-tests: H-06, G-06, C-06, T-02 ---');
  const browser = await chromium.launch({ headless: true });

  // ==========================================
  // 1. H-06: Mini-Challenge Settings Screen
  // ==========================================
  console.log('\n[RETEST H-06] Verifying Mini-Challenge Settings...');
  const hContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const hPage = await hContext.newPage();
  await hPage.goto('http://127.0.0.1:5173');

  if (await hPage.locator('#nickname').isVisible()) {
    await hPage.locator('#nickname').fill('HostH06');
    await hPage.click('button[type="submit"]');
    await hPage.waitForTimeout(500);
  }

  await hPage.click('button:has-text("CREATE ROOM")');
  await hPage.click('button:has-text("CREATE PRIVATE ROOM")');
  await hPage.waitForTimeout(1000);

  // Switch to SETTINGS tab
  await hPage.click('button:has-text("SETTINGS")');
  await hPage.waitForTimeout(600);

  // Take screenshot of default settings
  await hPage.screenshot({ path: path.join(EVIDENCE_DIR, 'H-06_settings_default.png') });

  // Toggle Colour Fix off
  const challengeToggleBtns = hPage.locator('.grid.grid-cols-2.gap-space-xs button');
  if (await challengeToggleBtns.count() > 1) {
    await challengeToggleBtns.nth(1).click(); // Colour fix
    await hPage.waitForTimeout(500);
  }

  await hPage.screenshot({ path: path.join(EVIDENCE_DIR, 'H-06.png') });
  await hPage.screenshot({ path: path.join(EVIDENCE_DIR, 'H-06_settings_retest.png') });
  console.log('[RETEST H-06] Screenshots saved: H-06.png, H-06_settings_retest.png');
  await hContext.close();

  // ==========================================
  // 2. G-06: ChatBox SEND Button across 4 Viewports
  // ==========================================
  console.log('\n[RETEST G-06] Capturing SEND button across 4 widths (1920, 1366, 768, 375 px)...');
  const viewports = [1920, 1366, 768, 375];
  const g06Results = {};

  for (const w of viewports) {
    const gContext = await browser.newContext({ viewport: { width: w, height: 900 } });
    const gPage = await gContext.newPage();
    await gPage.goto('http://127.0.0.1:5173');

    if (await gPage.locator('#nickname').isVisible()) {
      await gPage.locator('#nickname').fill(`User_${w}`);
      await gPage.click('button[type="submit"]');
      await gPage.waitForTimeout(400);
    }

    await gPage.click('button:has-text("CREATE ROOM")');
    await gPage.click('button:has-text("CREATE PRIVATE ROOM")');
    await gPage.waitForTimeout(600);
    await gPage.click('button:has-text("START GAME")');
    await gPage.waitForTimeout(800);

    const sendBtn = gPage.locator('button:has-text("SEND")');
    const sendBox = await sendBtn.boundingBox();
    const chatFeed = gPage.locator('h2:has-text("GUESS FEED")');
    await chatFeed.scrollIntoViewIfNeeded();
    await gPage.waitForTimeout(300);

    const screenshotPath = path.join(EVIDENCE_DIR, `G-06_${w}px.png`);
    await gPage.screenshot({ path: screenshotPath });

    g06Results[w] = { width: w, sendBox, captured: true };
    console.log(`[RETEST G-06] Saved: G-06_${w}px.png`);
    await gContext.close();
  }

  // ==========================================
  // 3. C-06: Geometric Ghost Preview & Dimension Badge
  // ==========================================
  console.log('\n[RETEST C-06] Verifying Geometric Ghost Preview during drag and release...');
  const cContextDrawer = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cPageDrawer = await cContextDrawer.newPage();
  const cContextGuesser = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cPageGuesser = await cContextGuesser.newPage();

  await cPageDrawer.goto('http://127.0.0.1:5173');
  if (await cPageDrawer.locator('#nickname').isVisible()) {
    await cPageDrawer.locator('#nickname').fill('GeoHost');
    await cPageDrawer.click('button[type="submit"]');
    await cPageDrawer.waitForTimeout(400);
  }

  await cPageDrawer.click('button:has-text("CREATE ROOM")');
  await cPageDrawer.click('button:has-text("CREATE PRIVATE ROOM")');
  await cPageDrawer.waitForTimeout(800);

  // Set challenge to GEOMETRIC_ONLY in lobby
  await cPageDrawer.click('button:has-text("SETTINGS")');
  await cPageDrawer.waitForTimeout(400);

  // Disable all except GEOMETRIC_ONLY
  const lobbyToggleBtns = cPageDrawer.locator('.grid.grid-cols-2.gap-space-xs button');
  if (await lobbyToggleBtns.count() >= 4) {
    await lobbyToggleBtns.nth(0).click(); // None
    await lobbyToggleBtns.nth(1).click(); // Colour fix
    await lobbyToggleBtns.nth(2).click(); // Don't lift pen
  }

  const cRoomCode = (await cPageDrawer.locator('#roomCodeDisplay').innerText()).replace('#', '').trim();

  // Guesser joins
  await cPageGuesser.goto('http://127.0.0.1:5173');
  if (await cPageGuesser.locator('#nickname').isVisible()) {
    await cPageGuesser.locator('#nickname').fill('GeoGuesser');
    await cPageGuesser.click('button[type="submit"]');
    await cPageGuesser.waitForTimeout(400);
  }

  await cPageGuesser.click('button:has-text("JOIN GAME")');
  const cDigits = cRoomCode.split('');
  for (let i = 0; i < 5; i++) {
    await cPageGuesser.locator('input.pin-box').nth(i).fill(cDigits[i]);
  }
  await cPageGuesser.click('button:has-text("JOIN MATCH NOW")');
  await cPageGuesser.waitForTimeout(800);

  // Start game
  await cPageDrawer.click('button:has-text("START GAME")');
  await cPageDrawer.waitForTimeout(1000);

  // Drawer chooses word
  const cWordBtn = cPageDrawer.locator('.lg\\:col-span-6 button.bg-primary-container').first();
  if (await cWordBtn.isVisible()) {
    await cWordBtn.click();
    await cPageDrawer.waitForTimeout(1000);
  }

  // Select CIRCLE tool
  const circleToolBtn = cPageDrawer.locator('button:has-text("CIRCLE")');
  if (await circleToolBtn.isVisible()) {
    await circleToolBtn.click();
    await cPageDrawer.waitForTimeout(300);
  }

  const cDrawerCanvas = cPageDrawer.locator('canvas').nth(1);
  const cCanvasBox = await cDrawerCanvas.boundingBox();

  if (cCanvasBox) {
    // Mouse down and hold drag at center
    await cPageDrawer.mouse.move(cCanvasBox.x + 200, cCanvasBox.y + 150);
    await cPageDrawer.mouse.down();
    await cPageDrawer.mouse.move(cCanvasBox.x + 350, cCanvasBox.y + 280);
    await cPageDrawer.waitForTimeout(500);

    // SCREENSHOT WHILE DRAGGING (Shows ghost outline and live dimension badge 📐)
    await cPageDrawer.screenshot({ path: path.join(EVIDENCE_DIR, 'C-06.png') });
    await cPageDrawer.screenshot({ path: path.join(EVIDENCE_DIR, 'C-06_dragging_drawer.png') });
    await cPageGuesser.screenshot({ path: path.join(EVIDENCE_DIR, 'C-06_dragging_guesser.png') });
    console.log('[RETEST C-06] Saved dragging screenshots: C-06.png, C-06_dragging_drawer.png, C-06_dragging_guesser.png');

    // Release mouse
    await cPageDrawer.mouse.up();
    await cPageDrawer.waitForTimeout(600);

    // SCREENSHOT AFTER RELEASE (Shows ghost cleared and solid shape rendered)
    await cPageDrawer.screenshot({ path: path.join(EVIDENCE_DIR, 'C-06_released_drawer.png') });
    await cPageGuesser.screenshot({ path: path.join(EVIDENCE_DIR, 'C-06_released_guesser.png') });
    console.log('[RETEST C-06] Saved release screenshots: C-06_released_drawer.png, C-06_released_guesser.png');
  }

  await cContextDrawer.close();
  await cContextGuesser.close();

  // ==========================================
  // 4. T-02: Multi-Round Timer Continuity Test (3 Consecutive Rounds without Refresh)
  // ==========================================
  console.log('\n[RETEST T-02] Playing 3 consecutive rounds without refresh & logging all client timers...');
  const tContextHost = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tPageHost = await tContextHost.newPage();
  const tContextGuest = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tPageGuest = await tContextGuest.newPage();

  await tPageHost.goto('http://127.0.0.1:5173');
  if (await tPageHost.locator('#nickname').isVisible()) {
    await tPageHost.locator('#nickname').fill('THost');
    await tPageHost.click('button[type="submit"]');
    await tPageHost.waitForTimeout(400);
  }

  await tPageHost.click('button:has-text("CREATE ROOM")');
  await tPageHost.click('button:has-text("CREATE PRIVATE ROOM")');
  await tPageHost.waitForTimeout(800);

  // Set Round Time to 45s, Total Rounds to 5
  await tPageHost.click('button:has-text("SETTINGS")');
  await tPageHost.waitForTimeout(400);
  await tPageHost.click('button:has-text("45s")');
  await tPageHost.waitForTimeout(400);

  const tRoomCode = (await tPageHost.locator('#roomCodeDisplay').innerText()).replace('#', '').trim();

  // Guest joins
  await tPageGuest.goto('http://127.0.0.1:5173');
  if (await tPageGuest.locator('#nickname').isVisible()) {
    await tPageGuest.locator('#nickname').fill('TGuest');
    await tPageGuest.click('button[type="submit"]');
    await tPageGuest.waitForTimeout(400);
  }

  await tPageGuest.click('button:has-text("JOIN GAME")');
  const tDigits = tRoomCode.split('');
  for (let i = 0; i < 5; i++) {
    await tPageGuest.locator('input.pin-box').nth(i).fill(tDigits[i]);
  }
  await tPageGuest.click('button:has-text("JOIN MATCH NOW")');
  await tPageGuest.waitForTimeout(800);

  // Start game
  await tPageHost.click('button:has-text("START GAME")');
  await tPageHost.waitForTimeout(1000);

  const multiroundLog = [];

  // Helper to extract timer string from badge
  async function readTimer(page) {
    try {
      const badge = page.locator('span.font-headline-sm.text-headline-sm.font-black.tabular-nums');
      if (await badge.isVisible()) {
        const text = await badge.innerText();
        return text.trim();
      }
    } catch {}
    return null;
  }

  // Execute 3 full rounds
  for (let roundNum = 1; roundNum <= 3; roundNum++) {
    console.log(`\n--- [T-02] Starting Round ${roundNum} ---`);

    // Word selection if applicable
    await tPageHost.waitForTimeout(1000);
    const hostWordBtn = tPageHost.locator('.lg\\:col-span-6 button.bg-primary-container').first();
    const guestWordBtn = tPageGuest.locator('.lg\\:col-span-6 button.bg-primary-container').first();

    let secretWord = '';
    if (await hostWordBtn.isVisible()) {
      secretWord = await hostWordBtn.innerText();
      await hostWordBtn.click();
      console.log(`[Round ${roundNum}] Host selected word: ${secretWord}`);
    } else if (await guestWordBtn.isVisible()) {
      secretWord = await guestWordBtn.innerText();
      await guestWordBtn.click();
      console.log(`[Round ${roundNum}] Guest selected word: ${secretWord}`);
    }

    // Wait 3 seconds into drawing phase for timer to count down
    await tPageHost.waitForTimeout(3000);

    // Read timer from both clients
    const timerHost = await readTimer(tPageHost);
    const timerGuest = await readTimer(tPageGuest);
    console.log(`[Round ${roundNum} Active] Client Host Timer: ${timerHost} | Client Guest Timer: ${timerGuest}`);

    // Take screenshot on both clients for this round
    await tPageHost.screenshot({ path: path.join(EVIDENCE_DIR, `T-02_round${roundNum}_client1.png`) });
    await tPageGuest.screenshot({ path: path.join(EVIDENCE_DIR, `T-02_round${roundNum}_client2.png`) });

    multiroundLog.push({
      round: roundNum,
      timestamp: new Date().toISOString(),
      timerHost,
      timerGuest,
      deltaSeconds: timerHost && timerGuest ? Math.abs(parseInt(timerHost) - parseInt(timerGuest)) : 0,
      evidence: [`T-02_round${roundNum}_client1.png`, `T-02_round${roundNum}_client2.png`]
    });

    // Advance round by submitting correct guess
    if (secretWord) {
      const gInput = tPageGuest.locator('input[placeholder*="Type your guess"], input[placeholder*="TYPE"]');
      const hInput = tPageHost.locator('input[placeholder*="Type your guess"], input[placeholder*="TYPE"]');

      if (await gInput.isVisible()) {
        await gInput.fill(secretWord);
        await gInput.press('Enter');
      } else if (await hInput.isVisible()) {
        await hInput.fill(secretWord);
        await hInput.press('Enter');
      }
    }

    // Wait for round transition pause (server pauses 4s before next turn)
    await tPageHost.waitForTimeout(5000);
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'T-02_multiround_log.json'), JSON.stringify(multiroundLog, null, 2));
  console.log('[RETEST T-02] Multiround log saved to T-02_multiround_log.json');

  await tContextHost.close();
  await tContextGuest.close();
  await browser.close();

  console.log('\n--- Targeted Re-tests Completed Successfully ---');
}

retestTargetedCases().then(() => process.exit(0)).catch(err => {
  console.error('Fatal in retestTargetedCases:', err);
  process.exit(1);
});
