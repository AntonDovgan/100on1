# 100 к одному (100 to 1)

Real-time multiplayer browser game inspired by the TV show "Family Feud" (Russian: "Сто к одному"), designed for corporate events and parties. Players join from their phones, a host controls the game from a tablet or laptop.

> **Язык интерфейса:** русский. Игра создана для корпоративного праздника 8 Марта.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [How to Play](#how-to-play)
- [Admin Controls](#admin-controls)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Questions](#questions)
- [Deployment](#deployment)
- [Browser Support](#browser-support)
- [Troubleshooting](#troubleshooting)

## Features

- **Real-time multiplayer** — 20+ players connect simultaneously via WebSockets
- **Mobile-first** — optimized for phones (players) and tablets/laptops (admin)
- **Admin as arbiter** — answers are spoken aloud; the host judges correctness
- **5 game rounds** — Simple, Double, Triple, Reverse, and Big Game
- **Sound effects** — buzzer, correct/wrong, applause, timer (8 sound effects)
- **Public display** — fullscreen spectator view for projector/TV (`/display`)
- **Auto-reconnection** — players rejoin seamlessly via `localStorage` session persistence
- **Festive 8 March theme** — pink/gold/purple palette with animated flower petals and confetti
- **Server-authoritative** — timers and buzzer resolution run on the server to prevent cheating

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Monorepo | pnpm workspaces | 10.x |
| Frontend | React + TypeScript | 19.x + 5.x |
| Build | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Sound | Howler.js | 2.x |
| Backend | Node.js + Express | 5.x |
| Real-time | Socket.IO | 4.x |
| Effects | canvas-confetti | 1.x |
| Storage | In-memory + JSON file backup | — |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+

### Installation

```bash
git clone <repository-url>
cd 100on1
pnpm install
```

### Development

Starts the server (port 3001) and client dev server (port 5173) with hot reload:

```bash
pnpm dev
```

- Players: `http://localhost:5173`
- Admin panel: `http://localhost:5173/admin`
- Public display (TV/projector): `http://localhost:5173/display`

### Production

Build and serve everything from a single port:

```bash
pnpm serve
```

All clients connect to `http://localhost:3001`.

### Internet Access (Cloudflare Tunnel)

Make the game accessible from anywhere without deploying to a cloud provider:

```bash
# Requires: brew install cloudflared
pnpm tunnel
```

This builds the client, starts the server, and creates a public tunnel. Share the generated URL with players.

## How to Play

### Roles

| Role | Access | Description |
|------|--------|-------------|
| **Player** | Open the game link | Joins by entering a name — no registration or passwords |
| **Admin (Host)** | `/admin` route | Controls the game flow from a separate device |
| **Public Display** | `/display` route | Spectator view for a projector/TV — shows game progress to everyone |

> **Default admin password:** `admin8march` (change via `ADMIN_PASSWORD` env var before the event).

### Game Flow

```
Registration → Team Assignment → Round 1 (x1) → Round 2 (x2) → Round 3 (x3) → Round 4 (Reverse) → Round 5 (Big Game) → Results
```

1. **Registration** — players open the link and enter their names
2. **Team Assignment** — admin shuffles players into two teams ("Тюльпаны" and "Розы"), with manual adjustment available
3. **Rounds 1–3** — standard rounds with increasing multipliers
4. **Round 4** — reverse round
5. **Round 5** — Big Game finale

### Round Types

#### Simple Game (Round 1, x1)

Two teams compete to guess the most popular survey answers.

1. **Buzzer race** — one player from each team taps the buzzer; the fastest team goes first
2. **Answering** — the winning team's members take turns guessing answers (spoken aloud, admin judges)
3. **Strikes** — wrong answer = strike (X). After **3 strikes**, the round moves to steal
4. **Steal attempt** — the opposing team gets **one chance** to name a correct answer and steal **all** accumulated round points
5. If all answers are revealed before 3 strikes, the answering team wins the round points

#### Double Game (Round 2, x2)

Same rules as the Simple Game, but all points are **doubled**.

#### Triple Game (Round 3, x3)

Same rules as the Simple Game, but all points are **tripled**.

#### Reverse Game (Round 4)

The goal is reversed — find the **least** popular answer to score more points. Each team member answers in turn. Points are awarded based on answer popularity:

| Position | Points |
|----------|--------|
| 1st (most popular) | 15 |
| 2nd | 30 |
| 3rd | 60 |
| 4th | 120 |
| 5th | 180 |
| 6th (least popular) | 240 |

#### Big Game (Round 5)

The winning team selects 2 players for the finale:

| | Player 1 | Player 2 |
|-|----------|----------|
| Questions | 5 | 5 (same questions) |
| Time per question | 15 seconds | 20 seconds |
| Sees other's answers | — | No |

- If Player 2 duplicates an answer from Player 1, they must provide a different one
- Combined goal: score **200+ points** to win the Big Game

### Scoring

- Teams accumulate points across all rounds
- In rounds 1–3, the round winner gets all revealed answer points multiplied by the round multiplier (x1 / x2 / x3)
- Each question has **6 answers** sorted by popularity (most popular = most points)
- The team with the highest total score after round 4 sends players to the Big Game

## Admin Controls

The admin panel provides context-sensitive controls for each game phase:

| Phase | Controls |
|-------|---------|
| Registration | View connected players, wait for everyone to join |
| Team Assignment | Shuffle teams, move individual players between teams, confirm |
| Buzzer Race | Open buzzer for both teams |
| Team Answering | Reveal specific answers by number, mark strikes |
| Steal Attempt | Start steal, award round to winning team |
| Reverse Game | Select which answer a player gave, assign points |
| Big Game | Select 2 players, start timer, mark points per question |
| Any phase | Override team scores (+10/−10), full game reset |

## Architecture

### State Machine

```
registration ──► teamReveal ──► roundIntro ──► buzzerRace ──► teamAnswering
                                                                  │
                                                    ┌─ all found ─┤
                                                    ▼             ▼
                                               roundResult ◄── stealAttempt
                                                    │
                                              (next round)
                                                    │
Round 4:  roundIntro ──► reverseAnswering ──► roundResult
Round 5:  bigGamePlayer1 ──► bigGamePlayer2 ──► bigGameReveal ──► gameOver
```

### Key Design Decisions

- **Admin as arbiter**: answers are spoken aloud at the party — the server does NOT validate answers automatically. The admin hears the answer and presses "Reveal" or "Strike".
- **Server-authoritative timers**: Big Game countdown runs on the server to prevent client-side manipulation.
- **First-tap-wins buzzer**: server resolves buzzer race using timestamps with a mutex-like flag to prevent race conditions.
- **Singleton state**: `GameState` class is a singleton with change listeners; every mutation triggers a broadcast to all connected clients.
- **JSON persistence**: game state is periodically saved to a JSON file for crash recovery.

### Socket.IO Rooms

| Room | Members |
|------|---------|
| `players` | All registered players |
| `team1` | Team "Тюльпаны" members |
| `team2` | Team "Розы" members |
| `admin` | Admin panel |

## Project Structure

```
100on1/
├── package.json                # Workspace root & scripts
├── pnpm-workspace.yaml         # Workspace config
├── tsconfig.base.json          # Shared TypeScript config
├── shared/                     # Shared types & constants
│   └── src/
│       ├── index.ts            # Barrel export
│       ├── types/
│       │   ├── game.ts         # GameState, GamePhase, RoundState, BigGameState
│       │   ├── player.ts       # Player, Team, TeamId
│       │   ├── question.ts     # Question, Answer, BigGameQuestion
│       │   └── events.ts       # ClientToServerEvents, ServerToClientEvents, SoundEffect
│       └── constants/
│           └── game.ts         # ROUND_CONFIG, MAX_STRIKES, REVERSE_POINTS, timers
├── server/                     # Node.js backend
│   └── src/
│       ├── index.ts            # Express + Socket.IO bootstrap, serves client/dist
│       ├── config.ts           # Port, admin password, CORS config
│       ├── state/
│       │   ├── GameState.ts    # Central state manager (singleton)
│       │   └── persistence.ts  # JSON file backup/restore
│       ├── handlers/
│       │   └── index.ts        # All Socket.IO event handlers (19 client→server events)
│       ├── engine/
│       │   ├── buzzerEngine.ts # First-tap-wins resolution
│       │   ├── timerEngine.ts  # Server-authoritative countdown
│       │   └── teamEngine.ts   # Fisher-Yates shuffle, team assignment
│       └── data/
│           ├── questions.json  # Pre-loaded game questions
│           └── loadQuestions.ts # JSON loader utility
├── client/                     # React frontend
│   └── src/
│       ├── main.tsx            # React entry point
│       ├── App.tsx             # Router (8 routes)
│       ├── socket.ts           # Socket.IO client singleton
│       ├── contexts/
│       │   ├── GameContext.tsx  # Game state provider (listens to game:state)
│       │   ├── PlayerContext.tsx # Player identity + localStorage persistence
│       │   └── SoundContext.tsx # Howler.js manager + iOS audio unlock
│       ├── pages/
│       │   ├── player/
│       │   │   ├── JoinPage.tsx      # Name input
│       │   │   ├── LobbyPage.tsx     # Waiting room
│       │   │   ├── GamePage.tsx      # Main game view (all phases)
│       │   │   └── ResultsPage.tsx   # Final scores + confetti
│       │   ├── display/
│       │   │   └── PublicDisplayPage.tsx # Big-screen spectator view
│       │   └── admin/
│       │       ├── AdminLoginPage.tsx  # Password entry
│       │       ├── AdminLobbyPage.tsx  # Team management
│       │       └── AdminGamePage.tsx   # Game control panel
│       ├── components/
│       │   ├── game/
│       │   │   ├── AnswerBoard.tsx    # Answer grid with flip-reveal
│       │   │   ├── AnswerSlot.tsx     # Single answer slot (hidden/revealed)
│       │   │   ├── BuzzerButton.tsx   # Full-screen buzzer + vibration
│       │   │   ├── ScoreDisplay.tsx   # Team scores
│       │   │   ├── StrikeDisplay.tsx  # Animated X marks (up to 3)
│       │   │   └── Countdown.tsx      # Timer display
│       │   └── layout/
│       │       └── FestiveBackground.tsx # Animated flower petals
│       ├── styles/
│       │   └── globals.css     # Tailwind theme (pink/gold/purple/cream)
│       └── public/
│           └── sounds/         # 8 WAV files (correct, wrong, buzzer, etc.)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listening port |
| `ADMIN_PASSWORD` | `admin8march` | Admin panel password |
| `CLIENT_URL` | `http://localhost:5173` (dev only) | CORS allowed origin in dev mode |
| `NODE_ENV` | — | Set to `production` to serve built client and disable CORS restrictions |

## Questions

Questions are stored in [server/src/data/questions.json](server/src/data/questions.json). The file contains:

- **3 questions** for rounds 1–3 (6 answers each, sorted by popularity)
- **1 question** for the Reverse round (6 answers with ascending point values)
- **5 questions** for the Big Game (6 answers each)

All questions are themed around March 8th (International Women's Day), spring, and celebrations. To customize for your event, edit the JSON file following the existing format:

```jsonc
// Regular round question
{
  "id": "q1",
  "text": "Your question text?",
  "roundType": "simple",        // simple | double | triple | reverse
  "answers": [
    { "id": 1, "text": "Answer", "points": 32 },  // most popular first
    // ... 6 answers total
  ]
}

// Big Game question
{
  "id": "bg1",
  "text": "Your question?",
  "answers": [
    { "text": "Answer", "points": 41 },
    // ... 6 answers total
  ]
}
```

## Deployment

### Local Network

Run `pnpm serve` and share your local IP address (printed on startup) with players on the same Wi-Fi network.

### Internet (Cloudflare Tunnel)

Run `pnpm tunnel` — no cloud hosting or domain required. A temporary public URL is generated automatically. Requires `cloudflared` CLI (`brew install cloudflared` on macOS).

### Cloud Hosting

Deploy to any Node.js hosting (Railway, Render, Fly.io, etc.):

```bash
NODE_ENV=production
pnpm install
pnpm build
pnpm start
```

The server serves the built client from `client/dist` on a single port.

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge (Android) | Full support |
| Safari (iOS 14+) | Full support (audio unlock required on first tap) |
| Firefox (Android) | Full support |
| Desktop Chrome / Edge / Firefox | Full support |
| Safari (macOS) | Full support |

> **Note:** iOS Safari requires a user interaction (tap) to unlock audio playback. The game handles this automatically on the join screen.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No sound on iPhone/iPad | Tap the screen once after joining — iOS requires user interaction to unlock audio |
| Player disconnected | The game auto-reconnects. If the player's name disappears, they can rejoin with the same name |
| "Connection error" on phone | Ensure the phone is on the same Wi-Fi network as the server, or use `pnpm tunnel` for internet access |
| Admin panel not loading | Navigate to `/admin` and enter the password (default: `admin8march`) |
| Game state lost after server restart | The state is saved to a JSON file periodically. Restart the server — it will attempt to restore the last saved state |
| Buzzer not responding | Admin must press "Open Buzzer" to enable the buzzer race for the current round |
| Cloudflare tunnel not working | Ensure `cloudflared` is installed (`brew install cloudflared`) and port 3001 is not blocked |

## License

Private project. All rights reserved.
