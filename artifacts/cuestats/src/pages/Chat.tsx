import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Send, MessageSquare, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation { id: number; title: string; created_at: string }
interface Message { id: number; role: 'user' | 'assistant'; content: string; created_at: string }
interface ConversationWithMessages extends Conversation { messages: Message[] }

let msgCounter = 0;

export default function Chat() {
  const [activeConvId, setActiveConvId] = React.useState<number | null>(null);
  const [input, setInput] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamMessages, setStreamMessages] = React.useState<{ id: string; role: string; content: string }[]>([]);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchApi<Conversation[]>('/anthropic/conversations'),
  });

  const { data: activeConv } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => fetchApi<ConversationWithMessages>(`/anthropic/conversations/${activeConvId}`),
    enabled: !!activeConvId,
  });

  const createConv = useMutation({
    mutationFn: () =>
      fetchApi<Conversation>('/anthropic/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: `Chat ${new Date().toLocaleTimeString()}` }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvId(data.id);
      setStreamMessages([]);
    },
  });

  const switchConv = (id: number) => {
    setActiveConvId(id);
    setStreamMessages([]);
  };

  const allMessages = React.useMemo(() => {
    const base = (activeConv?.messages ?? []).map((m) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
    }));
    const inStream = streamMessages.filter(
      (sm) => !base.some((b) => b.id === sm.id)
    );
    return [...base, ...inStream];
  }, [activeConv?.messages, streamMessages]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || isStreaming) return;

    const userMsg = input.trim();
    setInput('');
    setIsStreaming(true);

    const userId = `stream-user-${++msgCounter}`;
    const assistantId = `stream-assistant-${++msgCounter}`;

    setStreamMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: userMsg },
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const response = await fetch(apiUrl(`/anthropic/conversations/${activeConvId}/messages`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) break;
            if (typeof payload.text === 'string') {
              setStreamMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + payload.text }
                    : m
                )
              );
            }
          } catch {
            // partial chunk, skip
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsStreaming(false);
      setStreamMessages([]);
      queryClient.invalidateQueries({ queryKey: ['conversation', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden m-4 border border-border rounded-xl bg-card">
      <div className="w-64 border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => createConv.mutate()}
            disabled={createConv.isPending}
          >
            <Plus className="w-4 h-4" />
            {createConv.isPending ? 'Creating…' : 'New Chat'}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map((conv) => (
              <button
                key={conv.id}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  activeConvId === conv.id ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted/50'
                )}
                onClick={() => switchConv(conv.id)}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <Bot className="w-16 h-16 text-primary opacity-20" />
            <h3 className="text-xl font-heading font-bold">CueBot AI Assistant</h3>
            <p className="text-muted-foreground max-w-xs">
              Ask about player stats, tournament results, handicap systems, or billiards strategy.
            </p>
            <Button onClick={() => createConv.mutate()} disabled={createConv.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Start a conversation
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {allMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div
                      className={cn(
                        'px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {msg.content || (
                        <span className="inline-flex gap-1 text-muted-foreground">
                          <span className="animate-bounce">●</span>
                          <span className="animate-bounce [animation-delay:0.1s]">●</span>
                          <span className="animate-bounce [animation-delay:0.2s]">●</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input
                  placeholder="Ask about players, matches, or tournament rules…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isStreaming}
                  className="bg-muted border-transparent focus-visible:ring-primary"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isStreaming || !input.trim()}
                  size="icon"
                >
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
