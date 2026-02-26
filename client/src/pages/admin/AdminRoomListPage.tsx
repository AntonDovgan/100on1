import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../../contexts/RoomContext.js';

const phaseLabels: Record<string, string> = {
  registration: 'Ожидание',
  teamReveal: 'Команды',
  roundIntro: 'Игра',
  buzzerRace: 'Игра',
  teamAnswering: 'Игра',
  stealAttempt: 'Игра',
  reverseAnswering: 'Игра',
  roundResult: 'Игра',
  bigGamePlayer1: 'Большая игра',
  bigGamePlayer2: 'Большая игра',
  bigGameReveal: 'Большая игра',
  gameOver: 'Завершена',
};

export function AdminRoomListPage() {
  const { rooms, createRoom, deleteRoom, renameRoom, joinRoom, refreshRooms } = useRoom();
  const navigate = useNavigate();

  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError('');
    const result = await createRoom(newName.trim(), newPassword.trim() || undefined);
    if (result.success) {
      setNewName('');
      setNewPassword('');
    } else {
      setError(result.error || 'Ошибка создания комнаты');
    }
    setCreating(false);
  };

  const handleDelete = (roomId: string, roomName: string) => {
    if (confirm(`Удалить комнату "${roomName}"? Все игроки будут отключены.`)) {
      deleteRoom(roomId);
    }
  };

  const handleRenameSubmit = (roomId: string) => {
    if (renameValue.trim()) {
      renameRoom(roomId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleEnterRoom = async (roomId: string) => {
    const result = await joinRoom(roomId);
    if (result.success) {
      navigate('/admin/lobby');
    }
  };

  return (
    <div className="min-h-screen px-4 pt-4 pb-8">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-primary">Админ-панель</h1>
        <p className="text-sm text-gray-500">Управление комнатами</p>
      </div>

      {/* Create room form */}
      <form onSubmit={handleCreate} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg max-w-lg mx-auto mb-6">
        <h3 className="font-semibold text-gray-600 mb-3">Создать комнату</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название..."
            className="flex-1 px-3 py-2 rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none text-sm"
            disabled={creating}
          />
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Пароль (необяз.)"
            className="w-36 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none text-sm"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm
              hover:bg-primary-dark active:scale-95 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '...' : 'Создать'}
          </button>
        </div>
        {error && <p className="text-wrong text-sm mt-2">{error}</p>}
      </form>

      {/* Room list */}
      <div className="max-w-lg mx-auto space-y-3">
        {rooms.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg text-center">
            <p className="text-gray-400">Комнат пока нет. Создайте первую!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {room.hasPassword && <span>🔒</span>}
                  {renamingId === room.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(room.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(room.id); if (e.key === 'Escape') setRenamingId(null); }}
                      className="px-2 py-1 rounded border-2 border-primary focus:outline-none text-sm font-bold"
                      autoFocus
                    />
                  ) : (
                    <span className="font-bold text-primary text-lg">{room.name}</span>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {phaseLabels[room.phase] || room.phase}
                </span>
              </div>

              <div className="text-sm text-gray-500 mb-3">
                {room.playerCount} {room.playerCount === 1 ? 'игрок' : room.playerCount < 5 ? 'игрока' : 'игроков'}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleEnterRoom(room.id)}
                  className="px-3 py-1.5 rounded-xl bg-correct text-white text-sm font-semibold
                    hover:opacity-90 active:scale-95 transition-all"
                >
                  Войти
                </button>
                <button
                  onClick={() => { setRenamingId(room.id); setRenameValue(room.name); }}
                  className="px-3 py-1.5 rounded-xl bg-gray-200 text-gray-600 text-sm font-semibold
                    hover:bg-gray-300 active:scale-95 transition-all"
                >
                  Переименовать
                </button>
                <button
                  onClick={() => handleDelete(room.id, room.name)}
                  className="px-3 py-1.5 rounded-xl bg-wrong/10 text-wrong text-sm font-semibold
                    hover:bg-wrong/20 active:scale-95 transition-all"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
