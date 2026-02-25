import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { Howl } from 'howler';
import { socket } from '../socket.js';
import type { SoundEffect } from 'shared';

const soundFiles: Record<SoundEffect, string> = {
  correct: '/sounds/correct.wav',
  wrong: '/sounds/wrong.wav',
  buzzer: '/sounds/buzzer.wav',
  timerTick: '/sounds/timer-tick.wav',
  timerEnd: '/sounds/timer-end.wav',
  applause: '/sounds/applause.wav',
  roundStart: '/sounds/round-start.wav',
  bigWin: '/sounds/big-win.wav',
};

interface SoundCtx {
  play: (sound: SoundEffect) => void;
  unlockAudio: () => void;
  isUnlocked: boolean;
}

const SoundContext = createContext<SoundCtx>({
  play: () => {},
  unlockAudio: () => {},
  isUnlocked: false,
});

export function SoundProvider({ children }: { children: ReactNode }) {
  const sounds = useRef<Record<string, Howl>>({});
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    for (const [key, src] of Object.entries(soundFiles)) {
      sounds.current[key] = new Howl({ src: [src], preload: true, volume: 0.7 });
    }
  }, []);

  const play = useCallback((sound: SoundEffect) => {
    sounds.current[sound]?.play();
  }, []);

  const unlockAudio = useCallback(() => {
    const ctx = (Howler as any).ctx as AudioContext | undefined;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    // Play one of the existing sounds at zero volume to unlock audio on iOS
    const silent = new Howl({ src: ['/sounds/timer-tick.wav'], volume: 0 });
    silent.play();
    setIsUnlocked(true);
  }, []);

  useEffect(() => {
    socket.on('sound:play', (data) => play(data.sound));
    return () => { socket.off('sound:play'); };
  }, [play]);

  return (
    <SoundContext.Provider value={{ play, unlockAudio, isUnlocked }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}

// Need to declare Howler for the ctx access
declare const Howler: any;
