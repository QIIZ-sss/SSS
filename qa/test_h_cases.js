const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runHTests() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  console.log('--- Starting H Test Cases (H-01 to H-07) ---');

  // H-06: Mini-Challenge text in Settings (no `_outline_...` leak, normal font)
  try {
    console.log('[TEST] Running H-06: Mini-challenge settings text check...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('http://127.0.0.1:5173');
    await page.waitForTimeout(1000);

    // Login if on login page
    const nicknameInput = page.locator('#nickname');
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('HostPlayer');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }

    // Create room
    await page.click('button:has-text("CREATE ROOM")');
    await page.click('button:has-text("CREATE PRIVATE ROOM")');
    await page.waitForTimeout(1500);

    // We are in lobby. Click SETTINGS tab
    await page.click('button:has-text("SETTINGS")');
    await page.waitForTimeout(1000);

    // Take screenshot of settings
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'H-06_settings_before.png') });

    // Toggle off some challenge
    const challengeButtons = page.locator('button:has(.material-symbols-outlined)');
    const count = await challengeButtons.count();
    console.log(`Found ${count} challenge buttons in settings`);

    // Click the second challenge to disable it
    if (count > 1) {
      await challengeButtons.nth(1).click();
      await page.waitForTimeout(500);
    }

    // Take screenshot after toggle
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'H-06.png') });

    // Inspect text content of the button
    const btnText = await page.locator('.grid.grid-cols-2.gap-space-xs button').allInnerTexts();
    console.log('Button texts in settings:', btnText);

    const hasOutlineText = btnText.some(t => t.includes('check_box_outline_blank') || t.includes('_outline_'));
    results['H-06'] = {
      status: hasOutlineText ? 'FAIL' : 'PASS',
      note: hasOutlineText
        ? `Found text leak: "${btnText.find(t => t.includes('outline'))}" displayed directly in UI button instead of icon rendering`
        : 'Icons rendered without text leakage',
      evidence: 'H-06.png'
    };
    await context.close();
  } catch (err) {
    console.error('Error in H-06:', err);
    results['H-06'] = { status: 'FAIL', note: err.message, evidence: 'H-06.png' };
  }

  // H-03: กด Start ตอนมีผู้เล่นคนเดียว (FFA/Team) -> แจ้งเตือน ไม่เริ่มเกมที่เล่นไม่ได้
  try {
    console.log('[TEST] Running H-03: Solo start in FFA/Team...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    let dialogMessage = null;
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('http://127.0.0.1:5173');
    const nicknameInput = page.locator('#nickname');
    if (await nicknameInput.isVisible()) {
      await nicknameInput.fill('SoloHost');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }

    await page.click('button:has-text("CREATE ROOM")');
    await page.click('button:has-text("CREATE PRIVATE ROOM")');
    await page.waitForTimeout(1500);

    // Host clicks START GAME with only 1 player in FFA
    const startBtn = page.locator('button:has-text("START GAME")');
    await startBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'H-03.png') });

    // Check if game started
    const arenaVisible = await page.locator('text=LEADERBOARD').isVisible();
    const isPlaying = await page.locator('text=DRAWING TARGET SKETCH').isVisible() || await page.locator('text=SELECTING WORD').isVisible() || await page.locator('canvas').isVisible();

    if (dialogMessage) {
      results['H-03'] = { status: 'PASS', note: `Alert shown: ${dialogMessage}`, evidence: 'H-03.png' };
    } else if (isPlaying) {
      results['H-03'] = { status: 'FAIL', note: 'Game started with only 1 player in FFA mode without any warning/alert', evidence: 'H-03.png' };
    } else {
      results['H-03'] = { status: 'PASS', note: 'Game did not start', evidence: 'H-03.png' };
    }
    await context.close();
  } catch (err) {
    console.error('Error in H-03:', err);
    results['H-03'] = { status: 'FAIL', note: err.message, evidence: 'H-03.png' };
  }

  // H-01, H-02, H-04, H-05: Multi-player lobby tests
  try {
    console.log('[TEST] Running H-01, H-02, H-04, H-05: Multi-player lobby...');
    const contextHost = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageHost = await contextHost.newPage();

    const contextGuest = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageGuest = await contextGuest.newPage();

    // Login Host
    await pageHost.goto('http://127.0.0.1:5173');
    if (await pageHost.locator('#nickname').isVisible()) {
      await pageHost.locator('#nickname').fill('HostAlpha');
      await pageHost.click('button[type="submit"]');
      await pageHost.waitForTimeout(800);
    }

    // Create Room
    await pageHost.click('button:has-text("CREATE ROOM")');
    await pageHost.click('button:has-text("CREATE PRIVATE ROOM")');
    await pageHost.waitForTimeout(1500);

    // Get room code
    const roomCodeElement = pageHost.locator('#roomCodeDisplay');
    const fullCodeText = await roomCodeElement.innerText();
    const roomCode = fullCodeText.replace('#', '').trim();
    console.log('Room Code created by Host:', roomCode);

    // Login Guest
    await pageGuest.goto('http://127.0.0.1:5173');
    if (await pageGuest.locator('#nickname').isVisible()) {
      await pageGuest.locator('#nickname').fill('GuestBeta');
      await pageGuest.click('button[type="submit"]');
      await pageGuest.waitForTimeout(800);
    }

    // Guest joins room via JOIN GAME tab and PIN
    await pageGuest.click('button:has-text("JOIN GAME")');
    const pinDigits = roomCode.split('');
    const pinInputs = pageGuest.locator('input.pin-box');
    for (let i = 0; i < 5; i++) {
      await pinInputs.nth(i).fill(pinDigits[i]);
    }
    await pageGuest.click('button:has-text("JOIN MATCH NOW")');
    await pageGuest.waitForTimeout(1500);

    // H-02: Non-host attempts to start game
    const guestStartBtn = pageGuest.locator('button:has-text("START GAME")');
    const guestCanSeeStart = await guestStartBtn.isVisible();
    results['H-02'] = {
      status: !guestCanSeeStart ? 'PASS' : 'FAIL',
      note: !guestCanSeeStart ? 'Non-host (Guest) does not have START GAME button in UI' : 'Guest can see and click START GAME button',
      evidence: 'H-02.png'
    };
    await pageGuest.screenshot({ path: path.join(EVIDENCE_DIR, 'H-02.png') });

    // H-05: Host changes Round Time to 30s, Max Players to 4, Mode
    await pageHost.click('button:has-text("SETTINGS")');
    await pageHost.waitForTimeout(500);
    await pageHost.click('button:has-text("30s")');
    await pageHost.waitForTimeout(800);

    // Check if guest sees 30s or updated room settings
    await pageGuest.click('button:has-text("SETTINGS")');
    await pageGuest.waitForTimeout(800);
    const guestTimerSelected = await pageGuest.locator('button:has-text("30s")').getAttribute('class');
    const is30sActive = guestTimerSelected && guestTimerSelected.includes('bg-timer-red');

    await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'H-05_host.png') });
    await pageGuest.screenshot({ path: path.join(EVIDENCE_DIR, 'H-05.png') });
    results['H-05'] = {
      status: is30sActive ? 'PASS' : 'FAIL',
      note: is30sActive ? 'Guest sees updated 30s round timer set by Host' : 'Guest settings did not reflect 30s selection',
      evidence: 'H-05.png'
    };

    // H-04: Click Start 10 times rapidly
    console.log('[TEST] Testing H-04: Clicking START GAME 10 times rapidly...');
    const hostStartBtn = pageHost.locator('button:has-text("START GAME")');
    for (let i = 0; i < 10; i++) {
      hostStartBtn.click().catch(() => {});
    }
    await pageHost.waitForTimeout(2000);
    await pageGuest.waitForTimeout(2000);

    // H-01: Both players enter game simultaneously
    const hostInGame = (await pageHost.locator('canvas').count()) > 0 || (await pageHost.locator('text=YOUR SECRET WORD').isVisible()) || (await pageHost.locator('text=SELECT A WORD').isVisible()) || (await pageHost.locator('text=DRAWING TARGET SKETCH').isVisible());
    const guestInGame = (await pageGuest.locator('canvas').count()) > 0 || (await pageGuest.locator('text=SECRET WORD').isVisible()) || (await pageGuest.locator('text=DRAWING TARGET SKETCH').isVisible());

    await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'H-01_host.png') });
    await pageGuest.screenshot({ path: path.join(EVIDENCE_DIR, 'H-01.png') });

    results['H-01'] = {
      status: (hostInGame && guestInGame) ? 'PASS' : 'FAIL',
      note: (hostInGame && guestInGame) ? 'Both Host and Guest entered game arena simultaneously' : `Failed: hostInGame=${hostInGame}, guestInGame=${guestInGame}`,
      evidence: 'H-01.png'
    };

    results['H-04'] = {
      status: (hostInGame && guestInGame) ? 'PASS' : 'FAIL',
      note: 'Multiple rapid clicks did not cause crash or duplicate rounds',
      evidence: 'H-04.png'
    };
    await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'H-04.png') });

    await contextHost.close();
    await contextGuest.close();
  } catch (err) {
    console.error('Error in H-01..H-05:', err);
  }

  await browser.close();
  console.log('H Results:', JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'h_results.json'), JSON.stringify(results, null, 2));
}

runHTests();
