import type { RoundType } from '../types/game.js';

export const ROUND_CONFIG: Record<RoundType, { multiplier: number; name: string; nameRu: string }> = {
  simple: { multiplier: 1, name: 'Simple Game', nameRu: 'Простая игра' },
  double: { multiplier: 2, name: 'Double Game', nameRu: 'Двойная игра' },
  triple: { multiplier: 3, name: 'Triple Game', nameRu: 'Тройная игра' },
  reverse: { multiplier: 1, name: 'Reverse Game', nameRu: 'Игра наоборот' },
  bigGame: { multiplier: 1, name: 'Big Game', nameRu: 'Большая игра' },
};

export const ROUND_SEQUENCE: RoundType[] = ['simple', 'double', 'triple', 'reverse', 'bigGame'];

export const MAX_STRIKES = 3;

export const REVERSE_POINTS = [15, 30, 60, 120, 180, 240] as const;

export const BIG_GAME_PLAYER1_TIME = 15;
export const BIG_GAME_PLAYER2_TIME = 20;
export const BIG_GAME_WIN_THRESHOLD = 200;
export const BIG_GAME_QUESTIONS_COUNT = 5;

export const TEAM_NAMES: Record<string, string> = {
  team1: 'Тюльпаны',
  team2: 'Розы',
};
