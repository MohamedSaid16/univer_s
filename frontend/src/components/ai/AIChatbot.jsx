import React, { useState, useRef, useEffect } from 'react';
import aiAPI from '../../services/ai';

/* ── Inline SVG icons ──────────────────────────────────────────── */
const SparklesIcon = (p) => (
  <svg {...p} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>
);
const SendIcon = (p) => (
  <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);
const XIcon = (p) => (
  <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);
const MinusIcon = (p) => (
  <svg {...p} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

/**
 * AIChatbot — Floating chatbot component (scaffold)
 *
 * This is a UI-ready scaffold for the AI module team. It includes:
 * - A floating action button (bottom-right corner)
 * - An expandable chat panel with message history
 * - A text input with send button
 * - Placeholder message handling (replace onSendMessage with real API)
 *
 * Integration points for the AI team:
 * 1. Replace the `simulateResponse` function with a real API call
 * 2. Add streaming support if needed (update message state progressively)
 * 3. Connect to your AI backend endpoint
 * 4. Add authentication headers using the existing api.js utility
 *
 * Usage:
 *   import AIChatbot from '../components/ai/AIChatbot';
 *   // Place anywhere in your layout — it positions itself fixed bottom-right
 *   <AIChatbot />
 */
export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I am the Ibn Khaldoun University AI Assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* Focus input when chat opens */
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const requestAIResponse = async (userMessage) => {
    const apiHistory = messages.slice(-10).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    const response = await aiAPI.chat({
      message: userMessage,
      history: apiHistory,
    });

    return response?.data?.reply || 'No response returned from AI service.';
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await requestAIResponse(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ── Floating Action Button ─────────────────────────────────── */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand text-white rounded-full shadow-card flex items-center justify-center hover:bg-brand-hover focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 transition-all duration-200 group"
        aria-label="Open AI Assistant"
      >
        <SparklesIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-150" />
      </button>
    );
  }

  /* ── Chat Panel ─────────────────────────────────────────────── */
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col bg-surface border border-edge rounded-xl shadow-card overflow-hidden transition-all duration-200 ${
        isMinimized ? 'h-14' : 'h-[520px] max-h-[calc(100vh-6rem)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand text-white shrink-0">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5" />
          <div>
            <h3 className="text-sm font-semibold leading-none">AI Assistant</h3>
            {!isMinimized && (
              <p className="text-xs text-white/70 mt-0.5">Ask me anything</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1 rounded-md hover:bg-white/20 transition-colors duration-150 focus:ring-2 focus:ring-white/30"
            aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            className="p-1 rounded-md hover:bg-white/20 transition-colors duration-150 focus:ring-2 focus:ring-white/30"
            aria-label="Close chat"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-200 dark:bg-canvas">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-brand text-white'
                      : 'bg-surface border border-edge text-ink'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-white/60' : 'text-ink-muted'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-surface border border-edge rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-edge bg-surface p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-control-bg border border-control-border rounded-md py-2 px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-150 resize-none max-h-24 overflow-y-auto"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="shrink-0 w-10 h-10 bg-brand text-white rounded-md flex items-center justify-center hover:bg-brand-hover focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-2 text-center">
              AI responses are for guidance only — verify important information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
