import { v4 as uuid } from 'uuid';
import type { RoomInfo } from 'shared';
import { GameStateManager } from './GameState.js';
import { BuzzerEngine } from '../engine/buzzerEngine.js';
import { TimerEngine } from '../engine/timerEngine.js';
import { loadQuestions, type QuestionsData } from '../data/loadQuestions.js';

export interface RoomData {
  id: string;
  name: string;
  password: string | null;
  createdAt: number;
  gameState: GameStateManager;
  buzzerEngine: BuzzerEngine;
  bigGameTimer: TimerEngine;
}

class RoomManager {
  private rooms = new Map<string, RoomData>();
  private socketToRoom = new Map<string, string>();
  private questions: QuestionsData;

  constructor() {
    this.questions = loadQuestions();
  }

  createRoom(name: string, password: string | null): RoomData {
    const id = uuid();
    const room: RoomData = {
      id,
      name,
      password: password || null,
      createdAt: Date.now(),
      gameState: new GameStateManager(this.questions, id),
      buzzerEngine: new BuzzerEngine(),
      bigGameTimer: new TimerEngine(),
    };
    this.rooms.set(id, room);
    return room;
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.bigGameTimer.stop();
    this.rooms.delete(roomId);
    // Clean up socket mappings for this room
    for (const [socketId, rId] of this.socketToRoom) {
      if (rId === roomId) this.socketToRoom.delete(socketId);
    }
    return true;
  }

  renameRoom(roomId: string, name: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.name = name;
    return true;
  }

  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  getRoomForSocket(socketId: string): RoomData | undefined {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomIdForSocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  joinRoom(socketId: string, roomId: string) {
    this.socketToRoom.set(socketId, roomId);
  }

  leaveRoom(socketId: string): string | undefined {
    const roomId = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);
    return roomId;
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      hasPassword: !!r.password,
      playerCount: Object.keys(r.gameState.getState().players).length,
      phase: r.gameState.getState().phase,
    }));
  }
}

export const roomManager = new RoomManager();
