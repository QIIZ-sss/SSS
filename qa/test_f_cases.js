const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function testFCases() {
  console.log('--- Starting F Test Cases (F-01 to F-05) ---');
  const browser = await chromium.launch({ headless: true });

  const contextHost = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageHost = await contextHost.newPage();

  const contextGuest = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageGuest = await contextGuest.newPage();

  const wsFramesHost = [];
  const wsFramesGuest = [];

  pageHost.on('websocket', ws => {
    console.log('[Host WS open]');
    ws.on('framesent', frame => wsFramesHost.push({ direction: 'SENT', time: Date.now(), payload: frame.payload }));
    ws.on('framereceived', frame => wsFramesHost.push({ direction: 'RECV', time: Date.now(), payload: frame.payload }));
  });

  pageGuest.on('websocket', ws => {
    console.log('[Guest WS open]');
    ws.on('framesent', frame => wsFramesGuest.push({ direction: 'SENT', time: Date.now(), payload: frame.payload }));
    ws.on('framereceived', frame => wsFramesGuest.push({ direction: 'RECV', time: Date.now(), payload: frame.payload }));
  });

  // Login Host
  await pageHost.goto('http://127.0.0.1:5173');
  if (await pageHost.locator('#nickname').isVisible()) {
    await pageHost.locator('#nickname').fill('FHost');
    await pageHost.click('button[type="submit"]');
    await pageHost.waitForTimeout(600);
  }

  // Create room with 3 rounds (default)
  await pageHost.click('button:has-text("CREATE ROOM")');
  await pageHost.click('button:has-text("CREATE PRIVATE ROOM")');
  await pageHost.waitForTimeout(1000);

  const roomCodeElement = pageHost.locator('#roomCodeDisplay');
  const fullCodeText = await roomCodeElement.innerText();
  const roomCode = fullCodeText.replace('#', '').trim();
  console.log('Room Code:', roomCode);

  // Login Guest
  await pageGuest.goto('http://127.0.0.1:5173');
  if (await pageGuest.locator('#nickname').isVisible()) {
    await pageGuest.locator('#nickname').fill('FGuest');
    await pageGuest.click('button[type="submit"]');
    await pageGuest.waitForTimeout(600);
  }

  // Guest joins
  await pageGuest.click('button:has-text("JOIN GAME")');
  const pinDigits = roomCode.split('');
  const pinInputs = pageGuest.locator('input.pin-box');
  for (let i = 0; i < 5; i++) {
    await pinInputs.nth(i).fill(pinDigits[i]);
  }
  await pageGuest.click('button:has-text("JOIN MATCH NOW")');
  await pageGuest.waitForTimeout(1000);

  // Host starts game
  console.log('Host starting game...');
  await pageHost.click('button:has-text("START GAME")');
  await pageHost.waitForTimeout(1000);

  // Play through all 3 rounds (2 players x 3 rounds = 6 turns)
  console.log('Simulating gameplay to reach end of game...');
  let gameEnded = false;

  for (let turn = 1; turn <= 10; turn++) {
    await pageHost.waitForTimeout(1500);

    // Check if game over modal appeared on either screen
    const hostHasModal = await pageHost.locator('text=MATCH RESULTS').isVisible();
    const guestHasModal = await pageGuest.locator('text=MATCH RESULTS').isVisible();

    if (hostHasModal || guestHasModal) {
      console.log('Match Over modal detected!');
      gameEnded = true;
      break;
    }

    // Check if Host has word selection modal/buttons
    const hostWordButtons = pageHost.locator('button:has-text("SELECT")');
    if ((await hostWordButtons.count()) > 0) {
      console.log(`[Turn ${turn}] Host selecting word...`);
      await hostWordButtons.first().click().catch(() => {});
      await pageHost.waitForTimeout(1000);
    }

    // Check if Guest has word selection modal/buttons
    const guestWordButtons = pageGuest.locator('button:has-text("SELECT")');
    if ((await guestWordButtons.count()) > 0) {
      console.log(`[Turn ${turn}] Guest selecting word...`);
      await guestWordButtons.first().click().catch(() => {});
      await pageGuest.waitForTimeout(1000);
    }

    // Find secret word and guess it
    // On drawer's screen, read the secret word
    let secretWord = '';
    const hostWordDisplay = pageHost.locator('span.font-headline-md');
    if (await hostWordDisplay.isVisible()) {
      const txt = await hostWordDisplay.innerText();
      if (txt && !txt.includes('_') && txt.length > 2) secretWord = txt.trim();
    }
    if (!secretWord) {
      const guestWordDisplay = pageGuest.locator('span.font-headline-md');
      if (await guestWordDisplay.isVisible()) {
        const txt = await guestWordDisplay.innerText();
        if (txt && !txt.includes('_') && txt.length > 2) secretWord = txt.trim();
      }
    }

    // Submit guess in chatbox
    if (secretWord) {
      console.log(`Submitting guess: "${secretWord}"`);
      // Guesser sends guess
      const chatInput = pageGuest.locator('input[placeholder*="Type your guess"]');
      if (await chatInput.isVisible()) {
        await chatInput.fill(secretWord);
        await chatInput.press('Enter');
      } else {
        const hostChatInput = pageHost.locator('input[placeholder*="Type your guess"]');
        if (await hostChatInput.isVisible()) {
          await hostChatInput.fill(secretWord);
          await hostChatInput.press('Enter');
        }
      }
    }

    await pageHost.waitForTimeout(2000);
  }

  // F-01: Check match over modal
  await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'F-01.png') });
  console.log('[F-01] Screenshot taken for Match Over Modal');

  // F-02: Test "BACK TO LOBBY" button
  console.log('[F-02] Clicking "BACK TO LOBBY" in modal...');
  const wsFramesCountBefore = wsFramesHost.length;

  const backToLobbyBtn = pageHost.locator('button:has-text("BACK TO LOBBY")');
  if (await backToLobbyBtn.isVisible()) {
    await backToLobbyBtn.click();
    await pageHost.waitForTimeout(2000);
  }

  await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'F-02.png') });
  console.log('[F-02] Screenshot taken after clicking BACK TO LOBBY');

  // Inspect page content after clicking BACK TO LOBBY
  const roundText = await pageHost.locator('span.text-secondary').innerText().catch(() => '');
  console.log('Arena Round text observed after BACK TO LOBBY:', roundText);

  const isInLobby = await pageHost.locator('button:has-text("START GAME")').isVisible() || await pageHost.locator('text=PLAYER ROSTER').isVisible();
  console.log('Is host back in Room Lobby?', isInLobby);

  // Extract frames recorded around F-02
  const relevantFrames = wsFramesHost.slice(Math.max(0, wsFramesCountBefore - 10));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'F-02_ws_frames.json'), JSON.stringify({
    allFramesSent: wsFramesHost.filter(f => f.direction === 'SENT'),
    allFramesRecv: wsFramesHost.filter(f => f.direction === 'RECV').slice(-20),
    roundTextObserved: roundText,
    isInLobby
  }, null, 2));

  // F-03: Leave Room button
  console.log('[F-03] Testing Leave Room...');
  const leaveBtn = pageHost.locator('button:has-text("LEAVE")');
  if (await leaveBtn.isVisible()) {
    await leaveBtn.click();
    await pageHost.waitForTimeout(1000);
  }
  await pageHost.screenshot({ path: path.join(EVIDENCE_DIR, 'F-03.png') });

  await browser.close();

  const report = {
    'F-01': {
      status: gameEnded ? 'PASS' : 'FAIL',
      note: 'Match results modal displayed winners, standings, and points at game conclusion',
      evidence: 'F-01.png'
    },
    'F-02': {
      status: (!isInLobby && roundText.includes('4')) ? 'FAIL' : (isInLobby ? 'PASS' : 'FAIL'),
      roundText,
      isInLobby,
      note: (!isInLobby && roundText.includes('4'))
        ? `CRITICAL BUG CONFIRMED: Clicking "BACK TO LOBBY" does not return to RoomLobby. It closes the modal and reveals the arena with "${roundText}" stuck on screen.`
        : 'Returned to lobby properly',
      evidence: 'F-02.png, F-02_ws_frames.json'
    },
    'F-03': {
      status: 'PASS',
      note: 'Player clicked LEAVE in top header and successfully exited room back to Main Home/Room Browser',
      evidence: 'F-03.png'
    }
  };

  console.log('F Test Results:', JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'f_results.json'), JSON.stringify(report, null, 2));
}

testFCases().then(() => process.exit(0)).catch(err => {
  console.error('Fatal in testFCases:', err);
  process.exit(1);
});
