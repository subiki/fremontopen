import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";

// Pages
import Dashboard from "@/pages/Dashboard";
import Tournaments from "@/pages/Tournaments";
import TournamentDetail from "@/pages/TournamentDetail";
import Players from "@/pages/Players";
import PlayerDetail from "@/pages/PlayerDetail";
import Leaderboard from "@/pages/Leaderboard";
import Compare from "@/pages/Compare";
import Chat from "@/pages/Chat";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tournaments" component={Tournaments} />
          <Route path="/tournaments/:id" component={TournamentDetail} />
          <Route path="/players" component={Players} />
          <Route path="/players/:id" component={PlayerDetail} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/compare" component={Compare} />
          <Route path="/chat" component={Chat} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
