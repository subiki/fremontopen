import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface TournamentInfo { id: number; name: string; game?: string | null; state: string; started_at?: string | null }
interface MatchRow { id: string; round?: number | null; state?: string | null; scores?: string | null; winner_name?: string | null; loser_name?: string | null }
interface TournamentDetailData { tournament: TournamentInfo; matches: MatchRow[] }

function StateBadge({ state }: { state: string }) {
  switch (state?.toLowerCase()) {
    case 'complete': return <Badge className="bg-primary text-primary-foreground">Complete</Badge>;
    case 'underway': return <Badge className="bg-amber-500 text-white">Underway</Badge>;
    default: return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchApi<TournamentDetailData>(`/tournaments/${id}`),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading tournament…</div>;
  if (error || !data) return <div className="p-8 text-destructive">Tournament not found.</div>;

  const { tournament, matches } = data;

  return (
    <div className="p-6 space-y-8">
      <Card className="bg-card border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <Badge variant="outline" className="font-mono mb-2">{tournament.game ?? '9-Ball'}</Badge>
              <CardTitle className="text-3xl font-heading font-bold">{tournament.name}</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {tournament.started_at && (
                <div className="text-right hidden md:block">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Started</p>
                  <p className="font-mono font-medium">{tournament.started_at}</p>
                </div>
              )}
              <StateBadge state={tournament.state} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-heading font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Matches ({matches.length})
        </h3>
        <Card className="bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Round</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Loser</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {match.round != null ? `R${match.round}` : '—'}
                    </TableCell>
                    <TableCell className="font-bold text-primary">{match.winner_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{match.loser_name ?? '—'}</TableCell>
                    <TableCell className="text-center font-mono font-bold">{match.scores ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {match.state ?? 'open'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
