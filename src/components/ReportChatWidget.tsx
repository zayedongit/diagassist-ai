import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, X, Send, Sparkles, Minus } from 'lucide-react';

interface ReportChatWidgetProps {
  // A string describing the patient's analysed report (used to ground answers).
  analysisContext: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What are my main issues in simple words?',
  'Explain my cholesterol to me',
  'What should I do next?',
  'Is anything here serious?',
];

export const ReportChatWidget = ({ analysisContext }: ReportChatWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Tappable multiple-choice follow-ups suggested by the assistant (user can still type freely).
  const [options, setOptions] = useState<string[]>(SUGGESTIONS);
  const sessionIdRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Give the session a stable id once.
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `chat_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    }
  }, []);

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const callChat = async (payload: {
    message: string;
    isInitialization?: boolean;
    history?: ChatMessage[];
  }): Promise<{ reply: string; options: string[] }> => {
    const { data, error } = await supabase.functions.invoke('voiceflow-chat', {
      body: {
        message: payload.message,
        sessionId: sessionIdRef.current,
        analysisContext,
        isInitialization: payload.isInitialization || false,
        history: payload.history || [],
      },
    });
    if (error) throw error;
    return {
      reply: data?.response || "I'm here to help you understand your report. What would you like to know?",
      options: Array.isArray(data?.options) ? data.options : [],
    };
  };

  const initialize = async () => {
    if (initialized) return;
    setInitialized(true);
    setIsTyping(true);
    try {
      const { reply, options: opts } = await callChat({ message: '', isInitialization: true });
      setMessages([{ role: 'assistant', content: reply }]);
      if (opts.length) setOptions(opts);
    } catch {
      setMessages([{
        role: 'assistant',
        content: "Hello! I've read through your report and I'm here to help you understand it in plain language. What would you like to know?",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    // Kick off the greeting the first time the panel opens.
    setTimeout(() => {
      initialize();
      inputRef.current?.focus();
    }, 50);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    const history = messages.slice(-10);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setOptions([]); // hide old suggestions while the next answer is prepared
    setIsTyping(true);
    try {
      const { reply, options: opts } = await callChat({ message: trimmed, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setOptions(opts);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I had trouble with that just now. Please try again in a moment.",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Collapsed launcher */}
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Open the report assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, hsl(95 30% 26%), hsl(88 28% 20%))',
            boxShadow: '0 10px 30px -8px hsl(95 30% 20% / 0.55)',
          }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Ask about your report</span>
          <span className="sm:hidden">Ask</span>
        </button>
      )}

      {/* Expanded glass panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border animate-scale-in"
          style={{
            bottom: '1.25rem',
            right: '1.25rem',
            width: 'min(380px, calc(100vw - 2rem))',
            height: 'min(560px, calc(100vh - 2.5rem))',
            background: 'rgba(255, 253, 247, 0.72)',
            backdropFilter: 'blur(22px) saturate(150%)',
            WebkitBackdropFilter: 'blur(22px) saturate(150%)',
            borderColor: 'rgba(255,255,255,0.55)',
            boxShadow: '0 24px 60px -18px hsl(95 25% 18% / 0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-primary-foreground"
            style={{ background: 'linear-gradient(135deg, hsl(95 30% 26%), hsl(88 28% 20%))' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Report Assistant</p>
                <p className="text-[11px] opacity-80">Ask anything, in plain words</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                aria-label="Minimize"
                className="rounded-md p-1.5 transition-colors hover:bg-white/15"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 transition-colors hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm border border-white/60 bg-white/70 text-foreground'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/60 bg-white/70 px-3.5 py-3">
                  <span className="dg-dot" />
                  <span className="dg-dot" style={{ animationDelay: '0.15s' }} />
                  <span className="dg-dot" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            {/* Tappable multiple-choice follow-ups (the user can also type their own). */}
            {options.length > 0 && !isTyping && (
              <div className="flex flex-wrap gap-2 pt-1">
                {options.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-primary/25 bg-white/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-white/50 bg-white/40 px-3 py-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your report..."
              className="flex-1 rounded-full border border-white/60 bg-white/70 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Tiny disclaimer */}
          <p className="bg-white/40 px-4 pb-2 text-center text-[10px] leading-tight text-muted-foreground">
            Educational help with your report, not a diagnosis. For decisions, talk to your doctor.
          </p>

          <style>{`
            .dg-dot {
              width: 6px; height: 6px; border-radius: 9999px;
              background: hsl(95 24% 30%); opacity: 0.6;
              animation: dg-typing 1s ease-in-out infinite;
            }
            @keyframes dg-typing {
              0%, 100% { transform: translateY(0); opacity: 0.35; }
              50% { transform: translateY(-3px); opacity: 0.9; }
            }
          `}</style>
        </div>
      )}
    </>
  );
};
