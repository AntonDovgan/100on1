import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../../contexts/GameContext.js';
import { useSound } from '../../contexts/SoundContext.js';
import { AnswerBoard } from '../../components/game/AnswerBoard.js';
import { StrikeDisplay } from '../../components/game/StrikeDisplay.js';
import { Countdown } from '../../components/game/Countdown.js';
import { ROUND_CONFIG } from 'shared';
import { socket } from '../../socket.js';
import type { TeamId } from 'shared';

export function PublicDisplayPage() {
  const game = useGame();
  const { unlockAudio, isUnlocked } = useSound();
  const round = game.currentRound;
  const roundConfig = ROUND_CONFIG[round.roundType];
  const players = Object.values(game.players);
  const [buzzerWinner, setBuzzerWinner] = useState<{ teamId: TeamId; playerName: string } | null>(null);

  useEffect(() => {
    socket.on('buzzer:won', (data) => setBuzzerWinner(data));
    return () => { socket.off('buzzer:won'); };
  }, []);

  useEffect(() => {
    if (game.phase !== 'buzzerRace') setBuzzerWinner(null);
  }, [game.phase]);

  // Confetti on game over
  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    const end = Date.now() + 5000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#E91E63', '#FFD700', '#9C27B0'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#E91E63', '#FFD700', '#9C27B0'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [game.phase]);

  const team1Score = game.teamScores.team1;
  const team2Score = game.teamScores.team2;
  const winnerId = team1Score > team2Score ? 'team1' : team1Score < team2Score ? 'team2' : null;
  const stealTeamId = round.activeTeamId === 'team1' ? 'team2' : 'team1';

  return (
    <div className="flex flex-col min-h-screen px-8 py-6" onClick={() => { if (!isUnlocked) unlockAudio(); }}>
      {/* Audio unlock overlay for iOS */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-pointer">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <p className="text-2xl mb-2">🔊</p>
            <p className="text-xl font-bold text-gray-700">Нажмите для включения звука</p>
          </div>
        </div>
      )}

      {/* Header — always visible */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-primary">100 к 1</h1>
          <p className="text-purple text-lg">8 Марта 💐</p>
        </div>

        {game.phase !== 'registration' && game.phase !== 'teamReveal' && game.phase !== 'gameOver' && (
          <div className="text-right">
            <span className="inline-block px-4 py-1 rounded-full text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #E91E63, #9C27B0)' }}>
              {roundConfig.nameRu} {round.multiplier > 1 ? `×${round.multiplier}` : ''}
            </span>
            <p className="text-gray-400 mt-1 text-sm">Раунд {round.roundNumber}</p>
          </div>
        )}
      </div>

      {/* Scores — visible during game */}
      {game.phase !== 'registration' && game.phase !== 'teamReveal' && game.phase !== 'gameOver' && (
        <div className="flex gap-6 mb-6 justify-center">
          {(['team1', 'team2'] as const).map((teamId) => {
            const team = game.teams[teamId];
            const isActive = round.activeTeamId === teamId;
            return (
              <div
                key={teamId}
                className={`flex-1 max-w-sm rounded-2xl p-4 text-center transition-all ${
                  isActive ? 'bg-white/90 ring-4 ring-gold scale-105 shadow-xl' : 'bg-white/60 shadow-lg'
                }`}
              >
                <h3 className="text-xl font-bold" style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
                  {team.name}
                </h3>
                <p className="text-5xl font-bold text-gray-800 mt-1">{game.teamScores[teamId]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* Registration */}
        {game.phase === 'registration' && (
          <div className="animate-fade-in text-center w-full max-w-3xl">
            <p className="text-3xl text-gray-500 mb-6">Ожидаем участников...</p>
            <p className="text-7xl font-bold text-primary mb-8">
              {players.length}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {players.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-5 py-2 shadow text-lg"
                >
                  <span className={`w-3 h-3 rounded-full ${p.isConnected ? 'bg-correct' : 'bg-gray-300'}`} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Team Reveal */}
        {game.phase === 'teamReveal' && (
          <div className="animate-fade-in w-full max-w-4xl">
            <h2 className="text-4xl font-bold text-center text-gray-700 mb-8">Команды сформированы!</h2>
            <div className="flex gap-8">
              {(['team1', 'team2'] as const).map((teamId) => {
                const team = game.teams[teamId];
                const color = teamId === 'team1' ? '#E91E63' : '#9C27B0';
                return (
                  <div
                    key={teamId}
                    className="flex-1 bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border-l-8"
                    style={{ borderColor: color }}
                  >
                    <h3 className="text-3xl font-bold mb-4" style={{ color }}>{team.name}</h3>
                    <div className="space-y-2">
                      {team.players.map((pid) => {
                        const p = game.players[pid];
                        return p ? (
                          <div key={pid} className="text-xl px-3 py-2 rounded-lg bg-gray-50">{p.name}</div>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Round Intro */}
        {game.phase === 'roundIntro' && (
          <div className="animate-fade-in text-center">
            <div className="text-8xl mb-6">🎮</div>
            <h2 className="text-6xl font-bold text-primary">{roundConfig.nameRu}</h2>
            {round.multiplier > 1 && (
              <p className="text-gold-dark text-4xl font-bold mt-4">Очки ×{round.multiplier}</p>
            )}
            <p className="text-gray-400 text-2xl mt-6">Раунд {round.roundNumber}</p>
          </div>
        )}

        {/* Buzzer Race */}
        {game.phase === 'buzzerRace' && (
          <div className="animate-fade-in text-center w-full max-w-4xl">
            {round.question && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl mb-8">
                <p className="text-4xl font-bold text-gray-800">{round.question.text}</p>
              </div>
            )}
            {!buzzerWinner ? (
              <div className="text-3xl text-gray-400 animate-pulse">Жмите баззер!</div>
            ) : (
              <div className="animate-fade-in">
                <div className="text-7xl mb-4">🎯</div>
                <p className="text-4xl font-bold" style={{ color: buzzerWinner.teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
                  {buzzerWinner.playerName}
                </p>
                <p className="text-2xl text-gray-500 mt-2">
                  {game.teams[buzzerWinner.teamId].name} отвечает!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Team Answering / Steal Attempt */}
        {(game.phase === 'teamAnswering' || game.phase === 'stealAttempt') && round.question && (
          <div className="animate-fade-in w-full max-w-4xl">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl mb-6">
              <p className="text-3xl font-bold text-center text-gray-800">{round.question.text}</p>
            </div>

            {game.phase === 'stealAttempt' && (
              <div className="flex justify-center mb-4">
                <div className="py-3 px-6 rounded-full bg-gold/20 text-gold-dark font-bold text-2xl">
                  ПЕРЕХВАТ! {game.teams[stealTeamId].name} отвечает!
                </div>
              </div>
            )}

            <div className="flex gap-8 items-start">
              <div className="flex-1">
                <AnswerBoard answers={round.question.answers} />
              </div>
              <div className="flex flex-col items-center gap-6 min-w-[200px]">
                <StrikeDisplay strikes={round.strikes} />
                <div className="text-center bg-white/80 rounded-2xl p-4 shadow-lg w-full">
                  <p className="text-gray-400 text-sm">Очки за раунд</p>
                  <p className="text-5xl font-bold text-primary">{round.roundPoints}</p>
                  {round.multiplier > 1 && (
                    <p className="text-gold-dark text-lg font-bold">×{round.multiplier} = {round.roundPoints * round.multiplier}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reverse Answering */}
        {game.phase === 'reverseAnswering' && round.question && (
          <div className="animate-fade-in w-full max-w-4xl">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl mb-6">
              <p className="text-3xl font-bold text-center text-gray-800">{round.question.text}</p>
              <p className="text-center text-xl text-gold-dark mt-2">Игра наоборот — чем реже ответ, тем больше очков!</p>
            </div>
            <AnswerBoard answers={round.question.answers} />
          </div>
        )}

        {/* Big Game Player 1 & 2 */}
        {(game.phase === 'bigGamePlayer1' || game.phase === 'bigGamePlayer2') && round.bigGameState && (
          <div className="animate-fade-in w-full max-w-4xl">
            <div className="text-center mb-6">
              <h2 className="text-5xl font-bold text-primary mb-2">Большая игра</h2>
              <p className="text-2xl text-gray-500">
                {game.phase === 'bigGamePlayer1'
                  ? `Игрок 1: ${game.players[round.bigGameState.player1Id]?.name ?? ''} (15 сек)`
                  : `Игрок 2: ${game.players[round.bigGameState.player2Id]?.name ?? ''} (20 сек)`
                }
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <Countdown />
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl">
              <div className="space-y-4">
                {(round.bigGameState.questions ?? []).map((q, i) => {
                  const answers = game.phase === 'bigGamePlayer1'
                    ? round.bigGameState!.player1Answers
                    : round.bigGameState!.player2Answers;
                  const a = answers[i];
                  return (
                    <div key={q.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <p className="text-xl font-medium text-gray-800">{i + 1}. {q.text}</p>
                      <span className={`text-3xl font-bold min-w-[60px] text-right ${a ? 'text-primary' : 'text-gray-300'}`}>
                        {a?.points ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-primary/20 text-center">
                <span className="text-xl text-gray-400">Итого: </span>
                <span className="text-5xl font-bold text-primary">{round.bigGameState.totalPoints}</span>
                <span className="text-xl text-gray-400"> / 200</span>
              </div>
            </div>
          </div>
        )}

        {/* Big Game Reveal */}
        {game.phase === 'bigGameReveal' && round.bigGameState && (
          <div className="animate-fade-in text-center">
            <div className="text-9xl mb-6">
              {round.bigGameState.totalPoints >= 200 ? '🏆' : '👏'}
            </div>
            <h2 className="text-7xl font-bold text-primary mb-4">
              {round.bigGameState.totalPoints >= 200 ? 'ПОБЕДА!' : 'Отличная игра!'}
            </h2>
            <p className="text-5xl font-bold text-gray-700">
              {round.bigGameState.totalPoints} / 200
            </p>
          </div>
        )}

        {/* Round Result */}
        {game.phase === 'roundResult' && (
          <div className="animate-fade-in text-center w-full max-w-4xl">
            <div className="text-8xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-gray-600 mb-4">Раунд завершён!</h2>
            <p className="text-6xl font-bold text-primary mb-8">
              {round.roundPoints * round.multiplier}
            </p>
            {round.question && (
              <AnswerBoard answers={round.question.answers} />
            )}
          </div>
        )}

        {/* Game Over */}
        {game.phase === 'gameOver' && (
          <div className="animate-fade-in text-center">
            <div className="text-9xl mb-6">🏆</div>
            <h1 className="text-6xl font-bold text-primary mb-8">Игра завершена!</h1>

            <div className="flex gap-8 mb-8 justify-center">
              {(['team1', 'team2'] as const).map((teamId) => {
                const team = game.teams[teamId];
                const isWinner = teamId === winnerId;
                return (
                  <div
                    key={teamId}
                    className={`bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl transition-all ${
                      isWinner ? 'ring-4 ring-gold scale-110' : ''
                    }`}
                  >
                    {isWinner && <div className="text-5xl mb-3">👑</div>}
                    <h3 className="text-3xl font-bold mb-2" style={{ color: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
                      {team.name}
                    </h3>
                    <p className="text-6xl font-bold text-gray-800">{game.teamScores[teamId]}</p>
                  </div>
                );
              })}
            </div>

            {winnerId && (
              <p className="text-4xl font-bold text-gold-dark mb-6">
                Победитель: {game.teams[winnerId].name}!
              </p>
            )}
            {!winnerId && (
              <p className="text-4xl font-bold text-purple mb-6">Ничья!</p>
            )}

            <p className="text-5xl mt-8">💐 С 8 Марта! 💐</p>
            <p className="text-2xl text-gray-400 mt-3">Спасибо за игру!</p>
          </div>
        )}
      </div>
    </div>
  );
}
