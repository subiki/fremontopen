import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Swords, Trophy, Target, TrendingUp } from 'lucide-react';

interface PlayerInfo { id: string; name: string; wins: number; losses: number; win_rate: number; fargo?: number | null }
interface MatchRow { id: string; tournament_name?: string | null; round?: number | null; scores?: string | null; winner_name?: string | null; loser_name?: string | null; state?: string | null }
interface PlayerDetailData { player: PlayerInfo; matches: MatchRow[] }

export default function PlayerDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['player', id],
    queryFn: () => fetchApi<PlayerDetailData>(`/players/${id}`),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading player profile…</div>;
  if (error || !data) return <div className="p-8 text-destructive">Player not found.</div>;

  const { player, matches } = data;
  const winRate = player.win_rate * 100;

  const stats = [
    { label: 'Wins', value: player.wins, icon: Trophy, color: 'text-primary' },
    { label: 'Losses', value: player.losses, icon: Swords, color: 'text-destructive' },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-foreground' },
    { label: 'Fargo', value: player.fargo ?? '—', icon: Target, color: 'text-amber-500' },
  ];

  return (
    <div className="p-6 space-y-8">
      <header>
        <h2 className="text-4xl font-heading font-bold tracking-tight">{player.name}</h2>
        <p className="text-muted-foreground font-mono text-sm uppercase">Player Profile</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
              <p className="text-xs font-medium text-muted-foreground uppercase">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="text-2xl font-bold font-mono">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-heading font-bold flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Match History ({matches.length})
        </h3>
        <Card className="bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opponent</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => {
                  const isWinner = match.winner_name === player.name;
                  const opponent = isWinner ? match.loser_name : match.winner_name;
                  return (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{opponent ?? '—'}</TableCell>
                      <TableCell className="text-center font-mono">{match.scores ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{match.tournament_name ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={isWinner ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}>
                          {isWinner ? 'WIN' : 'LOSS'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
