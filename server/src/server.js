// Server Entry Point for JUST DRAW IT
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const authController = require('./controllers/authController');
const leaderboardController = require('./controllers/leaderboardController');
const roomManager = require('./gameLogic/RoomManager');
const TimerManager = require('./gameLogic/TimerManager');
const RoundManager = require('./gameLogic/RoundManager');

const { setupGameHandlers } = require('./socket/gameHandler');
const { setupDrawHandlers } = require('./socket/drawHandler');
const { setupChatHandlers } = require('./socket/chatHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const timerManager = new TimerManager(io);
const roundManager = new RoundManager(roomManager, timerManager);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../client/dist')));
app.use(express.static(path.join(__dirname, '../../client/build')));

// REST APIs
app.post('/api/auth/login', authController.loginOrRegister);
app.get('/api/leaderboard', leaderboardController.getLeaderboard);

// Socket.io connections
io.on('connection', (socket) => {
  setupGameHandlers(io, socket, timerManager, roundManager);
  setupDrawHandlers(io, socket);
  setupChatHandlers(io, socket, timerManager, roundManager);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎨 JUST DRAW IT Server listening on port ${PORT}`);
  console.log(`=======================================================`);
});
