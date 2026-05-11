import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, apiUrl } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, MessageSquare, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Chat() {
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchApi<any[]>('/anthropic/conversations')
  });

  const { data: activeConv } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => fetchApi<any>(`/anthropic/conversations/${activeConvId}`),
    enabled: !!activeConvId
  });

  const createConv = useMutation({
    mutationFn: () => fetchApi<any>('/anthropic/conversations', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvId(data.id);
    }
  });

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || isStreaming) return;
    
    const userMsg = input;
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(apiUrl(`/anthropic/conversations/${activeConvId}/messages`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // We manually update the local cache for immediate feedback
      // This is a bit simplified, but shows the pattern
      queryClient.setQueryData(['conversation', activeConvId], (old: any) => ({
        ...old,
        messages: [...(old?.messages || []), { role: 'user', content: userMsg }, { role: 'assistant', content: '' }]
      }));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                queryClient.setQueryData(['conversation', activeConvId], (old: any) => {
                  const msgs = [...old.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  lastMsg.content += data.delta.text;
                  return { ...old, messages: msgs };
                });
              }
            } catch (e) {
              // Ignore non-json or incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', activeConvId] });
    }
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages]);

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden m-4 border border-border rounded-xl bg-card">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button 
            className="w-full justify-start gap-2" 
            variant="outline"
            onClick={() => createConv.mutate()}
          >
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map(conv => (
              <button
                key={conv.id}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeConvId === conv.id ? "bg-muted font-medium" : "hover:bg-muted/50"
                )}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate">{conv.title || `Chat ${conv.id.slice(0, 4)}`}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col relative">
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <Bot className="w-16 h-16 text-primary opacity-20" />
            <h3 className="text-xl font-heading font-bold">Billiard AI Assistant</h3>
            <p className="text-muted-foreground max-w-xs">
              Ask about player stats, tournament rules, or professional tips.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <div ref={scrollRef} className="max-w-3xl mx-auto space-y-6">
                {activeConv?.messages?.map((msg: any, i: number) => (
                  <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl max-w-[80%] text-sm",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-border">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input 
                  placeholder="Ask anything about the tournament..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isStreaming}
                  className="bg-muted border-transparent focus-visible:ring-primary"
                />
                <Button onClick={sendMessage} disabled={isStreaming || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
