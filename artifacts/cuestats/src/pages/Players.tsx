import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useLocation } from 'wouter';

export default function Players() {
  const [, setLocation] = useLocation();
  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchApi<any[]>('/players')
  });

  if (isLoading) return <div className="p-8">Loading players...</div>;

  const sortedPlayers = [...(players || [])].sort((a, b) => (b.wins / (b.wins + b.losses || 1)) - (a.wins / (a.wins + a.losses || 1)));

  return (
    <div className="p-6 space-y-8">
      <header>
        <h2 className="text-3xl font-heading font-bold">Players</h2>
        <p className="text-muted-foreground">Fremont Open player rankings and statistics.</p>
      </header>

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Win%</TableHead>
                <TableHead className="text-right">Fargo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => {
                const winRate = (player.wins / (player.wins + player.losses || 1)) * 100;
                return (
                  <TableRow 
                    key={player.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/players/${player.id}`)}
                  >
                    <TableCell className="font-mono text-muted-foreground">#{index + 1}</TableCell>
                    <TableCell className="font-bold">{player.name}</TableCell>
                    <TableCell className="text-right text-primary font-mono">{player.wins}</TableCell>
                    <TableCell className="text-right text-destructive font-mono">{player.losses}</TableCell>
                    <TableCell className="text-right font-mono">{winRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-accent">{player.fargo || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
