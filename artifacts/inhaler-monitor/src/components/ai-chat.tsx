/**
 * AeroSense AI Health Assistant — floating chat panel.
 *
 * Powered by Groq (llama-3.3-70b-versatile) via the backend /api/ai/chat endpoint.
 * The AI is given live patient context (today's usage, alerts, risk score) so it
 * can give personalised, data-aware responses.
 *
 * The Groq API key is stored server-side only — never exposed to the browser.
 *
 * Features:
 *   - Floating chat button (bottom-right corner)
 *   - Slide-up chat panel with message history
 *   - Suggested quick questions
 *   - Streaming-style typing indicator
 *   - Auto-scroll to latest message
 */
import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Minimize2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
    role: "user" | "assistant";
    content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTED QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
    "What does my risk score mean?",
    "How should I use my inhaler correctly?",
    "Why did I get a rapid usage alert?",
    "Is my usage pattern normal?",
];

// ─────────────────────────────────────────────────────────────────────────────
// AI CHAT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setHasUnread(false);
        }
    }, [isOpen]);

    /**
     * Sends a message to the backend /api/ai/chat endpoint.
     * Uses VITE_API_URL in production (Render), falls back to relative /api in dev.
     * The backend injects live patient context before calling Groq.
     */
    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const userMessage: Message = { role: "user", content: trimmed };
        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        // Resolve the correct API base — matches what setBaseUrl() uses in main.tsx
        const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
        const endpoint = `${apiBase}/api/ai/chat`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as { reply: string };
            const assistantMessage: Message = { role: "assistant", content: data.reply };

            setMessages((prev) => [...prev, assistantMessage]);

            // Show unread badge if chat is closed
            if (!isOpen) setHasUnread(true);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I couldn't connect to the AI assistant. Please make sure the server is running and try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <>
            {/* ── Chat Panel ─────────────────────────────────────────────────── */}
            <div
                className={cn(
                    "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96",
                    "transition-all duration-300 ease-out",
                    isOpen
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none",
                )}
                aria-hidden={!isOpen}
            >
                <div className="flex flex-col rounded-2xl border bg-background shadow-2xl shadow-black/20 overflow-hidden h-[480px]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                                <Bot className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm leading-none">AeroSense AI</p>
                                <p className="text-[11px] text-primary-foreground/70 mt-0.5">Powered by Groq · llama-3.3-70b</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close AI assistant"
                        >
                            <Minimize2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
                        {/* Welcome message */}
                        {messages.length === 0 && (
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                    </div>
                                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]">
                                        Hi! I'm your AeroSense AI assistant. I can see your usage data and help you understand your inhaler patterns. What would you like to know?
                                    </div>
                                </div>

                                {/* Suggested questions */}
                                <div className="space-y-2 pl-10">
                                    <p className="text-[11px] text-muted-foreground font-medium">Try asking:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_QUESTIONS.map((q) => (
                                            <button
                                                key={q}
                                                onClick={() => sendMessage(q)}
                                                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-left"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conversation */}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                            >
                                {msg.role === "assistant" && (
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted rounded-tl-sm",
                                    )}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-background shrink-0">
                        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about your inhaler usage..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                disabled={isLoading}
                                aria-label="Message input"
                            />
                            <Button
                                size="icon"
                                className="h-7 w-7 rounded-lg shrink-0"
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || isLoading}
                                aria-label="Send message"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                            AI advice is informational only — always consult your doctor.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Floating Toggle Button ──────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50",
                    "h-14 w-14 rounded-full shadow-lg shadow-primary/30",
                    "flex items-center justify-center",
                    "bg-primary text-primary-foreground",
                    "transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40",
                    isOpen && "rotate-0",
                )}
                aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
            >
                {isOpen ? (
                    <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                    <div className="relative">
                        <Sparkles className="h-6 w-6" aria-hidden="true" />
                        {/* Unread indicator */}
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-primary" />
                        )}
                    </div>
                )}
            </button>
        </>
    );
}
