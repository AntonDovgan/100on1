import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../../contexts/GameContext.js';

export function ResultsPage() {
  const game = useGame();
  const team1Score = game.teamScores.team1;
  const team2Score = game.teamScores.team2;
  const winnerId = team1Score > team2Score ? 'team1' : team1Score < team2Score ? 'team2' : null;

  useEffect(() => {
    // Fire confetti
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#E91E63', '#FFD700', '#9C27B0'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#E91E63', '#FFD700', '#9C27B0'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-primary mb-6">Результаты</h1>

        <div className="flex gap-6 mb-8">
          {(['team1', 'team2'] as const).map((teamId) => {
            const team = game.teams[teamId];
            const isWinner = teamId === winnerId;
            return (
              <div
                key={teamId}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg transition-all ${
                  isWinner ? 'ring-4 ring-gold scale-110' : ''
                }`}
              >
                {isWinner && <div className="text-3xl mb-2">👑</div>}
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}
                >
                  {team.name}
                </h3>
                <p className="text-4xl font-bold text-gray-800">{game.teamScores[teamId]}</p>
              </div>
            );
          })}
        </div>

        {winnerId && (
          <p className="text-xl font-bold text-gold-dark mb-4">
            Победитель: {game.teams[winnerId].name}!
          </p>
        )}
        {!winnerId && (
          <p className="text-xl font-bold text-purple mb-4">Ничья!</p>
        )}

        <div className="mt-8">
          <p className="text-2xl">💐 С 8 Марта! 💐</p>
          <p className="text-gray-500 mt-2">Спасибо за игру!</p>
        </div>
      </div>
    </div>
  );
}
