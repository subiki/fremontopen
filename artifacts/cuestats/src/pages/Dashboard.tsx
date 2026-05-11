import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Swords, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

interface StatsPlayer { id: string; name: string; wins: number; losses: number; win_rate: number; fargo?: number | null }
interface StatsMatch { id: string; tournament_name?: string | null; round?: number | null; scores?: string | null; winner_name?: string | null; loser_name?: string | null; state?: string | null }
interface Stats { total_tournaments: number; total_matches: number; total_players: number; last_synced_at?: string | null; players: StatsPlayer[]; recent_matches: StatsMatch[] }

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchApi<Stats>('/stats'),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Loading stats…</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Tournaments', value: stats?.total_tournaments ?? 0, icon: Trophy },
    { label: 'Matches', value: stats?.total_matches ?? 0, icon: Swords },
    { label: 'Players', value: stats?.total_players ?? 0, icon: Users },
  ];

  const topPlayers = (stats?.players ?? []).slice(0, 5);
  const recentMatches = (stats?.recent_matches ?? []).slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      <header>
        <h2 className="text-3xl font-heading font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Tournament overview and player rankings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <Card key={card.label} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top 5 Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">Win%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">
                      <Link href={`/players/${player.id}`} className="hover:text-primary transition-colors">
                        {player.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-primary font-mono">{player.wins}</TableCell>
                    <TableCell className="text-right text-destructive font-mono">{player.losses}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(player.win_rate * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-primary">{match.winner_name}</span>
                      <span className="text-muted-foreground text-xs italic">def.</span>
                      <span className="font-medium">{match.loser_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.tournament_name}{match.round != null ? ` · Round ${match.round}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm">{match.scores ?? '—'}</div>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase">
                      {match.state ?? 'open'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
