import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Snowflake, ShieldAlert, LogOut } from 'lucide-react';

export default function Admin() {
  const [token, setToken] = React.useState<string | null>(localStorage.getItem('admin_token'));
  const [email, setEmail] = React.useState('admin@cuestats.local');
  const [password, setPassword] = React.useState('');
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      fetchApi<{ token: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (data) => {
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['admin-me'] });
    },
  });

  const { data: me, error: meError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () =>
      fetchApi<{ adminId: number; email: string }>('/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    queryClient.clear();
  };

  const { data: tournaments } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => fetchApi<any[]>('/tournaments'),
    enabled: !!me,
  });

  const { data: players } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => fetchApi<any[]>('/players'),
    enabled: !!me,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () =>
      fetchApi<any[]>('/admin/audit-log', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!me,
  });

  const deleteTournament = useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/admin/tournaments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  const deletePlayer = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/admin/players/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
    },
  });

  if (!token || meError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-heading">Admin Access</CardTitle>
            <p className="text-sm text-muted-foreground">Authorized personnel only.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-mono uppercase text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@cuestats.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-mono uppercase text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login.mutate({ email, password })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => login.mutate({ email, password })}
              disabled={login.isPending}
            >
              {login.isPending ? 'Authenticating…' : 'Login'}
            </Button>
            {login.isError && (
              <p className="text-xs text-destructive text-center">Invalid credentials</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-heading font-bold">Admin Console</h2>
          <p className="text-muted-foreground font-mono text-xs">{me?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </header>

      <Tabs defaultValue="tournaments" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments">
          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{t.state}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" title="Freeze Tournament">
                          <Snowflake className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete "${t.name}"? This will remove all its matches.`)) {
                              deleteTournament.mutate(t.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players">
          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">W / L</TableHead>
                    <TableHead className="text-right">Fargo</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className="text-primary">{p.wins}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-destructive">{p.losses}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{p.fargo ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="icon"
                          className="hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete player "${p.name}"?`)) {
                              deletePlayer.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {JSON.stringify(log.payload)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {new Date(log.created_at ?? log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!auditLogs?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No audit log entries yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
