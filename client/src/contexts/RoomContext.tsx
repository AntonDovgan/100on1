import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { socket } from '../socket.js';
import type { RoomInfo } from 'shared';

interface RoomCtx {
  rooms: RoomInfo[];
  currentRoomId: string | null;
  joinRoom: (roomId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  createRoom: (name: string, password?: string) => Promise<{ success: boolean; roomId?: string; error?: string }>;
  deleteRoom: (roomId: string) => void;
  renameRoom: (roomId: string, name: string) => void;
  kickPlayer: (roomId: string, playerId: string) => void;
  refreshRooms: () => void;
}

const RoomContext = createContext<RoomCtx>({
  rooms: [],
  currentRoomId: null,
  joinRoom: async () => ({ success: false }),
  leaveRoom: () => {},
  createRoom: async () => ({ success: false }),
  deleteRoom: () => {},
  renameRoom: () => {},
  kickPlayer: () => {},
  refreshRooms: () => {},
});

export function RoomProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(
    localStorage.getItem('currentRoomId')
  );

  // Use ref to access currentRoomId inside the room:list handler without re-registering
  const currentRoomIdRef = useRef(currentRoomId);
  currentRoomIdRef.current = currentRoomId;

  useEffect(() => {
    const handleRoomList = (list: RoomInfo[]) => {
      setRooms(list);
      // If we think we're in a room but it no longer exists, clear stale state
      const rid = currentRoomIdRef.current;
      if (rid && list.length > 0 && !list.some(r => r.id === rid)) {
        setCurrentRoomId(null);
        localStorage.removeItem('currentRoomId');
      }
    };

    socket.on('room:list', handleRoomList);
    socket.on('room:kicked', () => {
      setCurrentRoomId(null);
      localStorage.removeItem('currentRoomId');
    });
    return () => {
      socket.off('room:list', handleRoomList);
      socket.off('room:kicked');
    };
  }, []);

  const joinRoom = useCallback(async (roomId: string, password?: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socket.emit('room:join', { roomId, password }, (response) => {
        if (response.success) {
          setCurrentRoomId(roomId);
          localStorage.setItem('currentRoomId', roomId);
        }
        resolve(response);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setCurrentRoomId(null);
    localStorage.removeItem('currentRoomId');
  }, []);

  const createRoom = useCallback(async (name: string, password?: string) => {
    return new Promise<{ success: boolean; roomId?: string; error?: string }>((resolve) => {
      socket.emit('room:create', { name, password }, resolve);
    });
  }, []);

  const deleteRoom = useCallback((roomId: string) => {
    socket.emit('room:delete', { roomId });
  }, []);

  const renameRoom = useCallback((roomId: string, name: string) => {
    socket.emit('room:rename', { roomId, name });
  }, []);

  const kickPlayer = useCallback((roomId: string, playerId: string) => {
    socket.emit('room:kick', { roomId, playerId });
  }, []);

  const refreshRooms = useCallback(() => {
    socket.emit('room:list', setRooms);
  }, []);

  return (
    <RoomContext.Provider value={{
      rooms, currentRoomId, joinRoom, leaveRoom,
      createRoom, deleteRoom, renameRoom, kickPlayer, refreshRooms,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  return useContext(RoomContext);
}
