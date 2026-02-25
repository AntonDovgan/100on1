import { useEffect, useState } from 'react';
import { socket } from '../../socket.js';

export function Countdown() {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    socket.on('timer:tick', (data) => setSeconds(data.secondsLeft));
    socket.on('timer:expired', () => setSeconds(0));
    return () => {
      socket.off('timer:tick');
      socket.off('timer:expired');
    };
  }, []);

  if (seconds === null) return null;

  const isUrgent = seconds <= 5;

  return (
    <div className={`text-center py-4 ${isUrgent ? 'animate-shake' : ''}`}>
      <div
        className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold
          ${isUrgent ? 'bg-wrong text-white' : 'bg-gold/20 text-gold-dark'}`}
      >
        {seconds}
      </div>
    </div>
  );
}
