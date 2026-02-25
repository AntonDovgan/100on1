import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { socket } from '../../socket.js';
import type { TeamId } from 'shared';

interface Props {
  disabled: boolean;
  winner: { teamId: TeamId; playerName: string } | null;
}

export function BuzzerButton({ disabled, winner }: Props) {
  const [pressed, setPressed] = useState(false);

  const handleBuzz = useCallback(() => {
    if (disabled || pressed) return;
    setPressed(true);
    socket.emit('player:buzzer');
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(100);
  }, [disabled, pressed]);

  useEffect(() => {
    if (!disabled) setPressed(false);
  }, [disabled]);

  if (winner) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-6xl mb-4">🎯</div>
        <p className="text-xl font-bold" style={{ color: winner.teamId === 'team1' ? '#E91E63' : '#9C27B0' }}>
          {winner.playerName}
        </p>
        <p className="text-gray-500 text-sm">нажал(а) первым!</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <motion.button
        onTap={handleBuzz}
        disabled={disabled || pressed}
        whileTap={{ scale: 0.9 }}
        className={`w-40 h-40 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl transition-colors
          ${disabled || pressed
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-500 animate-pulse-glow cursor-pointer active:bg-red-700'
          }`}
      >
        {pressed ? '✓' : 'ЖМИ!'}
      </motion.button>
    </div>
  );
}
