import type { GameState, GamePhase, RoundState, BigGameState } from 'shared';
import type { TeamId, Player, Team } from 'shared';
import { ROUND_SEQUENCE, TEAM_NAMES } from 'shared';
import { loadQuestions, type QuestionsData } from '../data/loadQuestions.js';
import { persist } from './persistence.js';

function createInitialRound(): RoundState {
  return {
    roundNumber: 0,
    roundType: 'simple',
    multiplier: 1,
    question: null,
    activeTeamId: null,
    strikes: 0,
    roundPoints: 0,
    buzzerWinner: null,
    currentPlayerIndex: null,
    bigGameState: null,
  };
}

function createInitialState(): GameState {
  return {
    phase: 'registration',
    players: {},
    teams: {
      team1: { id: 'team1', name: TEAM_NAMES.team1, score: 0, players: [] },
      team2: { id: 'team2', name: TEAM_NAMES.team2, score: 0, players: [] },
    },
    currentRound: createInitialRound(),
    teamScores: { team1: 0, team2: 0 },
    adminConnected: false,
  };
}

class GameStateManager {
  private state: GameState;
  private questions: QuestionsData;
  private listeners: Array<(state: GameState) => void> = [];

  constructor() {
    this.state = createInitialState();
    this.questions = loadQuestions();
  }

  getState(): GameState {
    return this.state;
  }

  getQuestions(): QuestionsData {
    return this.questions;
  }

  onChange(listener: (state: GameState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    persist(this.state);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setPhase(phase: GamePhase) {
    this.state.phase = phase;
    this.notify();
  }

  addPlayer(player: Player) {
    this.state.players[player.id] = player;
    this.notify();
  }

  removePlayer(playerId: string) {
    delete this.state.players[playerId];
    this.notify();
  }

  updatePlayer(playerId: string, updates: Partial<Player>) {
    if (this.state.players[playerId]) {
      Object.assign(this.state.players[playerId], updates);
      this.notify();
    }
  }

  setTeams(team1Players: string[], team2Players: string[]) {
    this.state.teams.team1.players = team1Players;
    this.state.teams.team2.players = team2Players;
    for (const pid of team1Players) {
      if (this.state.players[pid]) this.state.players[pid].teamId = 'team1';
    }
    for (const pid of team2Players) {
      if (this.state.players[pid]) this.state.players[pid].teamId = 'team2';
    }
    this.notify();
  }

  startRound(roundIndex: number) {
    const roundType = ROUND_SEQUENCE[roundIndex];
    if (!roundType) return;

    const question = roundType === 'bigGame'
      ? null
      : this.questions.rounds[roundIndex] ?? null;

    const multiplier = roundType === 'simple' ? 1
      : roundType === 'double' ? 2
      : roundType === 'triple' ? 3
      : 1;

    this.state.currentRound = {
      roundNumber: roundIndex + 1,
      roundType,
      multiplier,
      question: question ? {
        ...question,
        answers: question.answers.map(a => ({ ...a, isRevealed: false })),
      } : null,
      activeTeamId: null,
      strikes: 0,
      roundPoints: 0,
      buzzerWinner: null,
      currentPlayerIndex: roundType === 'reverse' ? 0 : null,
      bigGameState: null,
    };
    this.state.phase = 'roundIntro';
    this.notify();
  }

  setBuzzerWinner(teamId: TeamId) {
    this.state.currentRound.buzzerWinner = teamId;
    this.state.currentRound.activeTeamId = teamId;
    this.state.phase = 'teamAnswering';
    this.notify();
  }

  revealAnswer(answerId: number): boolean {
    const question = this.state.currentRound.question;
    if (!question) return false;
    const answer = question.answers.find(a => a.id === answerId);
    if (!answer || answer.isRevealed) return false;
    answer.isRevealed = true;
    this.state.currentRound.roundPoints += answer.points;

    const allRevealed = question.answers.every(a => a.isRevealed);
    if (allRevealed) {
      this.state.phase = 'roundResult';
    }
    this.notify();
    return true;
  }

  addStrike(): number {
    this.state.currentRound.strikes += 1;
    const strikes = this.state.currentRound.strikes;
    if (strikes >= 3) {
      this.state.phase = 'stealAttempt';
    }
    this.notify();
    return strikes;
  }

  awardRound(teamId: TeamId) {
    const points = this.state.currentRound.roundPoints * this.state.currentRound.multiplier;
    this.state.teamScores[teamId] += points;
    this.state.teams[teamId].score = this.state.teamScores[teamId];
    this.state.phase = 'roundResult';
    this.notify();
    return points;
  }

  revealReverseAnswer(answerId: number, teamId: TeamId): number {
    const question = this.state.currentRound.question;
    if (!question) return 0;
    const answer = question.answers.find(a => a.id === answerId);
    if (!answer) return 0;
    answer.isRevealed = true;
    this.state.teamScores[teamId] += answer.points;
    this.state.teams[teamId].score = this.state.teamScores[teamId];
    this.notify();
    return answer.points;
  }

  setupBigGame(player1Id: string, player2Id: string) {
    const bigGameQuestions = this.questions.bigGame;
    this.state.currentRound.bigGameState = {
      player1Id,
      player2Id,
      questions: bigGameQuestions.map(q => ({ id: q.id, text: q.text })),
      player1Answers: [],
      player2Answers: [],
      currentQuestionIndex: 0,
      timerSeconds: 0,
      totalPoints: 0,
      isPlayer1Done: false,
    };
    this.state.phase = 'bigGamePlayer1';
    this.notify();
  }

  markBigGameAnswer(playerNumber: 1 | 2, questionIndex: number, points: number) {
    const bg = this.state.currentRound.bigGameState;
    if (!bg) return;

    const bigGameQuestions = this.questions.bigGame;
    const q = bigGameQuestions[questionIndex];
    const answerEntry = {
      questionId: q?.id ?? '',
      questionText: q?.text ?? '',
      answer: '',
      points,
    };

    if (playerNumber === 1) {
      bg.player1Answers[questionIndex] = answerEntry;
    } else {
      bg.player2Answers[questionIndex] = answerEntry;
    }

    bg.totalPoints = [...bg.player1Answers, ...bg.player2Answers]
      .reduce((sum, a) => sum + (a?.points ?? 0), 0);
    this.notify();
  }

  finishBigGamePlayer1() {
    const bg = this.state.currentRound.bigGameState;
    if (!bg) return;
    bg.isPlayer1Done = true;
    bg.currentQuestionIndex = 0;
    this.state.phase = 'bigGamePlayer2';
    this.notify();
  }

  finishBigGame() {
    this.state.phase = 'bigGameReveal';
    this.notify();
  }

  overrideScore(teamId: TeamId, score: number) {
    this.state.teamScores[teamId] = score;
    this.state.teams[teamId].score = score;
    this.notify();
  }

  setAdminConnected(connected: boolean) {
    this.state.adminConnected = connected;
    this.notify();
  }

  resetGame() {
    this.state = createInitialState();
    this.notify();
  }
}

export const gameState = new GameStateManager();
