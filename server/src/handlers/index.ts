import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { gameState } from '../state/GameState.js';
import { splitIntoTeams } from '../engine/teamEngine.js';
import { buzzerEngine } from '../engine/buzzerEngine.js';
import { TimerEngine } from '../engine/timerEngine.js';
import { BIG_GAME_PLAYER1_TIME, BIG_GAME_PLAYER2_TIME, BIG_GAME_QUESTIONS_COUNT } from 'shared';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Map socketId -> playerId for reconnection
const socketToPlayer = new Map<string, string>();
const playerToSocket = new Map<string, string>();
const adminSockets = new Set<string>();
const bigGameTimer = new TimerEngine();

function broadcast(io: IOServer) {
  io.emit('game:state', gameState.getState());
}

export function registerHandlers(io: IOServer) {
  // Broadcast state on every change
  gameState.onChange(() => broadcast(io));

  io.on('connection', (socket: IOSocket) => {
    // Send current state on connect
    socket.emit('game:state', gameState.getState());

    // --- Request State (for display page / late-connecting clients) ---
    socket.on('game:requestState', () => {
      socket.emit('game:state', gameState.getState());
    });

    // --- Player Registration ---
    socket.on('player:register', (data, callback) => {
      const name = data.name.trim();
      if (!name) {
        callback({ success: false, error: 'Имя не может быть пустым' });
        return;
      }

      // Check for duplicate names
      const existing = Object.values(gameState.getState().players).find(
        p => p.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        callback({ success: false, error: 'Это имя уже занято' });
        return;
      }

      const playerId = uuid();
      gameState.addPlayer({
        id: playerId,
        name,
        teamId: null,
        isConnected: true,
        joinedAt: Date.now(),
      });
      socketToPlayer.set(socket.id, playerId);
      playerToSocket.set(playerId, socket.id);
      socket.join('players');
      callback({ success: true, playerId });
    });

    // --- Player Reconnect ---
    socket.on('player:reconnect', (data) => {
      const { playerId } = data;
      const player = gameState.getState().players[playerId];
      if (!player) return;

      // Clean up old socket mapping
      const oldSocketId = playerToSocket.get(playerId);
      if (oldSocketId) socketToPlayer.delete(oldSocketId);

      socketToPlayer.set(socket.id, playerId);
      playerToSocket.set(playerId, socket.id);
      gameState.updatePlayer(playerId, { isConnected: true });

      socket.join('players');
      if (player.teamId) socket.join(player.teamId);
      socket.emit('game:state', gameState.getState());
    });

    // --- Admin Login ---
    socket.on('admin:login', (data, callback) => {
      if (data.password === config.adminPassword) {
        adminSockets.add(socket.id);
        socket.join('admin');
        gameState.setAdminConnected(true);
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    });

    // --- Admin: Shuffle Teams ---
    socket.on('admin:shuffleTeams', () => {
      if (!adminSockets.has(socket.id)) return;
      const playerIds = Object.keys(gameState.getState().players);
      const { team1, team2 } = splitIntoTeams(playerIds);
      gameState.setTeams(team1, team2);
    });

    // --- Admin: Confirm Teams ---
    socket.on('admin:confirmTeams', (data) => {
      if (!adminSockets.has(socket.id)) return;
      gameState.setTeams(data.teams.team1, data.teams.team2);

      // Put players in team rooms
      for (const pid of data.teams.team1) {
        const sid = playerToSocket.get(pid);
        if (sid) io.sockets.sockets.get(sid)?.join('team1');
      }
      for (const pid of data.teams.team2) {
        const sid = playerToSocket.get(pid);
        if (sid) io.sockets.sockets.get(sid)?.join('team2');
      }

      gameState.setPhase('teamReveal');
    });

    // --- Admin: Start Round ---
    socket.on('admin:startRound', () => {
      if (!adminSockets.has(socket.id)) return;
      const state = gameState.getState();
      const nextIndex = state.currentRound.roundNumber; // 0-based next
      gameState.startRound(nextIndex);
    });

    // --- Admin: Open Buzzer ---
    socket.on('admin:openBuzzer', () => {
      if (!adminSockets.has(socket.id)) return;
      buzzerEngine.open();
      gameState.setPhase('buzzerRace');
      io.to('players').emit('buzzer:open');
    });

    // --- Player: Buzzer Press ---
    socket.on('player:buzzer', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const player = gameState.getState().players[playerId];
      if (!player?.teamId) return;

      const winner = buzzerEngine.tryBuzz(player.teamId);
      if (winner) {
        io.emit('buzzer:won', { teamId: winner, playerName: player.name });
        io.emit('sound:play', { sound: 'buzzer' });
        gameState.setBuzzerWinner(winner);
      }
    });

    // --- Admin: Reveal Answer ---
    socket.on('admin:revealAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const question = gameState.getState().currentRound.question;
      if (!question) return;
      const answer = question.answers.find(a => a.id === data.answerId);
      if (!answer) return;

      const revealed = gameState.revealAnswer(data.answerId);
      if (revealed) {
        io.emit('answer:revealed', { answer: { ...answer, isRevealed: true } });
        io.emit('sound:play', { sound: 'correct' });
      }
    });

    // --- Admin: Mark Strike ---
    socket.on('admin:markStrike', () => {
      if (!adminSockets.has(socket.id)) return;
      const strikes = gameState.addStrike();
      io.emit('answer:strike', { strikeCount: strikes });
      io.emit('sound:play', { sound: 'wrong' });
    });

    // --- Admin: Start Steal ---
    socket.on('admin:startSteal', () => {
      if (!adminSockets.has(socket.id)) return;
      gameState.setPhase('stealAttempt');
    });

    // --- Admin: Award Round ---
    socket.on('admin:awardRound', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const points = gameState.awardRound(data.teamId);
      io.emit('round:result', { winnerTeamId: data.teamId, points });
      io.emit('sound:play', { sound: 'applause' });
    });

    // --- Admin: Next Phase ---
    socket.on('admin:nextPhase', () => {
      if (!adminSockets.has(socket.id)) return;
      const state = gameState.getState();

      switch (state.phase) {
        case 'roundIntro':
          // For reverse game, move to reverseAnswering
          if (state.currentRound.roundType === 'reverse') {
            gameState.setPhase('reverseAnswering');
          }
          break;
        case 'roundResult': {
          const nextRoundIndex = state.currentRound.roundNumber;
          if (nextRoundIndex >= 5) {
            gameState.setPhase('gameOver');
          }
          // Admin will call admin:startRound for next round
          break;
        }
        case 'bigGamePlayer1':
          bigGameTimer.stop();
          gameState.finishBigGamePlayer1();
          break;
        case 'bigGamePlayer2':
          bigGameTimer.stop();
          gameState.finishBigGame();
          io.emit('sound:play', {
            sound: state.currentRound.bigGameState &&
              state.currentRound.bigGameState.totalPoints >= 200
              ? 'bigWin' : 'applause'
          });
          break;
        case 'bigGameReveal':
          gameState.setPhase('gameOver');
          break;
        default:
          break;
      }
    });

    // --- Admin: Reverse Game Answer ---
    socket.on('admin:revealReverseAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const points = gameState.revealReverseAnswer(data.answerId, data.teamId);
      if (points > 0) {
        io.emit('sound:play', { sound: 'correct' });
      }
    });

    // --- Admin: Select Big Game Players ---
    socket.on('admin:selectBigGamePlayers', (data) => {
      if (!adminSockets.has(socket.id)) return;
      gameState.setupBigGame(data.player1Id, data.player2Id);
    });

    // --- Admin: Start Big Game Timer ---
    socket.on('admin:startBigGameTimer', () => {
      if (!adminSockets.has(socket.id)) return;
      const state = gameState.getState();
      const seconds = state.phase === 'bigGamePlayer1'
        ? BIG_GAME_PLAYER1_TIME
        : BIG_GAME_PLAYER2_TIME;

      bigGameTimer.start(
        seconds,
        (secondsLeft) => io.emit('timer:tick', { secondsLeft }),
        () => {
          io.emit('timer:expired');
          io.emit('sound:play', { sound: 'timerEnd' });
        }
      );
    });

    // --- Admin: Mark Big Game Answer ---
    socket.on('admin:markBigGameAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      gameState.markBigGameAnswer(data.playerNumber, data.questionIndex, data.points);
    });

    // --- Admin: Override Score ---
    socket.on('admin:overrideScore', (data) => {
      if (!adminSockets.has(socket.id)) return;
      gameState.overrideScore(data.teamId, data.score);
    });

    // --- Admin: Reset ---
    socket.on('admin:resetGame', () => {
      if (!adminSockets.has(socket.id)) return;
      buzzerEngine.reset();
      bigGameTimer.stop();
      gameState.resetGame();
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (playerId) {
        gameState.updatePlayer(playerId, { isConnected: false });
        socketToPlayer.delete(socket.id);
      }
      if (adminSockets.has(socket.id)) {
        adminSockets.delete(socket.id);
        if (adminSockets.size === 0) {
          gameState.setAdminConnected(false);
        }
      }
    });
  });
}
