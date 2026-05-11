import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Snowflake, ShieldAlert, LogOut } from 'lucide-react';

export default function Admin() {
  const [token, setToken] = React.useState(localStorage.getItem('admin_token'));
  const [password, setPassword] = React.useState('');
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: (p: string) => fetchApi<any>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: p })
    }),
    onSuccess: (data) => {
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    }
  });

  const { data: me, error } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => fetchApi<any>('/admin/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    enabled: !!token
  });

  const { data: tournaments } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => fetchApi<any[]>('/tournaments'),
    enabled: !!me
  });

  const { data: players } = useQuery({
    queryKey: ['admin-players'],
    queryFn: () => fetchApi<any[]>('/players'),
    enabled: !!me
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => fetchApi<any[]>('/admin/audit', {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    enabled: !!me
  });

  const deleteTournament = useMutation({
    mutationFn: (id: string) => fetchApi(`/admin/tournaments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
  });

  if (!token || error) {
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
              <Input 
                type="password" 
                placeholder="Enter admin password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login.mutate(password)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => login.mutate(password)}
              disabled={login.isPending}
            >
              {login.isPending ? 'Authenticating...' : 'Login'}
            </Button>
            {login.isError && <p className="text-xs text-destructive text-center">Invalid password</p>}
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
          <p className="text-muted-foreground font-mono text-xs">Logged in as Administrator</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem('admin_token'); setToken(null); }}>
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
                  {tournaments?.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">{t.name}</TableCell>
                      <TableCell><Badge variant="outline">{t.state}</Badge></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" title="Freeze Tournament">
                          <Snowflake className="w-4 h-4 text-accent" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="hover:bg-destructive/10"
                          onClick={() => deleteTournament.mutate(t.id)}
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
                    <TableHead>Fargo</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players?.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.name}</TableCell>
                      <TableCell className="font-mono">{p.fargo || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="icon" className="hover:bg-destructive/10">
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
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <span className="font-bold text-primary mr-2 uppercase text-[10px] tracking-widest">{log.action}</span>
                        <span className="text-muted-foreground">{JSON.stringify(log.payload)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
