import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { ChatMessage } from "../types/assistant";

const SUGGESTIONS = [
  "What's my biggest spending category?",
  "Can I afford to save ₹10,000 more per month?",
  "How long until I reach my goals?",
  "Where should I cut back on spending?",
];

type ChatPanelProps = {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
};

export function ChatPanel({ messages, isStreaming, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function handleSubmit() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    onSend(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && !isStreaming ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <circle cx="12" cy="5" r="1" />
                <path d="M9 17v-3h6v3" />
              </svg>
            </div>
            <p className="chat-empty-label">Ask me anything about your finances</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chat-suggestion-btn"
                  onClick={() => onSend(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-row chat-bubble-row--${msg.role}`}>
              {msg.role === "assistant" && (
                <div className="chat-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
              )}
              <div className={`chat-bubble chat-bubble--${msg.role}`}>
                {msg.content || (isStreaming && msg.role === "assistant" ? <TypingDots /> : null)}
              </div>
            </div>
          ))
        )}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="chat-bubble-row chat-bubble-row--assistant">
            <div className="chat-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="chat-bubble chat-bubble--assistant"><TypingDots /></div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          disabled={isStreaming}
          placeholder={isStreaming ? "FinPilot is thinking…" : "Ask about your finances…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          type="text"
        />
        <button
          disabled={!input.trim() || isStreaming}
          onClick={handleSubmit}
          type="button"
          aria-label="Send"
          style={{ minWidth: 40, padding: "0 12px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="chat-typing">
      <span /><span /><span />
    </span>
  );
}
