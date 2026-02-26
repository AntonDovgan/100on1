import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext.js';
import { PlayerProvider } from './contexts/PlayerContext.js';
import { RoomProvider } from './contexts/RoomContext.js';
import { SoundProvider } from './contexts/SoundContext.js';
import { App } from './App.js';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RoomProvider>
        <GameProvider>
          <PlayerProvider>
            <SoundProvider>
              <App />
            </SoundProvider>
          </PlayerProvider>
        </GameProvider>
      </RoomProvider>
    </BrowserRouter>
  </StrictMode>
);
