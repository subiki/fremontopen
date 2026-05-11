import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';

export default function Tournaments() {
  const [, setLocation] = useLocation();
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => fetchApi<any[]>('/tournaments')
  });

  if (isLoading) return <div className="p-8">Loading tournaments...</div>;

  const getStatusBadge = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'complete':
        return <Badge className="bg-primary hover:bg-primary/80 text-primary-foreground">Complete</Badge>;
      case 'underway':
        return <Badge className="bg-accent hover:bg-accent/80 text-accent-foreground">Underway</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header>
        <h2 className="text-3xl font-heading font-bold">Tournaments</h2>
        <p className="text-muted-foreground">All Fremont Open billiards events.</p>
      </header>

      <Card className="bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament Name</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments?.map((tournament) => (
                <TableRow 
                  key={tournament.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/tournaments/${tournament.id}`)}
                >
                  <TableCell className="font-bold">{tournament.name}</TableCell>
                  <TableCell className="font-mono text-sm">{tournament.game || '9-Ball'}</TableCell>
                  <TableCell>{getStatusBadge(tournament.state)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tournament.startedAt ? format(new Date(tournament.startedAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
