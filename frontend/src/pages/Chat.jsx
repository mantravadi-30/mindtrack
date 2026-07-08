import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const GREETING = "Hey, I'm really glad you're here. This is your space — no pressure, no judgment. How are you really doing today?";

export default function Chat() {
  const { authFetch } = useAuth();
  const [messages, setMessages] = useState([
    { role: "assistant", content: GREETING }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (message = input) => {
    if (!message.trim() || loading) return;
    const userMsg = { role: "user", content: message };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error("Chat API error " + res.status);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong on my end. I'm still here — please try again."
      }]);
    }

    setLoading(false);
  };

  return (
    <main className="page page-muted">
      <div className="center-wrap">
        <div className="serif-heading">AI Companion</div>
        <div className="page-sub">A safe space to talk. I'm here to listen and support you.</div>

        <section className="ai-card">
          <div className="ai-header">
            <div className="ai-identity">
              <div className="ai-avatar">AI</div>
              <div>
                <div className="ai-name" style={{ color: "#1A1714" }}>MindTrack AI</div>
                <div className="ai-status">Always here for you</div>
              </div>
            </div>
            <div className="not-therapist">Not a therapist · iCall: 9152987821</div>
          </div>

          <div className="messages">
            {messages.map((message, index) => (
              <div className={`msg ${message.role === "user" ? "user" : "ai"}`} key={index}>
                <div className="msg-avatar">{message.role === "user" ? "U" : "AI"}</div>
                <div className="msg-bubble">{message.content}</div>
              </div>
            ))}
            {loading && (
              <div className="msg ai">
                <div className="msg-avatar">AI</div>
                <div className="msg-bubble">Typing...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="quick-chips">
            {["I'm feeling anxious", "I had a good day!", "I can't sleep", "Feeling overwhelmed"].map(reply => (
              <button className="chip" key={reply} onClick={() => send(reply)} disabled={loading}>
                {reply}
              </button>
            ))}
          </div>

          <div className="ai-input-row">
            <input
              className="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Share how you're feeling..."
              disabled={loading}
            />
            <button className="send-btn" disabled={loading || !input.trim()} onClick={() => send()}>
              &gt;
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}