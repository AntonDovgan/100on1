import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext.js';
import { usePlayer } from '../../contexts/PlayerContext.js';
import { ScoreDisplay } from '../../components/game/ScoreDisplay.js';
import { AnswerBoard } from '../../components/game/AnswerBoard.js';
import { BuzzerButton } from '../../components/game/BuzzerButton.js';
import { StrikeDisplay } from '../../components/game/StrikeDisplay.js';
import { Countdown } from '../../components/game/Countdown.js';
import { ROUND_CONFIG } from 'shared';
import { socket } from '../../socket.js';
import type { TeamId } from 'shared';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const game = useGame();
  const { playerId } = usePlayer();
  const navigate = useNavigate();
  const round = game.currentRound;
  const roundConfig = ROUND_CONFIG[round.roundType];
  const [buzzerWinner, setBuzzerWinner] = useState<{ teamId: TeamId; playerName: string } | null>(null);

  useEffect(() => {
    if (game.phase === 'registration') navigate(`/room/${roomId}/lobby`);
    if (game.phase === 'gameOver') navigate(`/room/${roomId}/results`);
  }, [game.phase, navigate, roomId]);

  useEffect(() => {
    socket.on('buzzer:won', (data) => setBuzzerWinner(data));
    return () => { socket.off('buzzer:won'); };
  }, []);

  useEffect(() => {
    if (game.phase !== 'buzzerRace') setBuzzerWinner(null);
  }, [game.phase]);

  // Determine player's team
  const player = playerId ? game.players[playerId] : null;
  const myTeam = player?.teamId;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 pt-4 pb-8">
      {/* Header */}
      <div className="w-full max-w-md mb-4">
        <div className="text-center mb-3">
          <span className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E91E63, #9C27B0)' }}>
            {roundConfig.nameRu} {round.multiplier > 1 ? `×${round.multiplier}` : ''}
          </span>
        </div>
        <ScoreDisplay />
      </div>

      {/* Round Intro */}
      {game.phase === 'roundIntro' && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-primary">{roundConfig.nameRu}</h2>
          {round.multiplier > 1 && (
            <p className="text-gold-dark text-xl font-bold mt-2">Очки ×{round.multiplier}</p>
          )}
          <p className="text-gray-500 mt-4">Раунд {round.roundNumber}</p>
        </div>
      )}

      {/* Buzzer Race */}
      {game.phase === 'buzzerRace' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
          {round.question && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 w-full shadow-lg mb-6">
              <p className="text-center text-lg font-semibold text-gray-800">
                {round.question.text}
              </p>
            </div>
          )}
          <BuzzerButton disabled={!!buzzerWinner} winner={buzzerWinner} />
        </div>
      )}

      {/* Team Answering / Steal Attempt */}
      {(game.phase === 'teamAnswering' || game.phase === 'stealAttempt') && round.question && (
        <div className="flex-1 w-full max-w-md animate-fade-in">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 w-full shadow-lg mb-4">
            <p className="text-center text-lg font-semibold text-gray-800">
              {round.question.text}
            </p>
          </div>

          {game.phase === 'stealAttempt' && (
            <div className="text-center mb-3 py-2 px-4 rounded-full bg-gold/20 text-gold-dark font-semibold text-sm">
              Перехват! Команда {round.activeTeamId === 'team1' ? game.teams.team2.name : game.teams.team1.name} отвечает
            </div>
          )}

          <StrikeDisplay strikes={round.strikes} />

          <div className="mt-4">
            <AnswerBoard answers={round.question.answers} />
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Очки за раунд: <span className="font-bold text-lg text-primary">{round.roundPoints}</span>
            </p>
          </div>
        </div>
      )}

      {/* Reverse Answering */}
      {game.phase === 'reverseAnswering' && round.question && (
        <div className="flex-1 w-full max-w-md animate-fade-in">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 w-full shadow-lg mb-4">
            <p className="text-center text-lg font-semibold text-gray-800">
              {round.question.text}
            </p>
            <p className="text-center text-sm text-gold-dark mt-1">Найдите наименее популярный ответ!</p>
          </div>
          <div className="mt-4">
            <AnswerBoard answers={round.question.answers} />
          </div>
        </div>
      )}

      {/* Big Game */}
      {(game.phase === 'bigGamePlayer1' || game.phase === 'bigGamePlayer2') && round.bigGameState && (
        <div className="flex-1 w-full max-w-md animate-fade-in">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-primary">Большая игра</h2>
            <p className="text-sm text-gray-500">
              {game.phase === 'bigGamePlayer1'
                ? `Игрок 1: ${game.players[round.bigGameState.player1Id]?.name ?? ''} (15 сек)`
                : `Игрок 2: ${game.players[round.bigGameState.player2Id]?.name ?? ''} (20 сек)`
              }
            </p>
          </div>
          <Countdown />

          {/* Big Game questions & answers table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg mt-4">
            <div className="space-y-3">
              {(round.bigGameState.questions ?? []).map((q, i) => {
                const answers = game.phase === 'bigGamePlayer1'
                  ? round.bigGameState!.player1Answers
                  : round.bigGameState!.player2Answers;
                const a = answers[i];
                return (
                  <div key={q.id} className="py-2 border-b border-gray-100 last:border-0">
                    <p className="text-sm font-medium text-gray-800">{i + 1}. {q.text}</p>
                    <div className="flex justify-end mt-1">
                      <span className={`font-bold text-lg ${a ? 'text-primary' : 'text-gray-300'}`}>
                        {a?.points ?? '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-2 border-t-2 border-primary/20 text-center">
              <span className="text-sm text-gray-500">Итого: </span>
              <span className="text-xl font-bold text-primary">{round.bigGameState.totalPoints}</span>
              <span className="text-sm text-gray-400"> / 200</span>
            </div>
          </div>
        </div>
      )}

      {/* Big Game Reveal */}
      {game.phase === 'bigGameReveal' && round.bigGameState && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
          <div className="text-6xl mb-4">
            {round.bigGameState.totalPoints >= 200 ? '🏆' : '👏'}
          </div>
          <h2 className="text-3xl font-bold text-primary mb-2">
            {round.bigGameState.totalPoints >= 200 ? 'ПОБЕДА!' : 'Отличная игра!'}
          </h2>
          <p className="text-2xl font-bold">
            {round.bigGameState.totalPoints} / 200
          </p>
        </div>
      )}

      {/* Round Result */}
      {game.phase === 'roundResult' && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-600 mb-2">Раунд завершён!</h2>
          <div className="text-center">
            <p className="text-sm text-gray-500">Очки за раунд:</p>
            <p className="text-3xl font-bold text-primary">
              {round.roundPoints * round.multiplier}
            </p>
          </div>
          {round.question && (
            <div className="mt-6 w-full max-w-md">
              <AnswerBoard answers={round.question.answers} />
            </div>
          )}
        </div>
      )}

      {/* Team indicator */}
      {myTeam && (
        <div className="fixed bottom-4 left-4 right-4 text-center">
          <span
            className="inline-block px-4 py-1 rounded-full text-xs text-white"
            style={{ backgroundColor: myTeam === 'team1' ? '#E91E63' : '#9C27B0' }}
          >
            {game.teams[myTeam].name}
          </span>
        </div>
      )}
    </div>
  );
}
