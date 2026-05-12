import { useEffect, useRef, useState } from "react";
import { Topbar } from "../components/Topbar";
import { sendChat } from "../lib/api";
import { PaperPlaneTilt, Robot, User, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Who has the most wins overall?",
  "Who beat the top player the most?",
  "Show me the best win rates",
  "How many tournaments are tracked?",
];

const newSession = () =>
  `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function Chat() {
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem("cuestats_session");
    if (existing) return existing;
    const s = newSession();
    localStorage.setItem("cuestats_session", s);
    return s;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q, id: `u-${Date.now()}` },
    ]);
    setLoading(true);
    try {
      const res = await sendChat(sessionId, q);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          id: res.assistant_message?.id || `a-${Date.now()}`,
        },
      ]);
    } catch (e) {
      toast.error(`AI error: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <Topbar
        title="Ask CueStats AI"
        subtitle="Claude Sonnet 4.5 · grounded in your synced billiards data"
      />
      <main
        className="flex-1 flex flex-col min-h-0"
        data-testid="chat-page"
      >
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 sm:px-8 py-6"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(11,14,20,0.95), rgba(11,14,20,1)), url('https://images.pexels.com/photos/18294743/pexels-photo-18294743.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center pt-10" data-testid="chat-empty">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 mb-5">
                <Sparkle size={26} weight="duotone" className="text-[#10B981]" />
              </div>
              <h2 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6] tracking-tight">
                Ask anything about your billiards data
              </h2>
              <p className="mt-2 text-[#9CA3AF]">
                Head-to-head, win rates, who-beat-whom — try a suggestion below.
              </p>
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    data-testid={`suggestion-${s.slice(0, 16)}`}
                    className="bg-[#141923]/80 backdrop-blur border border-[#273041] hover:border-[#10B981]/50 rounded-md px-4 py-3 text-sm text-[#F3F4F6] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((m) => (
                <Message key={m.id} role={m.role} content={m.content} />
              ))}
              {loading ? (
                <Message role="assistant" content="" pending />
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-[#273041] bg-[#0B0E14]/90 backdrop-blur-xl px-6 sm:px-8 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask: who beat Jimmy the most?"
              data-testid="chat-input"
              className="flex-1 resize-none bg-[#141923] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-3 text-sm text-[#F3F4F6] placeholder-[#6B7280] max-h-40"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              data-testid="chat-send-button"
              className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#0B0E14] font-semibold text-sm px-4 py-3 rounded-md transition-colors"
            >
              <PaperPlaneTilt size={16} weight="fill" />
              Send
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

const Message = ({ role, content, pending }) => {
  const isUser = role === "user";
  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}
      data-testid={`msg-${role}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center shrink-0">
          <Robot size={16} weight="duotone" className="text-[#10B981]" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[#10B981]/10 border border-[#10B981]/20 text-[#F3F4F6] rounded-tr-sm"
            : "bg-[#141923] border border-[#273041] text-[#F3F4F6] rounded-tl-sm"
        }`}
      >
        {pending ? (
          <span className="typing-cursor text-[#9CA3AF]">Thinking</span>
        ) : (
          content
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-md bg-[#1E2532] border border-[#273041] flex items-center justify-center shrink-0">
          <User size={16} weight="duotone" className="text-[#9CA3AF]" />
        </div>
      )}
    </div>
  );
};
