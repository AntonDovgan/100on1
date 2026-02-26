import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { roomManager } from '../state/RoomManager.js';
import { splitIntoTeams } from '../engine/teamEngine.js';
import { BIG_GAME_PLAYER1_TIME, BIG_GAME_PLAYER2_TIME } from 'shared';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Global maps (not room-scoped)
const socketToPlayer = new Map<string, string>();
const playerToSocket = new Map<string, string>();
const playerNames = new Map<string, string>();
const playerRooms = new Map<string, string>(); // playerId -> roomId (for reconnect)
const adminSockets = new Set<string>();

function getRoomContext(socketId: string) {
  const room = roomManager.getRoomForSocket(socketId);
  if (!room) return null;
  return {
    gameState: room.gameState,
    buzzer: room.buzzerEngine,
    timer: room.bigGameTimer,
    roomId: room.id,
  };
}

function broadcastRoomList(io: IOServer) {
  io.to('lobby').emit('room:list', roomManager.getRoomList());
}

export function registerHandlers(io: IOServer) {
  io.on('connection', (socket: IOSocket) => {

    // --- Request State (for display page / late-connecting clients) ---
    socket.on('game:requestState', () => {
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      socket.emit('game:state', ctx.gameState.getState());
    });

    // --- Room Management ---

    socket.on('room:create', (data, callback) => {
      if (!adminSockets.has(socket.id)) {
        callback({ success: false, error: 'Только администратор может создавать комнаты' });
        return;
      }
      const name = data.name.trim();
      if (!name) {
        callback({ success: false, error: 'Название комнаты не может быть пустым' });
        return;
      }
      const room = roomManager.createRoom(name, data.password ?? null);

      // Wire up state broadcasting for this room
      room.gameState.onChange(() => {
        io.to(`room:${room.id}`).emit('game:state', room.gameState.getState());
      });

      broadcastRoomList(io);
      callback({ success: true, roomId: room.id });
    });

    socket.on('room:delete', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      // Notify all sockets in the room
      io.to(`room:${data.roomId}`).emit('room:kicked');
      io.in(`room:${data.roomId}`).socketsLeave(`room:${data.roomId}`);

      // Clean up playerRooms for players in this room
      for (const playerId of Object.keys(room.gameState.getState().players)) {
        playerRooms.delete(playerId);
      }

      roomManager.deleteRoom(data.roomId);
      broadcastRoomList(io);
    });

    socket.on('room:rename', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const name = data.name.trim();
      if (!name) return;
      roomManager.renameRoom(data.roomId, name);
      broadcastRoomList(io);
    });

    socket.on('room:kick', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      room.gameState.removePlayer(data.playerId);
      playerRooms.delete(data.playerId);

      const playerSocketId = playerToSocket.get(data.playerId);
      if (playerSocketId) {
        const playerSocket = io.sockets.sockets.get(playerSocketId);
        if (playerSocket) {
          playerSocket.leave(`room:${data.roomId}`);
          playerSocket.emit('room:kicked');
          playerSocket.join('lobby');
        }
        roomManager.leaveRoom(playerSocketId);
      }
      broadcastRoomList(io);
    });

    socket.on('room:list', (callback) => {
      callback(roomManager.getRoomList());
    });

    socket.on('room:join', (data, callback) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        callback({ success: false, error: 'Комната не найдена' });
        return;
      }
      const playerId = socketToPlayer.get(socket.id);
      const isViewer = !playerId && !adminSockets.has(socket.id);

      // Skip password check for admins and anonymous viewers (display page)
      if (room.password && data.password !== room.password && !isViewer && !adminSockets.has(socket.id)) {
        callback({ success: false, error: 'Неверный пароль' });
        return;
      }

      const isAdmin = adminSockets.has(socket.id);

      // Check name uniqueness within room (for players, not admins)
      if (playerId && !isAdmin) {
        const name = playerNames.get(playerId);
        const existing = Object.values(room.gameState.getState().players).find(
          p => p.name.toLowerCase() === name?.toLowerCase() && p.id !== playerId
        );
        if (existing) {
          callback({ success: false, error: 'Это имя уже занято в этой комнате' });
          return;
        }
      }

      // Leave any previous room (mark player disconnected to avoid ghosts)
      const prevRoomId = roomManager.getRoomIdForSocket(socket.id);
      if (prevRoomId) {
        const prevRoom = roomManager.getRoom(prevRoomId);
        if (prevRoom && playerId && !isAdmin) {
          prevRoom.gameState.updatePlayer(playerId, { isConnected: false });
        }
        socket.leave(`room:${prevRoomId}`);
        roomManager.leaveRoom(socket.id);
      }

      // Leave lobby, join room
      socket.leave('lobby');
      roomManager.joinRoom(socket.id, data.roomId);
      socket.join(`room:${data.roomId}`);

      // If this is a player (not admin), add to room's game state
      if (playerId && !isAdmin) {
        const name = playerNames.get(playerId) ?? '';
        playerRooms.set(playerId, data.roomId);

        if (!room.gameState.getState().players[playerId]) {
          room.gameState.addPlayer({
            id: playerId,
            name,
            teamId: null,
            isConnected: true,
            joinedAt: Date.now(),
          });
        } else {
          room.gameState.updatePlayer(playerId, { isConnected: true });
        }
      }

      // If admin, mark connected
      if (isAdmin) {
        room.gameState.setAdminConnected(true);
      }

      socket.emit('game:state', room.gameState.getState());
      broadcastRoomList(io);
      callback({ success: true });
    });

    socket.on('room:leave', () => {
      const playerId = socketToPlayer.get(socket.id);
      const isAdmin = adminSockets.has(socket.id);
      const roomId = roomManager.getRoomIdForSocket(socket.id);

      if (roomId) {
        socket.leave(`room:${roomId}`);
        roomManager.leaveRoom(socket.id);

        const room = roomManager.getRoom(roomId);
        if (playerId && !isAdmin && room) {
          room.gameState.updatePlayer(playerId, { isConnected: false });
          playerRooms.delete(playerId); // Prevent auto-rejoin on reconnect
        }

        // Check if any admin still in this room
        if (isAdmin && room) {
          const anyAdminInRoom = Array.from(adminSockets).some(
            sid => roomManager.getRoomIdForSocket(sid) === roomId && sid !== socket.id
          );
          if (!anyAdminInRoom) {
            room.gameState.setAdminConnected(false);
          }
        }
      }

      socket.join('lobby');
      socket.emit('room:list', roomManager.getRoomList());
      broadcastRoomList(io);
    });

    // --- Player Registration ---
    socket.on('player:register', (data, callback) => {
      const name = data.name.trim();
      if (!name) {
        callback({ success: false, error: 'Имя не может быть пустым' });
        return;
      }

      const playerId = uuid();
      socketToPlayer.set(socket.id, playerId);
      playerToSocket.set(playerId, socket.id);
      playerNames.set(playerId, name);

      socket.join('lobby');
      socket.emit('room:list', roomManager.getRoomList());
      callback({ success: true, playerId });
    });

    // --- Player Reconnect ---
    socket.on('player:reconnect', (data) => {
      const { playerId } = data;

      // Restore identity mappings
      const oldSocketId = playerToSocket.get(playerId);
      if (oldSocketId) socketToPlayer.delete(oldSocketId);

      socketToPlayer.set(socket.id, playerId);
      playerToSocket.set(playerId, socket.id);

      // Try to rejoin previous room
      const roomId = playerRooms.get(playerId);
      if (roomId) {
        const room = roomManager.getRoom(roomId);
        if (room && room.gameState.getState().players[playerId]) {
          roomManager.joinRoom(socket.id, roomId);
          socket.join(`room:${roomId}`);
          room.gameState.updatePlayer(playerId, { isConnected: true });
          socket.emit('game:state', room.gameState.getState());
          return;
        }
        // Room gone or player removed — clear stale mapping and notify client
        playerRooms.delete(playerId);
        socket.emit('room:kicked');
      }

      // Otherwise, send to lobby
      socket.join('lobby');
      socket.emit('room:list', roomManager.getRoomList());
    });

    // --- Admin Login ---
    socket.on('admin:login', (data, callback) => {
      if (data.password === config.adminPassword) {
        adminSockets.add(socket.id);
        socket.join('lobby');
        socket.emit('room:list', roomManager.getRoomList());
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    });

    // --- Admin: Shuffle Teams ---
    socket.on('admin:shuffleTeams', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const playerIds = Object.keys(ctx.gameState.getState().players);
      const { team1, team2 } = splitIntoTeams(playerIds);
      ctx.gameState.setTeams(team1, team2);
    });

    // --- Admin: Confirm Teams ---
    socket.on('admin:confirmTeams', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;

      ctx.gameState.setTeams(data.teams.team1, data.teams.team2);

      for (const pid of data.teams.team1) {
        const sid = playerToSocket.get(pid);
        if (sid) io.sockets.sockets.get(sid)?.join('team1');
      }
      for (const pid of data.teams.team2) {
        const sid = playerToSocket.get(pid);
        if (sid) io.sockets.sockets.get(sid)?.join('team2');
      }

      ctx.gameState.setPhase('teamReveal');
    });

    // --- Admin: Start Round ---
    socket.on('admin:startRound', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const state = ctx.gameState.getState();
      const nextIndex = state.currentRound.roundNumber;
      ctx.gameState.startRound(nextIndex);
    });

    // --- Admin: Open Buzzer ---
    socket.on('admin:openBuzzer', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.buzzer.open();
      ctx.gameState.setPhase('buzzerRace');
      io.to(`room:${ctx.roomId}`).emit('buzzer:open');
    });

    // --- Player: Buzzer Press ---
    socket.on('player:buzzer', () => {
      const playerId = socketToPlayer.get(socket.id);
      if (!playerId) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const player = ctx.gameState.getState().players[playerId];
      if (!player?.teamId) return;

      const winner = ctx.buzzer.tryBuzz(player.teamId);
      if (winner) {
        io.to(`room:${ctx.roomId}`).emit('buzzer:won', { teamId: winner, playerName: player.name });
        io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'buzzer' });
        ctx.gameState.setBuzzerWinner(winner);
      }
    });

    // --- Admin: Reveal Answer ---
    socket.on('admin:revealAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const question = ctx.gameState.getState().currentRound.question;
      if (!question) return;
      const answer = question.answers.find(a => a.id === data.answerId);
      if (!answer) return;

      const revealed = ctx.gameState.revealAnswer(data.answerId);
      if (revealed) {
        io.to(`room:${ctx.roomId}`).emit('answer:revealed', { answer: { ...answer, isRevealed: true } });
        io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'correct' });
      }
    });

    // --- Admin: Mark Strike ---
    socket.on('admin:markStrike', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const strikes = ctx.gameState.addStrike();
      io.to(`room:${ctx.roomId}`).emit('answer:strike', { strikeCount: strikes });
      io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'wrong' });
    });

    // --- Admin: Start Steal ---
    socket.on('admin:startSteal', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.gameState.setPhase('stealAttempt');
    });

    // --- Admin: Award Round ---
    socket.on('admin:awardRound', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const points = ctx.gameState.awardRound(data.teamId);
      io.to(`room:${ctx.roomId}`).emit('round:result', { winnerTeamId: data.teamId, points });
      io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'applause' });
    });

    // --- Admin: Next Phase ---
    socket.on('admin:nextPhase', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const state = ctx.gameState.getState();

      switch (state.phase) {
        case 'roundIntro':
          if (state.currentRound.roundType === 'reverse') {
            ctx.gameState.setPhase('reverseAnswering');
          }
          break;
        case 'roundResult': {
          const nextRoundIndex = state.currentRound.roundNumber;
          if (nextRoundIndex >= 5) {
            ctx.gameState.setPhase('gameOver');
          }
          break;
        }
        case 'bigGamePlayer1':
          ctx.timer.stop();
          ctx.gameState.finishBigGamePlayer1();
          break;
        case 'bigGamePlayer2':
          ctx.timer.stop();
          ctx.gameState.finishBigGame();
          io.to(`room:${ctx.roomId}`).emit('sound:play', {
            sound: state.currentRound.bigGameState &&
              state.currentRound.bigGameState.totalPoints >= 200
              ? 'bigWin' : 'applause'
          });
          break;
        case 'bigGameReveal':
          ctx.gameState.setPhase('gameOver');
          break;
        default:
          break;
      }
    });

    // --- Admin: Reverse Game Answer ---
    socket.on('admin:revealReverseAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const points = ctx.gameState.revealReverseAnswer(data.answerId, data.teamId);
      if (points > 0) {
        io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'correct' });
      }
    });

    // --- Admin: Select Big Game Players ---
    socket.on('admin:selectBigGamePlayers', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.gameState.setupBigGame(data.player1Id, data.player2Id);
    });

    // --- Admin: Start Big Game Timer ---
    socket.on('admin:startBigGameTimer', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      const state = ctx.gameState.getState();
      const seconds = state.phase === 'bigGamePlayer1'
        ? BIG_GAME_PLAYER1_TIME
        : BIG_GAME_PLAYER2_TIME;

      ctx.timer.start(
        seconds,
        (secondsLeft) => io.to(`room:${ctx.roomId}`).emit('timer:tick', { secondsLeft }),
        () => {
          io.to(`room:${ctx.roomId}`).emit('timer:expired');
          io.to(`room:${ctx.roomId}`).emit('sound:play', { sound: 'timerEnd' });
        }
      );
    });

    // --- Admin: Mark Big Game Answer ---
    socket.on('admin:markBigGameAnswer', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.gameState.markBigGameAnswer(data.playerNumber, data.questionIndex, data.points);
    });

    // --- Admin: Override Score ---
    socket.on('admin:overrideScore', (data) => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.gameState.overrideScore(data.teamId, data.score);
    });

    // --- Admin: Reset ---
    socket.on('admin:resetGame', () => {
      if (!adminSockets.has(socket.id)) return;
      const ctx = getRoomContext(socket.id);
      if (!ctx) return;
      ctx.buzzer.reset();
      ctx.timer.stop();
      ctx.gameState.resetGame();
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const playerId = socketToPlayer.get(socket.id);
      const isAdmin = adminSockets.has(socket.id);
      const roomId = roomManager.getRoomIdForSocket(socket.id);

      if (roomId && playerId && !isAdmin) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.gameState.updatePlayer(playerId, { isConnected: false });
        }
      }
      roomManager.leaveRoom(socket.id);

      if (playerId) {
        socketToPlayer.delete(socket.id);
      }

      if (isAdmin) {
        adminSockets.delete(socket.id);
        if (roomId) {
          const room = roomManager.getRoom(roomId);
          const anyAdminInRoom = Array.from(adminSockets).some(
            sid => roomManager.getRoomIdForSocket(sid) === roomId
          );
          if (!anyAdminInRoom && room) {
            room.gameState.setAdminConnected(false);
          }
        }
      }

      broadcastRoomList(io);
    });
  });
}
