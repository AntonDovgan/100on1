import type { Player, Team, TeamId } from './player.js';
import type { Question } from './question.js';

export type RoundType = 'simple' | 'double' | 'triple' | 'reverse' | 'bigGame';

export type GamePhase =
  | 'registration'
  | 'teamReveal'
  | 'roundIntro'
  | 'buzzerRace'
  | 'teamAnswering'
  | 'stealAttempt'
  | 'roundResult'
  | 'reverseAnswering'
  | 'bigGamePlayer1'
  | 'bigGamePlayer2'
  | 'bigGameReveal'
  | 'gameOver';

export interface BigGameAnswer {
  questionId: string;
  questionText: string;
  answer: string;
  points: number;
}

export interface BigGameQuestionInfo {
  id: string;
  text: string;
}

export interface BigGameState {
  player1Id: string;
  player2Id: string;
  questions: BigGameQuestionInfo[];
  player1Answers: BigGameAnswer[];
  player2Answers: BigGameAnswer[];
  currentQuestionIndex: number;
  timerSeconds: number;
  totalPoints: number;
  isPlayer1Done: boolean;
}

export interface RoundState {
  roundNumber: number;
  roundType: RoundType;
  multiplier: number;
  question: Question | null;
  activeTeamId: TeamId | null;
  strikes: number;
  roundPoints: number;
  buzzerWinner: TeamId | null;
  currentPlayerIndex: number | null;
  bigGameState: BigGameState | null;
}

export interface GameState {
  phase: GamePhase;
  players: Record<string, Player>;
  teams: Record<TeamId, Team>;
  currentRound: RoundState;
  teamScores: Record<TeamId, number>;
  adminConnected: boolean;
}
