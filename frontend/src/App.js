import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { initFollowSync } from "./lib/follow";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Leaderboard from "./pages/Leaderboard";
import Compare from "./pages/Compare";
import StatRankings from "./pages/StatRankings";
import Info from "./pages/Info";

function App() {
  useEffect(() => {
    initFollowSync();
  }, []);

  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:name" element={<PlayerDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/rankings/:stat" element={<StatRankings />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/compare/:a/:b" element={<Compare />} />
            <Route path="/info" element={<Info />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#141923",
            border: "1px solid #273041",
            color: "#F3F4F6",
          },
        }}
      />
    </div>
  );
}

export default App;
