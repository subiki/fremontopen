import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Swords, TrendingUp, Target, Trophy } from 'lucide-react';

export default function Compare() {
  const [playerAId, setPlayerAId] = React.useState<string | null>(null);
  const [playerBId, setPlayerBId] = React.useState<string | null>(null);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchApi<any[]>('/players')
  });

  const { data: comparison, isLoading: isComparing } = useQuery({
    queryKey: ['compare', playerAId, playerBId],
    queryFn: () => fetchApi<any>(`/stats/compare?a=${playerAId}&b=${playerBId}`),
    enabled: !!playerAId && !!playerBId
  });

  const playerA = players?.find(p => p.id === playerAId);
  const playerB = players?.find(p => p.id === playerBId);

  const StatRow = ({ label, valA, valB, format = (v: any) => v }: any) => {
    const isHigherA = valA > valB;
    const isHigherB = valB > valA;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono uppercase text-muted-foreground tracking-tighter">
          <span>{format(valA)}</span>
          <span>{label}</span>
          <span>{format(valB)}</span>
        </div>
        <div className="flex gap-1 h-2">
          <div className="flex-1 flex justify-end">
            <div 
              className={`h-full rounded-l-full ${isHigherA ? 'bg-primary' : 'bg-muted'}`}
              style={{ width: `${Math.min(100, (valA / (valA + valB || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex-1 flex">
            <div 
              className={`h-full rounded-r-full ${isHigherB ? 'bg-primary' : 'bg-muted'}`}
              style={{ width: `${Math.min(100, (valB / (valA + valB || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <header>
        <h2 className="text-3xl font-heading font-bold">Compare Players</h2>
        <p className="text-muted-foreground">Head-to-head statistical analysis.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-muted-foreground">Player A</label>
          <Select onValueChange={setPlayerAId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select first player" />
            </SelectTrigger>
            <SelectContent>
              {players?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-muted-foreground">Player B</label>
          <Select onValueChange={setPlayerBId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select second player" />
            </SelectTrigger>
            <SelectContent>
              {players?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {playerA && playerB ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-center font-heading">Core Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <StatRow 
                  label="Wins" 
                  valA={playerA.wins} 
                  valB={playerB.wins} 
                />
                <StatRow 
                  label="Win %" 
                  valA={(playerA.wins / (playerA.wins + playerA.losses || 1)) * 100} 
                  valB={(playerB.wins / (playerB.wins + playerB.losses || 1)) * 100}
                  format={(v: number) => `${v.toFixed(1)}%`}
                />
                <StatRow 
                  label="Fargo" 
                  valA={playerA.fargo || 0} 
                  valB={playerB.fargo || 0} 
                />
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-center font-heading">Head-to-Head</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                {isComparing ? (
                  <p className="text-muted-foreground animate-pulse">Analyzing matches...</p>
                ) : (
                  <div className="text-center space-y-4 w-full">
                    <div className="flex justify-around items-center">
                      <div className="text-4xl font-mono font-bold text-primary">{comparison?.h2h?.aWins || 0}</div>
                      <div className="text-muted-foreground font-mono italic">VS</div>
                      <div className="text-4xl font-mono font-bold text-destructive">{comparison?.h2h?.bWins || 0}</div>
                    </div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Lifetime Matchups</p>
                    
                    <div className="mt-8 pt-8 border-t border-border">
                      <h4 className="text-sm font-bold mb-4 uppercase">Common Opponents</h4>
                      <div className="space-y-2">
                        {comparison?.commonOpponents?.slice(0, 3).map((opp: any) => (
                          <div key={opp.id} className="flex justify-between text-xs bg-muted/50 p-2 rounded">
                            <span className={opp.aWins > opp.bWins ? 'text-primary' : ''}>{opp.aWins}W</span>
                            <span className="font-medium">{opp.name}</span>
                            <span className={opp.bWins > opp.aWins ? 'text-primary' : ''}>{opp.bWins}W</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
          <Swords className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Select two players to see their statistical matchup.</p>
        </div>
      )}
    </div>
  );
}
