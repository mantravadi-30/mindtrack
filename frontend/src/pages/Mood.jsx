import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const moods = [
  { key: "happy", label: "Happy", score: 9 },
  { key: "calm", label: "Calm", score: 8 },
  { key: "neutral", label: "Neutral", score: 6 },
  { key: "sad", label: "Sad", score: 3 },
  { key: "anxious", label: "Anxious", score: 4 },
  { key: "stressed", label: "Stressed", score: 3 },
];

export default function Mood() {
  const { authFetch } = useAuth();
  const [selected, setSelected] = useState(moods[2]);
  const [intensity, setIntensity] = useState(5);
  const [history, setHistory] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    authFetch("/mood/history").then(r => r.json()).then(setHistory);
  }, []);

  const submit = async () => {
    await authFetch("/mood", {
      method: "POST",
      body: JSON.stringify({ mood: selected.key, score: Number(intensity || selected.score) })
    });
    setSubmitted(true);
    const updated = await authFetch("/mood/history");
    setHistory(await updated.json());
  };

  return (
    <main className="page purple-page">
      <div className="page-wrap">
        <div className="serif-heading purple-heading">Mood Check-in</div>
        <div className="page-sub">Track how you feel each day to spot patterns over time.</div>

        <div className="j-grid">
          <section className="j-card">
            <div className="j-label">How are you feeling right now?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {moods.map(mood => (
                <button
                  className={`mood-pill${selected.key === mood.key ? " active" : ""}`}
                  key={mood.key}
                  onClick={() => {
                    setSelected(mood);
                    setIntensity(mood.score);
                    setSubmitted(false);
                  }}
                  style={{ borderRadius: 12, fontSize: 15, padding: 14, textAlign: "center" }}
                >
                  {mood.label}
                </button>
              ))}
            </div>
            <div className="j-label">Intensity (1-10)</div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={event => setIntensity(event.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <div style={{ color: "var(--purple-mid)", fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 20, textAlign: "center" }}>
              {intensity}
            </div>
            <button className="analyze-btn" onClick={submit} style={{ width: "100%" }}>
              {submitted ? "Mood logged" : "Log Mood"}
            </button>
          </section>

          <section className="j-card">
            <div className="j-label">Mood History ({history.length})</div>
            {history.length === 0 ? (
              <div className="past-empty">No mood logs yet</div>
            ) : history.map((item, index) => (
              <div className="journal-entry" key={index}>
                <div className="je-title">{moods.find(mood => mood.key === item.mood)?.label || item.mood}</div>
                <div className="je-time">{item.checkin_date?.substring(0, 16)}</div>
                <div className="je-preview">Score: {item.score}/10</div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
