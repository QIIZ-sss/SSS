# 🎨 Drawing & Guessing Game (Multiplayer & AI)

Multiplayer Drawing & Guessing Game built in Node.js, Express, Socket.io, React, and Canvas API following the Software Requirement Specification (SRS).

## 🚀 Features & Game Mechanics

### 1. Scoring & Rules
* **Drawer Scoring:** `Drawer Score = Base Points × (Correct Guessers / Total Guessers)`
* **Guesser Scoring:** Speed-based decaying points reward fast correct guesses.
* **Answer Concealment:** Notifies `คุณ [Name] ทายถูกแล้ว!` without spoiling the secret answer string until the round concludes or all guessers finish.

### 2. Mini-Challenges System (Randomized per round)
1. **Colour Fix:** Restricts drawing palette to a single locked color.
2. **Don't Lift Pen:** Requires a single continuous stroke; lifting pen locks drawing until cleared.
3. **Geometric Shapes Only:** Restricts tools to geometric primitives (Circle, Rectangle, Triangle, Line).

### 3. Game Modes
* **Multi-Room Free-for-All:** Multi-room lobby system with individual user score accumulation.
* **Solo with AI Mode:** Real-time AI guessing canvas evaluator (scores excluded from total global leaderboard per SRS).
* **Team Mode:** Red vs Blue team battles with combined team scoring.

### 4. Leaderboard & Chat System
* **Real-time Chat & Guessing:** Text validation hides answers from players who haven't guessed yet.
* **Global Leaderboard:** Filterable by match game modes.

---

## 🛠️ Project Structure

```text
Project/
├── client/                     # Frontend (React + Vite + Socket.io Client)
│   ├── src/
│   │   ├── components/         # Canvas, ChatBox, Leaderboard, RoomList, ChallengeOverlay
│   │   ├── gameModes/          # SoloAIGame, MultiplayerGame, TeamGame
│   │   ├── services/           # socket.js connection
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
├── server/                     # Backend (Express + Socket.io Server)
│   ├── src/
│   │   ├── config/             # database.js
│   │   ├── controllers/        # authController, leaderboardController
│   │   ├── socket/             # roomHandler, drawHandler, gameLoopHandler
│   │   ├── models/             # User, Score, Word
│   │   ├── utils/              # aiPredictor.js
│   │   └── server.js
│   └── package.json
├── shared/                     # Shared Constants & Utility Logic
│   ├── constants.js
│   └── utils.js
└── README.md
```

---

## ⚡ How to Run

1. **Install Dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Start Backend Server:**
   ```bash
   cd server
   npm start
   ```

3. **Start Frontend Client:**
   ```bash
   cd client
   npm run dev
   ```
