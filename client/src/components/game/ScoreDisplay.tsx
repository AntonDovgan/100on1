import type { TeamId } from 'shared';
import { useGame } from '../../contexts/GameContext.js';

export function ScoreDisplay() {
  const game = useGame();

  return (
    <div className="flex justify-between items-center gap-4 w-full">
      {(['team1', 'team2'] as const).map((teamId: TeamId) => {
        const team = game.teams[teamId];
        const isActive = game.currentRound.activeTeamId === teamId;
        return (
          <div
            key={teamId}
            className={`flex-1 text-center p-3 rounded-xl transition-all ${
              isActive ? 'ring-2 ring-gold scale-105 bg-white/90' : 'bg-white/60'
            }`}
          >
            <p
              className="text-sm font-semibold truncate"
              style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}
            >
              {team.name}
            </p>
            <p className="text-2xl font-bold text-gray-800">
              {game.teamScores[teamId]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
