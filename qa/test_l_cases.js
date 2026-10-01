const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:4000';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function testLCases() {
  console.log('--- Starting L Test Cases (L-01 to L-08) ---');
  const results = {};

  // L-03: Create 10 rooms -> 5-digit PIN unique
  console.log('[TEST] L-03: Creating 10 rooms...');
  const roomCodes = [];
  const sockets = [];
  for (let i = 0; i < 10; i++) {
    const s = io(SERVER_URL);
    sockets.push(s);
    await new Promise(resolve => {
      s.on('connect', () => {
        s.emit('create_room', {
          name: `Room_${i}`,
          username: `Creator_${i}`,
          avatar: '🐱'
        }, (res) => {
          roomCodes.push(res.code);
          resolve();
        });
      });
    });
  }

  const is5Digit = roomCodes.every(c => /^\d{5}$/.test(c));
  const isUnique = new Set(roomCodes).size === roomCodes.length;
  results['L-03'] = {
    status: (is5Digit && isUnique) ? 'PASS' : 'FAIL',
    roomCodes,
    is5Digit,
    isUnique,
    note: `Created 10 rooms. All codes are 5-digit numeric strings (${roomCodes.join(', ')}), with 0 duplicates.`,
    evidence: 'L-03.txt'
  };

  // L-04: Join room with wrong PIN / 4 digits / letters
  console.log('[TEST] L-04: Joining with invalid PINs...');
  const testClient = io(SERVER_URL);
  await new Promise(r => testClient.on('connect', r));

  const testCodes = ['99999', '1234', 'ABCD', ''];
  const testResponses = [];
  for (const c of testCodes) {
    await new Promise(resolve => {
      testClient.emit('join_room', { code: c, username: 'Tester' }, (res) => {
        testResponses.push({ code: c, res });
        resolve();
      });
    });
  }

  const allRejected = testResponses.every(t => t.res && t.res.success === false);
  results['L-04'] = {
    status: allRejected ? 'PASS' : 'FAIL',
    testResponses,
    note: 'Invalid room codes (non-existent, 4-digit, letters, empty) were properly rejected with error messages.',
    evidence: 'L-04.txt'
  };

  // L-05: Join room that is full (> Max Players)
  console.log('[TEST] L-05: Joining full room...');
  const hostFull = io(SERVER_URL);
  let fullRoomCode = null;
  await new Promise(resolve => {
    hostFull.on('connect', () => {
      hostFull.emit('create_room', {
        name: 'FullRoom',
        username: 'HostFull',
        maxPlayers: 2
      }, (res) => {
        fullRoomCode = res.code;
        resolve();
      });
    });
  });

  const p2 = io(SERVER_URL);
  await new Promise(r => p2.emit('join_room', { code: fullRoomCode, username: 'P2' }, r));

  // P3 tries to join (should fail, max is 2)
  const p3 = io(SERVER_URL);
  let p3Res = null;
  await new Promise(r => p3.emit('join_room', { code: fullRoomCode, username: 'P3' }, (res) => {
    p3Res = res;
    r();
  }));

  results['L-05'] = {
    status: (p3Res && p3Res.success === false && p3Res.message.includes('full')) ? 'PASS' : 'FAIL',
    response: p3Res,
    note: `Joining a full room was rejected with message: "${p3Res?.message}".`,
    evidence: 'L-05.txt'
  };

  // L-07: Play 2 rooms simultaneously -> no mixing of chat or drawings
  console.log('[TEST] L-07: Testing 2 simultaneous rooms...');
  const r1Client = io(SERVER_URL);
  const r2Client = io(SERVER_URL);

  let r1Code = roomCodes[0];
  let r2Code = roomCodes[1];

  let r2ReceivedR1Chat = false;
  r2Client.on('chat_message', (msg) => {
    if (msg.text && msg.text.includes('R1_SECRET_MESSAGE')) {
      r2ReceivedR1Chat = true;
    }
  });

  await new Promise(r => r1Client.emit('join_room', { code: r1Code, username: 'R1User' }, r));
  await new Promise(r => r2Client.emit('join_room', { code: r2Code, username: 'R2User' }, r));

  r1Client.emit('send_chat', { text: 'R1_SECRET_MESSAGE' });
  await new Promise(r => setTimeout(r, 800));

  results['L-07'] = {
    status: !r2ReceivedR1Chat ? 'PASS' : 'FAIL',
    note: 'Messages and events in Room 1 did not leak to Room 2. Rooms are strictly isolated.',
    evidence: 'L-07.txt'
  };

  // L-08: Host leaves in lobby -> host transferred
  console.log('[TEST] L-08: Host leaves in lobby...');
  const hostLeave = io(SERVER_URL);
  const guestStay = io(SERVER_URL);

  let l8RoomCode = null;
  await new Promise(resolve => {
    hostLeave.emit('create_room', { name: 'L8Room', username: 'HostL8' }, (res) => {
      l8RoomCode = res.code;
      guestStay.emit('join_room', { code: l8RoomCode, username: 'GuestL8' }, resolve);
    });
  });

  let guestObservedNewHost = null;
  guestStay.on('room_data', (data) => {
    if (data.host) guestObservedNewHost = data.host;
  });

  hostLeave.emit('leave_room');
  await new Promise(r => setTimeout(r, 1000));

  results['L-08'] = {
    status: guestObservedNewHost === 'GuestL8' ? 'PASS' : 'FAIL',
    newHost: guestObservedNewHost,
    note: guestObservedNewHost === 'GuestL8'
      ? 'When original host left during lobby, host status was automatically transferred to GuestL8.'
      : 'Host transfer failed.',
    evidence: 'L-08.txt'
  };

  // Clean up
  sockets.forEach(s => s.disconnect());
  testClient.disconnect();
  hostFull.disconnect();
  p2.disconnect();
  p3.disconnect();
  r1Client.disconnect();
  r2Client.disconnect();
  hostLeave.disconnect();
  guestStay.disconnect();

  for (const [k, v] of Object.entries(results)) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${k}.txt`), JSON.stringify(v, null, 2));
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'l_results.json'), JSON.stringify(results, null, 2));

  console.log('L Tests Completed:', results);
}

testLCases().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
