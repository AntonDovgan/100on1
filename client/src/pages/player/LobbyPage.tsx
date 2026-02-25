import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext.js';
import { usePlayer } from '../../contexts/PlayerContext.js';

export function LobbyPage() {
  const game = useGame();
  const { playerName } = usePlayer();
  const navigate = useNavigate();
  const players = Object.values(game.players);

  useEffect(() => {
    if (game.phase !== 'registration' && game.phase !== 'teamReveal') {
      navigate('/game');
    }
  }, [game.phase, navigate]);

  return (
    <div className="flex flex-col items-center min-h-screen px-4 pt-8">
      <div className="text-center mb-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-primary">100 к 1</h1>
        <p className="text-purple mt-1">8 Марта 💐</p>
      </div>

      {game.phase === 'registration' && (
        <>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm shadow-lg mb-4">
            <p className="text-center text-gray-500 text-sm mb-3">
              Привет, <span className="font-bold text-primary">{playerName}</span>!
              Ждём остальных игроков...
            </p>
            <p className="text-center text-2xl font-bold text-purple">
              {players.length} {players.length === 1 ? 'игрок' : players.length < 5 ? 'игрока' : 'игроков'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm shadow-lg">
            <h3 className="font-semibold text-gray-600 mb-2 text-sm">Участники:</h3>
            <div className="space-y-1">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    p.name === playerName ? 'bg-primary/10 font-semibold' : 'bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-correct' : 'bg-gray-300'}`} />
                  <span>{p.name}</span>
                  {p.name === playerName && <span className="text-xs text-primary">(вы)</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {game.phase === 'teamReveal' && (
        <div className="w-full max-w-sm space-y-4 animate-fade-in">
          <p className="text-center text-lg font-semibold text-gray-600 mb-4">Команды сформированы!</p>

          {(['team1', 'team2'] as const).map((teamId) => {
            const team = game.teams[teamId];
            return (
              <div
                key={teamId}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-l-4"
                style={{ borderColor: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}
              >
                <h3 className="font-bold text-lg" style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
                  {team.name}
                </h3>
                <div className="mt-2 space-y-1">
                  {team.players.map((pid) => {
                    const p = game.players[pid];
                    return p ? (
                      <div key={pid} className="text-sm px-2 py-1 rounded bg-gray-50">
                        {p.name}
                        {p.name === playerName && <span className="text-xs text-primary ml-1">(вы)</span>}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}

          <p className="text-center text-sm text-gray-400 mt-4">Ожидание начала игры...</p>
        </div>
      )}
    </div>
  );
}
