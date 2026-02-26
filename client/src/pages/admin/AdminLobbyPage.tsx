import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext.js';
import { useRoom } from '../../contexts/RoomContext.js';
import { socket } from '../../socket.js';
import type { TeamId } from 'shared';

export function AdminLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const game = useGame();
  const { leaveRoom, kickPlayer, currentRoomId } = useRoom();
  const navigate = useNavigate();
  const players = Object.values(game.players);

  useEffect(() => {
    if (game.phase !== 'registration' && game.phase !== 'teamReveal') {
      navigate(`/admin/room/${roomId}/game`);
    }
  }, [game.phase, navigate, roomId]);

  const handleShuffle = () => {
    socket.emit('admin:shuffleTeams');
  };

  const handleConfirm = () => {
    socket.emit('admin:confirmTeams', {
      teams: {
        team1: game.teams.team1.players,
        team2: game.teams.team2.players,
      },
    });
  };

  const movePlayer = (playerId: string, to: TeamId) => {
    const from: TeamId = to === 'team1' ? 'team2' : 'team1';
    const newTeam1 = to === 'team1'
      ? [...game.teams.team1.players, playerId]
      : game.teams.team1.players.filter(id => id !== playerId);
    const newTeam2 = to === 'team2'
      ? [...game.teams.team2.players, playerId]
      : game.teams.team2.players.filter(id => id !== playerId);

    socket.emit('admin:confirmTeams', { teams: { team1: newTeam1, team2: newTeam2 } });
  };

  const hasTeams = game.teams.team1.players.length > 0 || game.teams.team2.players.length > 0;

  return (
    <div className="min-h-screen px-4 pt-4 pb-8">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl font-bold text-primary">Админ-панель</h1>
          <button
            onClick={() => { leaveRoom(); navigate('/admin/rooms'); }}
            className="text-xs px-3 py-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
          >
            К комнатам
          </button>
        </div>
        <p className="text-sm text-gray-500">Игроков: {players.length} | Онлайн: {players.filter(p => p.isConnected).length}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center mb-4 flex-wrap">
        <button
          onClick={handleShuffle}
          disabled={players.length < 2}
          className="px-4 py-2 rounded-xl bg-purple text-white font-semibold text-sm hover:bg-purple-light active:scale-95 disabled:opacity-50 transition-all"
        >
          Перемешать команды
        </button>
        {hasTeams && game.phase === 'registration' && (
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-correct text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            Утвердить и показать
          </button>
        )}
        {game.phase === 'teamReveal' && (
          <button
            onClick={() => socket.emit('admin:startRound')}
            className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark active:scale-95 transition-all"
          >
            Начать игру!
          </button>
        )}
      </div>

      {/* Player list (before teams) */}
      {!hasTeams && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg max-w-lg mx-auto">
          <h3 className="font-semibold text-gray-600 mb-2">Зарегистрированные игроки:</h3>
          <div className="space-y-1">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-correct' : 'bg-wrong'}`} />
                  <span className="font-medium">{p.name}</span>
                </div>
                <button
                  onClick={() => { if (currentRoomId && confirm(`Удалить ${p.name} из игры?`)) kickPlayer(currentRoomId, p.id); }}
                  className="text-xs px-2 py-0.5 rounded bg-wrong/10 text-wrong hover:bg-wrong/20"
                  title="Удалить из игры"
                >
                  ✕
                </button>
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-gray-400 text-center py-4">Ожидание игроков...</p>
            )}
          </div>
        </div>
      )}

      {/* Teams (after shuffle) */}
      {hasTeams && (
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {(['team1', 'team2'] as const).map((teamId) => {
            const team = game.teams[teamId];
            const otherTeamId: TeamId = teamId === 'team1' ? 'team2' : 'team1';
            return (
              <div
                key={teamId}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
              >
                <h3
                  className="font-bold text-lg mb-3"
                  style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}
                >
                  {team.name} ({team.players.length})
                </h3>
                <div className="space-y-1">
                  {team.players.map((pid) => {
                    const p = game.players[pid];
                    if (!p) return null;
                    return (
                      <div key={pid} className="flex items-center justify-between px-2 py-1 rounded bg-gray-50 text-sm">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-correct' : 'bg-wrong'}`} />
                          <span>{p.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => movePlayer(pid, otherTeamId)}
                            className="text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300"
                            title={`Переместить в ${game.teams[otherTeamId].name}`}
                          >
                            →
                          </button>
                          <button
                            onClick={() => { if (currentRoomId && confirm(`Удалить ${p.name}?`)) kickPlayer(currentRoomId, pid); }}
                            className="text-xs px-2 py-0.5 rounded bg-wrong/10 text-wrong hover:bg-wrong/20"
                            title="Удалить из игры"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
