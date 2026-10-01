# AI Directive: Project Updates & Bug Fixes for "JUST DRAW IT"

## Objective
Update the existing project repository according to the specifications below. Read styles and design guidelines from the `theme/` folder, implement missing screens (Lobby & Leaderboard), fix critical game start bugs, and enable granular control over Mini-Challenges.

---

## Directives & Technical Requirements

### 1. Design System & Theme Integration
- **Source Folder:** Inspect and apply styles, color palettes, fonts, and UI components from the `theme/` directory.
- **UI Style:** Follow Neo-brutalism / Playful Retro design (bold dark borders, solid drop shadows, vibrant primary/secondary accent colors).

---

## 2. Waiting Lobby Screen
- **Component:** Create/update the Room Lobby interface based on `theme/` references.
- **Key Features:**
  - Display Room Code/ID with a quick copy button.
  - Player List displaying avatar, player name, host indicator badge, and ready status.
  - Room Settings Panel (Editable by Host only; view-only for other players).
  - Prominent "START GAME" button (Visible/active for Host when player criteria are met).

---

## 3. Leaderboard Screen
- **Component:** Implement the post-game summary and global/room Leaderboard view.
- **Key Features:**
  - End-of-Game Podium (1st, 2nd, 3rd place with avatars and final scores).
  - Detailed scoreboard list showing player rankings, total correct guesses, and drawing scores.
  - "Play Again / Return to Lobby" action button for the room host.

---

## 4. Fix: Host Game Start Bug
- **Issue:** Room host is unable to start the game when clicking "START GAME".
- **Tasks:**
  - Verify socket event handling for `START_GAME` / `game:start`.
  - Ensure server validates that the requesting socket ID matches `room.hostId`.
  - Fix room state transition logic (ensure state moves smoothly from `LOBBY` to `PLAYING`).
  - Broadcast room state update to all connected clients in the room to trigger screen navigation.

---

## 5. Feature: Mini-Challenge Toggles
- **Location:** Waiting Lobby Settings Panel.
- **Host Permission:** Host can independently toggle each mini-challenge ON or OFF before starting the game:
  - `Colour Fix` (ON/OFF)
  - `Don't Lift Pen` (ON/OFF)
  - `Geometric Shapes Only` (ON/OFF)
- **Logic:** Server should only pick active (enabled) challenges when randomly assigning mini-challenges during a round.