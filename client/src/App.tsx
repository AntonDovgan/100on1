import { Routes, Route, Navigate } from 'react-router-dom';
import { usePlayer } from './contexts/PlayerContext.js';
import { useRoom } from './contexts/RoomContext.js';
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
  const { currentRoomId } = useRoom();

  return (
    <div className="min-h-full relative">
      <FestiveBackground />
      <div className="relative z-10">
        <Routes>
          {/* Player routes */}
          <Route path="/" element={playerId ? <Navigate to="/rooms" /> : <JoinPage />} />
          <Route path="/rooms" element={playerId ? <RoomListPage /> : <Navigate to="/" />} />
          <Route path="/lobby" element={playerId && currentRoomId ? <LobbyPage /> : <Navigate to={playerId ? '/rooms' : '/'} />} />
          <Route path="/game" element={playerId && currentRoomId ? <GamePage /> : <Navigate to={playerId ? '/rooms' : '/'} />} />
          <Route path="/results" element={playerId && currentRoomId ? <ResultsPage /> : <Navigate to={playerId ? '/rooms' : '/'} />} />

          {/* Public display (projector/TV) */}
          <Route path="/display/:roomId" element={<PublicDisplayPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={isAdmin ? <Navigate to="/admin/rooms" /> : <AdminLoginPage />} />
          <Route path="/admin/rooms" element={isAdmin ? <AdminRoomListPage /> : <Navigate to="/admin" />} />
          <Route path="/admin/lobby" element={isAdmin && currentRoomId ? <AdminLobbyPage /> : <Navigate to={isAdmin ? '/admin/rooms' : '/admin'} />} />
          <Route path="/admin/game" element={isAdmin && currentRoomId ? <AdminGamePage /> : <Navigate to={isAdmin ? '/admin/rooms' : '/admin'} />} />
        </Routes>
      </div>
    </div>
  );
}
