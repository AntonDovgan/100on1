import type { RoundType } from './game.js';

export interface Answer {
  id: number;
  text: string;
  points: number;
  isRevealed: boolean;
}

export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  roundType: RoundType;
}

export interface BigGameQuestion {
  id: string;
  text: string;
  answers: { text: string; points: number }[];
}

export interface BigGameQuestionSet {
  questions: BigGameQuestion[];
}
