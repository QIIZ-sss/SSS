const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function testT02MultiRound() {
  console.log('--- Running Precise Multi-round T-02 Timer Test ---');
  const browser = await chromium.launch({ headless: true });

  const tContextHost = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tPageHost = await tContextHost.newPage();
  const tContextGuest = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tPageGuest = await tContextGuest.newPage();

  // Host logins and creates room
  await tPageHost.goto('http://127.0.0.1:5173');
  if (await tPageHost.locator('#nickname').isVisible()) {
    await tPageHost.locator('#nickname').fill('TimerHost');
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
    await tPageGuest.locator('#nickname').fill('TimerGuest');
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

  async function getTimerValue(page) {
    try {
      const timerElement = page.locator('#countdown-timer');
      if (await timerElement.isVisible()) {
        return (await timerElement.innerText()).trim();
      }
    } catch {}
    return '00:00';
  }

  // 3 Consecutive Rounds without refreshing either page
  for (let roundNum = 1; roundNum <= 3; roundNum++) {
    console.log(`\n=== Executing Round ${roundNum} ===`);
    await tPageHost.waitForTimeout(1200);

    const hostWordBtn = tPageHost.locator('.lg\\:col-span-6 button.bg-primary-container').first();
    const guestWordBtn = tPageGuest.locator('.lg\\:col-span-6 button.bg-primary-container').first();

    let secretWord = '';
    if (await hostWordBtn.isVisible()) {
      secretWord = (await hostWordBtn.innerText()).trim();
      await hostWordBtn.click();
      console.log(`[Round ${roundNum}] Host picked word: "${secretWord}"`);
    } else if (await guestWordBtn.isVisible()) {
      secretWord = (await guestWordBtn.innerText()).trim();
      await guestWordBtn.click();
      console.log(`[Round ${roundNum}] Guest picked word: "${secretWord}"`);
    }

    // Wait 3 seconds for PLAYING phase countdown to start ticking
    await tPageHost.waitForTimeout(3000);

    const hostTimer = await getTimerValue(tPageHost);
    const guestTimer = await getTimerValue(tPageGuest);

    console.log(`[Round ${roundNum}] Observed Timers -> Host: ${hostTimer} | Guest: ${guestTimer}`);

    // Take screenshot on both clients for this round
    const hostImg = `T-02_round${roundNum}_client1.png`;
    const guestImg = `T-02_round${roundNum}_client2.png`;
    await tPageHost.screenshot({ path: path.join(EVIDENCE_DIR, hostImg) });
    await tPageGuest.screenshot({ path: path.join(EVIDENCE_DIR, guestImg) });

    multiroundLog.push({
      round: roundNum,
      selectedWord: secretWord,
      hostTimer,
      guestTimer,
      timersMatch: hostTimer === guestTimer,
      screenshots: [hostImg, guestImg],
      timestamp: new Date().toISOString()
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

    // Server has a 4000ms pause between rounds in RoundManager.js
    console.log(`Waiting for turn transition to round ${roundNum + 1}...`);
    await tPageHost.waitForTimeout(5500);
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'T-02_multiround_log.json'), JSON.stringify(multiroundLog, null, 2));
  console.log('Saved multiround log to T-02_multiround_log.json:', multiroundLog);

  await tContextHost.close();
  await tContextGuest.close();
  await browser.close();
}

testT02MultiRound().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
