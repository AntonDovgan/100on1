import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { socket } from '../socket.js';

interface PlayerCtx {
  playerId: string | null;
  playerName: string | null;
  isAdmin: boolean;
  register: (name: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (password: string) => Promise<boolean>;
}

const PlayerContext = createContext<PlayerCtx>({
  playerId: null,
  playerName: null,
  isAdmin: false,
  register: async () => ({ success: false }),
  loginAdmin: async () => false,
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(
    localStorage.getItem('playerId')
  );
  const [playerName, setPlayerName] = useState<string | null>(
    localStorage.getItem('playerName')
  );
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (playerId) {
      socket.emit('player:reconnect', { playerId });
    }
  }, [playerId]);

  const register = async (name: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      socket.emit('player:register', { name }, (response) => {
        if (response.success && response.playerId) {
          setPlayerId(response.playerId);
          setPlayerName(name);
          localStorage.setItem('playerId', response.playerId);
          localStorage.setItem('playerName', name);
        }
        resolve(response);
      });
    });
  };

  const loginAdmin = async (password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socket.emit('admin:login', { password }, (response) => {
        setIsAdmin(response.success);
        resolve(response.success);
      });
    });
  };

  return (
    <PlayerContext.Provider value={{ playerId, playerName, isAdmin, register, loginAdmin }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
