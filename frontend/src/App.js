import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { initFollowSync } from "./lib/follow";
import { getTheme, initTheme, onThemeChange } from "./lib/theme";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Leaderboard from "./pages/Leaderboard";
import Compare from "./pages/Compare";
import Seasons from "./pages/Seasons";
import StatRankings from "./pages/StatRankings";
import Info from "./pages/Info";
import NotFound from "./pages/NotFound";

function App() {
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    setTheme(initTheme());
    initFollowSync();
    return onThemeChange(setTheme);
  }, []);

  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <KeyboardShortcuts />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:name" element={<PlayerDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/seasons" element={<Seasons />} />
            <Route path="/rankings/:stat" element={<StatRankings />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/compare/:a/:b" element={<Compare />} />
            <Route path="/info" element={<Info />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        theme={theme}
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          },
        }}
      />
    </div>
  );
}

export default App;
