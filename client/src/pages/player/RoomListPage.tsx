import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../../contexts/RoomContext.js';
import { usePlayer } from '../../contexts/PlayerContext.js';
import { useSound } from '../../contexts/SoundContext.js';
import type { RoomInfo } from 'shared';

const phaseLabels: Record<string, string> = {
  registration: 'Ожидание игроков',
  teamReveal: 'Команды',
  roundIntro: 'Идёт игра',
  buzzerRace: 'Идёт игра',
  teamAnswering: 'Идёт игра',
  stealAttempt: 'Идёт игра',
  reverseAnswering: 'Идёт игра',
  roundResult: 'Идёт игра',
  bigGamePlayer1: 'Большая игра',
  bigGamePlayer2: 'Большая игра',
  bigGameReveal: 'Большая игра',
  gameOver: 'Завершена',
};

export function RoomListPage() {
  const { rooms, joinRoom, refreshRooms } = useRoom();
  const { playerName } = usePlayer();
  const { unlockAudio, isUnlocked } = useSound();
  const navigate = useNavigate();
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [passwordModal, setPasswordModal] = useState<RoomInfo | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  const handleJoin = async (room: RoomInfo) => {
    if (!isUnlocked) unlockAudio();

    if (room.hasPassword) {
      setPasswordModal(room);
      setPassword('');
      setError('');
      return;
    }

    setJoining(room.id);
    setError('');
    const result = await joinRoom(room.id);
    if (result.success) {
      navigate('/lobby');
    } else {
      setError(result.error || 'Не удалось войти в комнату');
      setJoining(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal) return;

    setJoining(passwordModal.id);
    setError('');
    const result = await joinRoom(passwordModal.id, password);
    if (result.success) {
      setPasswordModal(null);
      navigate('/lobby');
    } else {
      setError(result.error || 'Неверный пароль');
      setJoining(null);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-4 pt-8">
      <div className="text-center mb-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-primary">100 к 1</h1>
        <p className="text-purple mt-1">Привет, {playerName}!</p>
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        <h2 className="text-lg font-semibold text-gray-600 mb-3 text-center">Выберите комнату</h2>

        {rooms.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg text-center">
            <p className="text-gray-400">Комнат пока нет</p>
            <p className="text-gray-400 text-sm mt-1">Ожидайте, пока администратор создаст комнату</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {room.hasPassword && <span className="text-lg">🔒</span>}
                    <span className="font-bold text-primary text-lg">{room.name}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {phaseLabels[room.phase] || room.phase}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  {room.playerCount} {room.playerCount === 1 ? 'игрок' : room.playerCount < 5 ? 'игрока' : 'игроков'}
                </div>
                <button
                  onClick={() => handleJoin(room)}
                  disabled={joining !== null}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-lg
                    hover:bg-primary-dark active:scale-[0.97] transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {joining === room.id ? 'Подключение...' : 'Войти'}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && !passwordModal && (
          <p className="text-wrong text-sm mt-3 text-center">{error}</p>
        )}
      </div>

      {/* Password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-fade-in"
          >
            <h3 className="font-bold text-lg text-primary mb-1">{passwordModal.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Введите пароль для входа</p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль..."
              className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-lg text-center"
              autoFocus
            />

            {error && (
              <p className="text-wrong text-sm mt-2 text-center">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setPasswordModal(null); setError(''); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold
                  hover:bg-gray-50 transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={joining !== null}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold
                  hover:bg-primary-dark active:scale-95 transition-all
                  disabled:opacity-50"
              >
                {joining ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
