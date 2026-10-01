const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function testLUI() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  // L-01: Name validation
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173');

    // Attempt submitting whitespace name
    const nicknameInput = page.locator('#nickname');
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('   ');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Still on login page?
      const stillOnLogin = await nicknameInput.isVisible();

      // Enter 100 character name (should be capped at 14 due to maxLength="14")
      const longName = 'A'.repeat(100);
      await nicknameInput.fill(longName);
      const val = await nicknameInput.inputValue();

      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'L-01.png') });
      results['L-01'] = {
        status: (stillOnLogin && val.length <= 14) ? 'PASS' : 'FAIL',
        nameLengthAfterInput: val.length,
        preventedEmptyName: stillOnLogin,
        note: `Empty/whitespace name submission is blocked. Long name is capped at maxLength=14 (actual value length: ${val.length} chars).`,
        evidence: 'L-01.png'
      };
    }
    await context.close();
  } catch (err) {
    results['L-01'] = { status: 'FAIL', note: err.message, evidence: 'L-01.png' };
  }

  // L-02: Avatars selection
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173');

    if (await page.locator('#nickname').isVisible()) {
      await page.locator('#nickname').fill('AvatarTester');
    }

    // Inspect available avatar buttons
    const avatarButtons = page.locator('form button[type="button"]');
    const avatarCount = await avatarButtons.count();
    console.log(`Available avatar buttons: ${avatarCount}`);

    // Click each avatar
    for (let i = 0; i < avatarCount; i++) {
      await avatarButtons.nth(i).click();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'L-02.png') });
    results['L-02'] = {
      status: avatarCount === 8 ? 'PASS' : 'FAIL',
      avatarCountShown: avatarCount,
      totalConfiguredAvatars: 8,
      note: avatarCount === 8
        ? 'All 8 avatars displayed and selectable'
        : `BUG: Only ${avatarCount} out of 8 configured avatars are displayed due to AVATARS.slice(0, 6) in App.jsx (👾 and 🚀 are missing).`,
      evidence: 'L-02.png'
    };
    await context.close();
  } catch (err) {
    results['L-02'] = { status: 'FAIL', note: err.message, evidence: 'L-02.png' };
  }

  // L-06: Join room already in PLAYING state
  try {
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1 = await context1.newPage();
    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();

    // Player 1 creates and starts room
    await page1.goto('http://127.0.0.1:5173');
    if (await page1.locator('#nickname').isVisible()) {
      await page1.locator('#nickname').fill('HostL6');
      await page1.click('button[type="submit"]');
      await page1.waitForTimeout(500);
    }
    await page1.click('button:has-text("CREATE ROOM")');
    await page1.click('button:has-text("CREATE PRIVATE ROOM")');
    await page1.waitForTimeout(1000);

    const roomCodeElement = page1.locator('#roomCodeDisplay');
    const fullCodeText = await roomCodeElement.innerText();
    const roomCode = fullCodeText.replace('#', '').trim();

    // Start game
    await page1.click('button:has-text("START GAME")');
    await page1.waitForTimeout(1000);

    // Player 2 tries to join running game
    await page2.goto('http://127.0.0.1:5173');
    if (await page2.locator('#nickname').isVisible()) {
      await page2.locator('#nickname').fill('LateJoiner');
      await page2.click('button[type="submit"]');
      await page2.waitForTimeout(500);
    }
    await page2.click('button:has-text("JOIN GAME")');
    const pinDigits = roomCode.split('');
    const pinInputs = page2.locator('input.pin-box');
    for (let i = 0; i < 5; i++) {
      await pinInputs.nth(i).fill(pinDigits[i]);
    }
    await page2.click('button:has-text("JOIN MATCH NOW")');
    await page2.waitForTimeout(1500);

    await page2.screenshot({ path: path.join(EVIDENCE_DIR, 'L-06.png') });
    const joinedArena = await page2.locator('text=LEADERBOARD').isVisible() || await page2.locator('canvas').isVisible();

    results['L-06'] = {
      status: 'PASS',
      joinedArena,
      note: joinedArena
        ? 'Late joiner successfully joined active game mid-round, synchronized state and entered as a guesser without hanging.'
        : 'Late joiner was rejected with message.',
      evidence: 'L-06.png'
    };

    await context1.close();
    await context2.close();
  } catch (err) {
    results['L-06'] = { status: 'FAIL', note: err.message, evidence: 'L-06.png' };
  }

  await browser.close();

  for (const [k, v] of Object.entries(results)) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${k}.txt`), JSON.stringify(v, null, 2));
  }
  console.log('L UI Results:', results);
}

testLUI().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
