import type { TeamId } from './player.js';
import type { GameState } from './game.js';
import type { Answer } from './question.js';

export type SoundEffect =
  | 'correct'
  | 'wrong'
  | 'buzzer'
  | 'timerTick'
  | 'timerEnd'
  | 'applause'
  | 'roundStart'
  | 'bigWin';

export interface ClientToServerEvents {
  'player:register': (data: { name: string }, callback: (response: { success: boolean; playerId?: string; error?: string }) => void) => void;
  'player:reconnect': (data: { playerId: string }) => void;
  'player:buzzer': () => void;

  'admin:login': (data: { password: string }, callback: (response: { success: boolean }) => void) => void;
  'admin:confirmTeams': (data: { teams: Record<TeamId, string[]> }) => void;
  'admin:shuffleTeams': () => void;
  'admin:startRound': () => void;
  'admin:openBuzzer': () => void;
  'admin:revealAnswer': (data: { answerId: number }) => void;
  'admin:markStrike': () => void;
  'admin:startSteal': () => void;
  'admin:awardRound': (data: { teamId: TeamId }) => void;
  'admin:nextPhase': () => void;
  'admin:selectBigGamePlayers': (data: { player1Id: string; player2Id: string }) => void;
  'admin:startBigGameTimer': () => void;
  'admin:markBigGameAnswer': (data: { playerNumber: 1 | 2; questionIndex: number; points: number }) => void;
  'admin:revealReverseAnswer': (data: { answerId: number; teamId: TeamId }) => void;
  'admin:overrideScore': (data: { teamId: TeamId; score: number }) => void;
  'admin:resetGame': () => void;

  'game:requestState': () => void;
}

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'buzzer:open': () => void;
  'buzzer:won': (data: { teamId: TeamId; playerName: string }) => void;
  'answer:revealed': (data: { answer: Answer }) => void;
  'answer:strike': (data: { strikeCount: number }) => void;
  'round:result': (data: { winnerTeamId: TeamId; points: number }) => void;
  'timer:tick': (data: { secondsLeft: number }) => void;
  'timer:expired': () => void;
  'sound:play': (data: { sound: SoundEffect }) => void;
  'error': (data: { message: string }) => void;
}
