import { Routes, Route, Navigate } from 'react-router-dom';
import { usePlayer } from './contexts/PlayerContext.js';
import { JoinPage } from './pages/player/JoinPage.js';
import { LobbyPage } from './pages/player/LobbyPage.js';
import { GamePage } from './pages/player/GamePage.js';
import { ResultsPage } from './pages/player/ResultsPage.js';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.js';
import { AdminLobbyPage } from './pages/admin/AdminLobbyPage.js';
import { AdminGamePage } from './pages/admin/AdminGamePage.js';
import { PublicDisplayPage } from './pages/display/PublicDisplayPage.js';
import { FestiveBackground } from './components/layout/FestiveBackground.js';

export function App() {
  const { playerId, isAdmin } = usePlayer();

  return (
    <div className="min-h-full relative">
      <FestiveBackground />
      <div className="relative z-10">
        <Routes>
          {/* Player routes */}
          <Route path="/" element={playerId ? <Navigate to="/lobby" /> : <JoinPage />} />
          <Route path="/lobby" element={playerId ? <LobbyPage /> : <Navigate to="/" />} />
          <Route path="/game" element={playerId ? <GamePage /> : <Navigate to="/" />} />
          <Route path="/results" element={<ResultsPage />} />

          {/* Public display (projector/TV) */}
          <Route path="/display" element={<PublicDisplayPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={isAdmin ? <Navigate to="/admin/lobby" /> : <AdminLoginPage />} />
          <Route path="/admin/lobby" element={isAdmin ? <AdminLobbyPage /> : <Navigate to="/admin" />} />
          <Route path="/admin/game" element={isAdmin ? <AdminGamePage /> : <Navigate to="/admin" />} />
        </Routes>
      </div>
    </div>
  );
}
