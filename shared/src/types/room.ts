import type { GamePhase } from './game.js';

export interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  playerCount: number;
  phase: GamePhase;
}
