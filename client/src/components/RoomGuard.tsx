import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../contexts/RoomContext.js';

interface RoomGuardProps {
  children: ReactNode;
  isAdmin?: boolean;
}

export function RoomGuard({ children, isAdmin = false }: RoomGuardProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const { currentRoomId, joinRoom, rooms } = useRoom();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'joining' | 'ready' | 'error' | 'password-required'>(
    currentRoomId === roomId ? 'ready' : 'joining'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');

  // Track status via ref so the effect can detect kick/deletion without stale closure
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!roomId) return;

    if (currentRoomId === roomId) {
      setStatus('ready');
      return;
    }

    // If we were already 'ready' but lost the room (kicked/deleted), redirect
    if (statusRef.current === 'ready') {
      navigate(isAdmin ? '/admin/rooms' : '/rooms', { replace: true });
      return;
    }

    // Check if room requires password before attempting join
    const roomInfo = rooms.find(r => r.id === roomId);
    if (roomInfo?.hasPassword) {
      setStatus('password-required');
      return;
    }

    setStatus('joining');
    joinRoom(roomId).then((result) => {
      if (result.success) {
        setStatus('ready');
      } else if (result.error?.includes('пароль')) {
        setStatus('password-required');
      } else {
        setErrorMsg(result.error || 'Комната не найдена');
        setStatus('error');
      }
    });
  }, [roomId, currentRoomId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    setStatus('joining');
    setErrorMsg('');
    const result = await joinRoom(roomId, password);
    if (result.success) {
      setStatus('ready');
    } else {
      setErrorMsg(result.error || 'Неверный пароль');
      setStatus('password-required');
    }
  };

  if (status === 'joining') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg animate-pulse">Подключение к комнате...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-wrong text-lg">{errorMsg}</p>
        <button
          onClick={() => navigate(isAdmin ? '/admin/rooms' : '/rooms')}
          className="px-4 py-2 rounded-xl bg-primary text-white font-semibold
            hover:bg-primary-dark active:scale-95 transition-all"
        >
          К списку комнат
        </button>
      </div>
    );
  }

  if (status === 'password-required') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <form
          onSubmit={handlePasswordSubmit}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl w-full max-w-sm animate-fade-in"
        >
          <h3 className="font-bold text-lg text-primary mb-1">Комната защищена паролем</h3>
          <p className="text-sm text-gray-500 mb-4">Введите пароль для входа</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль..."
            className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-lg text-center"
            autoFocus
          />
          {errorMsg && <p className="text-wrong text-sm mt-2 text-center">{errorMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin/rooms' : '/rooms')}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold
                hover:bg-gray-50 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold
                hover:bg-primary-dark active:scale-95 transition-all"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
