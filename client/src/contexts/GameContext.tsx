import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { GameState } from 'shared';
import { socket } from '../socket.js';

const initialState: GameState = {
  phase: 'registration',
  players: {},
  teams: {
    team1: { id: 'team1', name: 'Тюльпаны', score: 0, players: [] },
    team2: { id: 'team2', name: 'Розы', score: 0, players: [] },
  },
  currentRound: {
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
  },
  teamScores: { team1: 0, team2: 0 },
  adminConnected: false,
};

const GameContext = createContext<GameState>(initialState);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);

  useEffect(() => {
    socket.on('game:state', setState);
    // Request current state in case we missed the initial emit (race condition)
    socket.emit('game:requestState');
    return () => { socket.off('game:state', setState); };
  }, []);

  return <GameContext.Provider value={state}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}
