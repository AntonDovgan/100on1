import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext.js';
import { ScoreDisplay } from '../../components/game/ScoreDisplay.js';
import { ROUND_CONFIG, BIG_GAME_QUESTIONS_COUNT } from 'shared';
import { socket } from '../../socket.js';
import type { TeamId } from 'shared';

export function AdminGamePage() {
  const game = useGame();
  const navigate = useNavigate();
  const round = game.currentRound;
  const roundConfig = ROUND_CONFIG[round.roundType];
  const [bigGamePlayer1, setBigGamePlayer1] = useState('');
  const [bigGamePlayer2, setBigGamePlayer2] = useState('');

  useEffect(() => {
    if (game.phase === 'registration' || game.phase === 'teamReveal') {
      navigate('/admin/lobby');
    }
  }, [game.phase, navigate]);

  const handleReveal = (answerId: number) => {
    socket.emit('admin:revealAnswer', { answerId });
  };

  const handleStrike = () => {
    socket.emit('admin:markStrike');
  };

  const handleAward = (teamId: TeamId) => {
    socket.emit('admin:awardRound', { teamId });
  };

  const handleNextRound = () => {
    socket.emit('admin:startRound');
  };

  const handleOpenBuzzer = () => {
    socket.emit('admin:openBuzzer');
  };

  const handleStartSteal = () => {
    socket.emit('admin:startSteal');
  };

  const handleReverseAnswer = (answerId: number, teamId: TeamId) => {
    socket.emit('admin:revealReverseAnswer', { answerId, teamId });
  };

  const handleStartBigGame = () => {
    if (bigGamePlayer1 && bigGamePlayer2 && bigGamePlayer1 !== bigGamePlayer2) {
      socket.emit('admin:selectBigGamePlayers', { player1Id: bigGamePlayer1, player2Id: bigGamePlayer2 });
    }
  };

  const handleBigGameTimer = () => {
    socket.emit('admin:startBigGameTimer');
  };

  const handleBigGameAnswer = (playerNumber: 1 | 2, questionIndex: number, points: number) => {
    socket.emit('admin:markBigGameAnswer', { playerNumber, questionIndex, points });
  };

  const handleFinishBigGamePlayer1 = () => {
    socket.emit('admin:nextPhase');
  };

  const handleGameOver = () => {
    socket.emit('admin:nextPhase');
  };

  const handleScoreOverride = (teamId: TeamId, delta: number) => {
    socket.emit('admin:overrideScore', { teamId, score: game.teamScores[teamId] + delta });
  };

  const handleReset = () => {
    if (confirm('Точно сбросить игру? Все данные будут потеряны.')) {
      socket.emit('admin:resetGame');
      navigate('/admin/lobby');
    }
  };

  // Get winning team for big game player selection
  const winningTeamId: TeamId = game.teamScores.team1 >= game.teamScores.team2 ? 'team1' : 'team2';
  const winningTeamPlayers = game.teams[winningTeamId].players
    .map(pid => game.players[pid])
    .filter(Boolean);

  return (
    <div className="min-h-screen px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E91E63, #9C27B0)' }}>
            {roundConfig.nameRu} {round.multiplier > 1 ? `×${round.multiplier}` : ''}
          </span>
          <span className="text-xs text-gray-400 ml-2">Раунд {round.roundNumber}/5</span>
        </div>
        <button onClick={handleReset} className="text-xs px-3 py-1 rounded-lg bg-gray-200 text-gray-600 hover:bg-wrong hover:text-white transition-all">
          Сброс
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <ScoreDisplay />

        {/* Score override buttons */}
        <div className="flex justify-between mt-2 mb-4">
          {(['team1', 'team2'] as const).map((teamId) => (
            <div key={teamId} className="flex gap-1">
              <button onClick={() => handleScoreOverride(teamId, -10)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">-10</button>
              <button onClick={() => handleScoreOverride(teamId, 10)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">+10</button>
            </div>
          ))}
        </div>

        {/* Phase: roundIntro */}
        {game.phase === 'roundIntro' && (
          <div className="text-center py-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-primary mb-4">{roundConfig.nameRu}</h2>
            {round.question && (
              <p className="text-lg text-gray-700 mb-6 bg-white/80 p-4 rounded-xl">{round.question.text}</p>
            )}

            {round.roundType === 'bigGame' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Выберите 2 игроков от команды «{game.teams[winningTeamId].name}»:</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <select value={bigGamePlayer1} onChange={e => setBigGamePlayer1(e.target.value)}
                    className="px-4 py-2 rounded-xl border-2 border-primary/30">
                    <option value="">Игрок 1</option>
                    {winningTeamPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select value={bigGamePlayer2} onChange={e => setBigGamePlayer2(e.target.value)}
                    className="px-4 py-2 rounded-xl border-2 border-primary/30">
                    <option value="">Игрок 2</option>
                    {winningTeamPlayers.filter(p => p.id !== bigGamePlayer1).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleStartBigGame}
                  disabled={!bigGamePlayer1 || !bigGamePlayer2}
                  className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark active:scale-95 disabled:opacity-50 transition-all">
                  Начать Большую игру
                </button>
              </div>
            ) : round.roundType === 'reverse' ? (
              <button onClick={() => socket.emit('admin:nextPhase')}
                className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark active:scale-95 transition-all">
                Начать раунд
              </button>
            ) : (
              <button onClick={handleOpenBuzzer}
                className="px-6 py-3 rounded-xl bg-red-500 text-white text-xl font-bold hover:bg-red-600 active:scale-95 transition-all animate-pulse-glow">
                Открыть баззер!
              </button>
            )}
          </div>
        )}

        {/* Phase: buzzerRace */}
        {game.phase === 'buzzerRace' && (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-4xl mb-4 animate-pulse-glow inline-block p-4 rounded-full">🔔</div>
            <p className="text-xl font-bold text-gray-600">Ожидание баззера...</p>
            {round.question && (
              <p className="text-lg text-gray-700 mt-4 bg-white/80 p-4 rounded-xl">{round.question.text}</p>
            )}
            {/* Override buttons */}
            <div className="flex gap-4 justify-center mt-6">
              {(['team1', 'team2'] as const).map(teamId => (
                <button key={teamId} onClick={() => {
                  socket.emit('admin:revealAnswer', { answerId: -1 }); // dummy to stop
                  // Manually set buzzer winner
                  game.currentRound.buzzerWinner = teamId;
                }}
                  className="px-4 py-2 rounded-xl text-white text-sm"
                  style={{ backgroundColor: teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
                  {game.teams[teamId].name} отвечает
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase: teamAnswering / stealAttempt */}
        {(game.phase === 'teamAnswering' || game.phase === 'stealAttempt') && round.question && (
          <div className="animate-fade-in">
            <div className="bg-white/80 rounded-2xl p-4 shadow-lg mb-4">
              <p className="text-center font-semibold text-gray-800">{round.question.text}</p>
            </div>

            {game.phase === 'stealAttempt' && (
              <div className="text-center mb-3 py-2 px-4 rounded-full bg-gold/20 text-gold-dark font-semibold text-sm">
                ПЕРЕХВАТ!
              </div>
            )}

            {/* Strikes indicator */}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${i <= round.strikes ? 'bg-wrong text-white' : 'bg-gray-200 text-gray-400'}`}>
                  ✕
                </div>
              ))}
            </div>

            {/* Answer board with admin controls */}
            <div className="space-y-2 mb-4">
              {round.question.answers.map((answer) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <div className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl shadow-sm ${
                    answer.isRevealed
                      ? 'bg-correct/90 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                        {answer.id}
                      </span>
                      <span className="font-medium text-sm">{answer.text}</span>
                    </div>
                    <span className="font-bold">{answer.points}</span>
                  </div>
                  {!answer.isRevealed && (
                    <button
                      onClick={() => handleReveal(answer.id)}
                      className="px-3 py-3 rounded-xl bg-correct text-white text-xs font-bold hover:bg-correct/80 active:scale-95 transition-all shrink-0"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {game.phase === 'teamAnswering' && (
                <>
                  <button onClick={handleStrike}
                    className="px-4 py-2 rounded-xl bg-wrong text-white font-semibold text-sm hover:bg-wrong/80 active:scale-95 transition-all">
                    Штраф ✕
                  </button>
                  {round.strikes >= 3 && (
                    <button onClick={handleStartSteal}
                      className="px-4 py-2 rounded-xl bg-gold text-gray-800 font-semibold text-sm hover:bg-gold-dark active:scale-95 transition-all">
                      Перехват
                    </button>
                  )}
                </>
              )}
              <button onClick={() => handleAward('team1')}
                className="px-4 py-2 rounded-xl bg-team1 text-white font-semibold text-sm hover:opacity-80 active:scale-95 transition-all">
                Очки → {game.teams.team1.name}
              </button>
              <button onClick={() => handleAward('team2')}
                className="px-4 py-2 rounded-xl bg-team2 text-white font-semibold text-sm hover:opacity-80 active:scale-95 transition-all">
                Очки → {game.teams.team2.name}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                Очки за раунд: <span className="font-bold text-primary">{round.roundPoints}</span>
                {round.multiplier > 1 && <span className="text-gold-dark"> (×{round.multiplier} = {round.roundPoints * round.multiplier})</span>}
              </p>
            </div>
          </div>
        )}

        {/* Phase: reverseAnswering */}
        {game.phase === 'reverseAnswering' && round.question && (
          <div className="animate-fade-in">
            <div className="bg-white/80 rounded-2xl p-4 shadow-lg mb-4">
              <p className="text-center font-semibold text-gray-800">{round.question.text}</p>
              <p className="text-center text-sm text-gold-dark mt-1">Игра наоборот — чем менее популярный ответ, тем больше очков!</p>
            </div>

            <div className="space-y-2 mb-4">
              {round.question.answers.map((answer) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <div className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl shadow-sm ${
                    answer.isRevealed ? 'bg-correct/90 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    <span className="font-medium text-sm">{answer.text}</span>
                    <span className="font-bold">{answer.points}</span>
                  </div>
                  {!answer.isRevealed && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleReverseAnswer(answer.id, 'team1')}
                        className="px-2 py-2 rounded-lg bg-team1 text-white text-xs hover:opacity-80">
                        К1
                      </button>
                      <button onClick={() => handleReverseAnswer(answer.id, 'team2')}
                        className="px-2 py-2 rounded-lg bg-team2 text-white text-xs hover:opacity-80">
                        К2
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <button onClick={() => { handleAward(winningTeamId); }}
                className="px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark active:scale-95 transition-all">
                Завершить раунд
              </button>
            </div>
          </div>
        )}

        {/* Big Game phases */}
        {(game.phase === 'bigGamePlayer1' || game.phase === 'bigGamePlayer2') && round.bigGameState && (
          <div className="animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-primary">Большая игра</h2>
              <p className="text-sm text-gray-500">
                {game.phase === 'bigGamePlayer1'
                  ? `Игрок 1: ${game.players[round.bigGameState.player1Id]?.name} (15 сек)`
                  : `Игрок 2: ${game.players[round.bigGameState.player2Id]?.name} (20 сек)`
                }
              </p>
            </div>

            <button onClick={handleBigGameTimer}
              className="w-full mb-4 py-3 rounded-xl bg-gold text-gray-800 font-bold hover:bg-gold-dark active:scale-95 transition-all">
              Запустить таймер
            </button>

            <div className="space-y-3">
              {Array.from({ length: BIG_GAME_QUESTIONS_COUNT }).map((_, i) => {
                const playerNum = game.phase === 'bigGamePlayer1' ? 1 : 2;
                const answers = playerNum === 1
                  ? round.bigGameState!.player1Answers
                  : round.bigGameState!.player2Answers;
                const existing = answers[i];
                const questionText = round.bigGameState!.questions?.[i]?.text;

                return (
                  <div key={i} className="bg-white/80 rounded-xl p-3 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Вопрос {i + 1}</p>
                    {questionText && (
                      <p className="text-sm font-semibold text-gray-800 mb-2">{questionText}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40].map(pts => (
                        <button key={pts}
                          onClick={() => handleBigGameAnswer(playerNum as 1 | 2, i, pts)}
                          className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                            existing?.points === pts
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <p className="text-lg font-bold text-primary">Итого: {round.bigGameState.totalPoints} / 200</p>
              {game.phase === 'bigGamePlayer1' && (
                <button onClick={() => {
                  const bg = round.bigGameState!;
                  bg.isPlayer1Done = true;
                  bg.currentQuestionIndex = 0;
                  socket.emit('admin:nextPhase');
                }}
                  className="mt-3 px-6 py-2 rounded-xl bg-purple text-white font-semibold text-sm hover:bg-purple-light active:scale-95 transition-all">
                  Игрок 2
                </button>
              )}
              {game.phase === 'bigGamePlayer2' && (
                <button onClick={() => socket.emit('admin:nextPhase')}
                  className="mt-3 px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark active:scale-95 transition-all">
                  Показать результат
                </button>
              )}
            </div>
          </div>
        )}

        {/* Big Game Reveal */}
        {game.phase === 'bigGameReveal' && round.bigGameState && (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-6xl mb-4">
              {round.bigGameState.totalPoints >= 200 ? '🏆' : '👏'}
            </div>
            <h2 className="text-3xl font-bold text-primary mb-2">
              {round.bigGameState.totalPoints >= 200 ? 'ПОБЕДА!' : 'Отличная попытка!'}
            </h2>
            <p className="text-2xl font-bold mb-6">
              {round.bigGameState.totalPoints} / 200
            </p>
            <button onClick={handleGameOver}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark active:scale-95 transition-all">
              Завершить игру
            </button>
          </div>
        )}

        {/* Round Result */}
        {game.phase === 'roundResult' && (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-600 mb-4">Раунд завершён!</h2>

            {round.question && (
              <div className="space-y-2 mb-6 max-w-md mx-auto">
                {round.question.answers.map(a => (
                  <div key={a.id} className={`flex justify-between px-4 py-2 rounded-xl text-sm ${
                    a.isRevealed ? 'bg-correct/20 text-correct' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span>{a.id}. {a.text}</span>
                    <span className="font-bold">{a.points}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleNextRound}
              className="px-6 py-3 rounded-xl bg-primary text-white text-lg font-semibold hover:bg-primary-dark active:scale-95 transition-all">
              {round.roundNumber >= 5 ? 'Результаты' : 'Следующий раунд'}
            </button>
          </div>
        )}

        {/* Game Over */}
        {game.phase === 'gameOver' && (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-primary mb-6">Игра завершена!</h2>
            <button onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-gray-500 text-white font-semibold hover:bg-gray-600 active:scale-95 transition-all">
              Новая игра
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
