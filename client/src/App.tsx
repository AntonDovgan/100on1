import { Routes, Route, Navigate } from 'react-router-dom';
import { usePlayer } from './contexts/PlayerContext.js';
import { useRoom } from './contexts/RoomContext.js';
import { RoomGuard } from './components/RoomGuard.js';
import { JoinPage } from './pages/player/JoinPage.js';
import { RoomListPage } from './pages/player/RoomListPage.js';
import { LobbyPage } from './pages/player/LobbyPage.js';
import { GamePage } from './pages/player/GamePage.js';
import { ResultsPage } from './pages/player/ResultsPage.js';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.js';
import { AdminRoomListPage } from './pages/admin/AdminRoomListPage.js';
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
          <Route path="/" element={playerId ? <Navigate to="/rooms" /> : <JoinPage />} />
          <Route path="/rooms" element={playerId ? <RoomListPage /> : <Navigate to="/" />} />
          <Route path="/room/:roomId/lobby" element={playerId ? <RoomGuard><LobbyPage /></RoomGuard> : <Navigate to="/" />} />
          <Route path="/room/:roomId/game" element={playerId ? <RoomGuard><GamePage /></RoomGuard> : <Navigate to="/" />} />
          <Route path="/room/:roomId/results" element={playerId ? <RoomGuard><ResultsPage /></RoomGuard> : <Navigate to="/" />} />

          {/* Backward-compat: old URLs redirect to room list */}
          <Route path="/lobby" element={<Navigate to="/rooms" replace />} />
          <Route path="/game" element={<Navigate to="/rooms" replace />} />
          <Route path="/results" element={<Navigate to="/rooms" replace />} />

          {/* Public display (projector/TV) */}
          <Route path="/display/:roomId" element={<PublicDisplayPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={isAdmin ? <Navigate to="/admin/rooms" /> : <AdminLoginPage />} />
          <Route path="/admin/rooms" element={isAdmin ? <AdminRoomListPage /> : <Navigate to="/admin" />} />
          <Route path="/admin/room/:roomId/lobby" element={isAdmin ? <RoomGuard isAdmin><AdminLobbyPage /></RoomGuard> : <Navigate to="/admin" />} />
          <Route path="/admin/room/:roomId/game" element={isAdmin ? <RoomGuard isAdmin><AdminGamePage /></RoomGuard> : <Navigate to="/admin" />} />

          {/* Backward-compat: old admin URLs */}
          <Route path="/admin/lobby" element={<Navigate to="/admin/rooms" replace />} />
          <Route path="/admin/game" element={<Navigate to="/admin/rooms" replace />} />
        </Routes>
      </div>
    </div>
  );
}
