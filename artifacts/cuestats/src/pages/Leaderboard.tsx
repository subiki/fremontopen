import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Leaderboard() {
  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchApi<any[]>('/players')
  });

  if (isLoading) return <div className="p-8">Loading leaderboard...</div>;

  const sortedPlayers = [...(players || [])].sort((a, b) => (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1)));
  const top3 = sortedPlayers.slice(0, 3);
  const rest = sortedPlayers.slice(3);

  const PodiumItem = ({ player, rank, color, icon: Icon }: any) => {
    if (!player) return null;
    const winRate = (player.wins / (player.wins + player.losses || 1)) * 100;
    
    return (
      <Card className={cn("relative overflow-hidden bg-card border-2", color)}>
        <div className="absolute top-2 right-2 opacity-10">
          <Icon size={80} />
        </div>
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white font-bold text-xl", 
            rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-slate-400" : "bg-amber-600")}>
            {rank}
          </div>
          <h3 className="text-2xl font-heading font-bold mb-1">{player.name}</h3>
          <p className="text-muted-foreground font-mono text-sm mb-4">
            {player.wins}W - {player.losses}L • {winRate.toFixed(1)}%
          </p>
          <div className="bg-muted px-4 py-1 rounded-full text-accent font-mono font-bold">
            FARGO: {player.fargo || '—'}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-12">
      <header className="text-center space-y-2">
        <h2 className="text-5xl font-heading font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          The Hall of Fame
        </h2>
        <p className="text-muted-foreground">Fremont Open's most dominant competitors.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
        <div className="order-2 md:order-1">
          <PodiumItem player={top3[1]} rank={2} color="border-slate-400/30" icon={Medal} />
        </div>
        <div className="order-1 md:order-2 scale-110 z-10">
          <PodiumItem player={top3[0]} rank={1} color="border-yellow-500/30" icon={Trophy} />
        </div>
        <div className="order-3 md:order-3">
          <PodiumItem player={top3[2]} rank={3} color="border-amber-600/30" icon={Star} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-2">
        {rest.map((player, index) => {
          const rank = index + 4;
          const winRate = (player.wins / (player.wins + player.losses || 1)) * 100;
          return (
            <div key={player.id} className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
              <span className="w-8 font-mono text-muted-foreground text-center">#{rank}</span>
              <div className="flex-1">
                <p className="font-bold">{player.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {player.wins} Wins • {player.losses} Losses
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-primary">{winRate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Win Rate</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
