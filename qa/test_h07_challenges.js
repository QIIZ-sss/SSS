const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:4000';
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

async function testH07() {
  console.log('--- Testing H-07 Fast: Disable certain challenges and run 8 rounds ---');
  return new Promise((resolve) => {
    const hostSocket = io(SERVER_URL);
    const guestSocket = io(SERVER_URL);

    let roomCode = null;
    let roundsObserved = [];
    let currentSelectedWord = '';

    // Host creates room
    hostSocket.on('connect', () => {
      hostSocket.emit('create_room', {
        name: 'ChallengeTestRoom',
        username: 'HostTestH07',
        avatar: '🦁',
        gameMode: 'MULTIPLAYER_FFA',
        maxPlayers: 4,
        roundTime: 30,
        totalRounds: 8
      }, (res) => {
        roomCode = res.code;
        console.log(`Room created: ${roomCode}`);

        // Update settings: Disable COLOUR_FIX and DONT_LIFT_PEN, only allow NONE and GEOMETRIC_ONLY
        hostSocket.emit('update_room_settings', {
          enabledChallenges: ['NONE', 'GEOMETRIC_ONLY']
        });

        // Guest joins
        guestSocket.emit('join_room', {
          code: roomCode,
          username: 'GuestTestH07',
          avatar: '🐼'
        }, () => {
          console.log('Guest joined. Starting game...');
          hostSocket.emit('start_game');
        });
      });
    });

    const handleRoundStart = (data) => {
      console.log(`[ROUND ${data.round}] Drawer: ${data.drawer}, Challenge: ${data.challenge}`);
      roundsObserved.push(data.challenge);

      // Guess immediately if we know the word, or guess after short delay
      setTimeout(() => {
        if (data.drawer === 'HostTestH07') {
          guestSocket.emit('send_chat', { text: currentSelectedWord });
        } else {
          hostSocket.emit('send_chat', { text: currentSelectedWord });
        }
      }, 300);
    };

    hostSocket.on('round_start', handleRoundStart);

    hostSocket.on('word_selection', ({ words }) => {
      currentSelectedWord = words[0];
      console.log('Host selecting word:', currentSelectedWord);
      hostSocket.emit('select_word', { word: currentSelectedWord });
    });

    guestSocket.on('word_selection', ({ words }) => {
      currentSelectedWord = words[0];
      console.log('Guest selecting word:', currentSelectedWord);
      guestSocket.emit('select_word', { word: currentSelectedWord });
    });

    hostSocket.on('round_end', (data) => {
      console.log(`Round ended. Reason: ${data.reason}. Rounds so far: ${roundsObserved.length}`);
      if (roundsObserved.length >= 6) {
        finishTest();
      }
    });

    let finished = false;
    function finishTest() {
      if (finished) return;
      finished = true;

      const disallowedChallenges = roundsObserved.filter(c => c === 'COLOUR_FIX' || c === 'DONT_LIFT_PEN');
      const pass = disallowedChallenges.length === 0 && roundsObserved.length >= 6;

      const result = {
        status: pass ? 'PASS' : 'FAIL',
        roundsCount: roundsObserved.length,
        roundsObserved,
        disallowedFound: disallowedChallenges,
        note: pass
          ? `Observed ${roundsObserved.length} rounds. Disabled challenges (COLOUR_FIX, DONT_LIFT_PEN) were NEVER picked. Only ${[...new Set(roundsObserved)].join(', ')} were selected.`
          : `Disallowed challenges were picked: ${disallowedChallenges.join(', ')}`,
        evidence: 'H-07.txt'
      };

      console.log('H-07 Result:', result);
      fs.writeFileSync(path.join(EVIDENCE_DIR, 'H-07.txt'), JSON.stringify(result, null, 2));

      hostSocket.disconnect();
      guestSocket.disconnect();
      resolve(result);
    }

    setTimeout(() => {
      if (!finished) {
        finishTest();
      }
    }, 40000);
  });
}

testH07().then(() => process.exit(0));
