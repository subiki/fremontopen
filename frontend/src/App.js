import "@/App.css";
import { lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { initFollowSync } from "./lib/follow";
import { getTheme, initTheme, onThemeChange } from "./lib/theme";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Players = lazy(() => import("./pages/Players"));
const PlayerDetail = lazy(() => import("./pages/PlayerDetail"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Compare = lazy(() => import("./pages/Compare"));
const Seasons = lazy(() => import("./pages/Seasons"));
const StatRankings = lazy(() => import("./pages/StatRankings"));
const Info = lazy(() => import("./pages/Info"));
const Onda = lazy(() => import("./pages/Onda"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  const [theme, setTheme] = useState(getTheme());
  const toasterTheme = theme === "light" || theme === "classic" ? "light" : "dark";

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
          <Route path="/onda" element={<Onda />} />
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
        theme={toasterTheme}
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
