import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const moods = [
  { key: "happy", label: "Happy", score: 9 },
  { key: "calm", label: "Calm", score: 8 },
  { key: "neutral", label: "Neutral", score: 6 },
  { key: "sad", label: "Sad", score: 3 },
  { key: "anxious", label: "Anxious", score: 4 },
];

const toDateKey = date => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().substring(0, 10);
};

export default function Dashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [selectedMood, setSelectedMood] = useState("neutral");
  const [savingMood, setSavingMood] = useState(false);

  const loadStats = () => {
    return authFetch("/dashboard/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({}));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const logMood = async mood => {
    if (savingMood) return;
    setSelectedMood(mood.key);
    setSavingMood(true);
    try {
      await authFetch("/mood", {
        method: "POST",
        body: JSON.stringify({ mood: mood.key, score: mood.score })
      });
      await loadStats();
    } finally {
      setSavingMood(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const entries = stats?.recent_entries || [];

  const riskCounts = entries.reduce((acc, entry) => {
    const level = entry.risk_level || "Low";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, { Low: 0, Medium: 0, High: 0 });

  const moodScoresByDay = (stats?.weekly_moods || []).reduce((acc, item) => {
    acc[item.day] = Number(item.avg_score || 0);
    return acc;
  }, {});
  const today = new Date();
  const monday = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - daysSinceMonday);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = toDateKey(date);
    const todayKey = toDateKey(today);
    
    return {
      label: dayLabels[index],
      key,
      isToday: key === todayKey,
    };
  });
  const activityCells = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const count = entries.filter(entry => {
      if (!entry.entry_date) return false;
      const entryDate = new Date(entry.entry_date);
      const today = new Date();
      const diff = Math.floor((today - entryDate) / 86400000);
      return diff === 27 - index;
    }).length;
    return count;
  }), [entries]);

  return (
    <main className="page page-muted">
      <div className="greet-name">{greeting}, {firstName}</div>
      <div className="greet-sub">Here is your mental wellness overview for today.</div>

      <section className="stat-grid dashboard-rectangles">
        <div className="stat-card neutral">
          <div className="stat-label">Current Risk</div>
          <div className="stat-val">{stats?.current_risk || "None"}</div>
          <div className="stat-sub">Latest analysis</div>
        </div>
        <div className="stat-card neutral">
          <div className="stat-label">Mood Score</div>
          <div className="stat-val">{stats?.avg_mood_score ? `${stats.avg_mood_score}/10` : "-"}</div>
          <div className="stat-sub">30-day average</div>
        </div>
        <div className="stat-card neutral">
          <div className="stat-label">Journal Entries</div>
          <div className="stat-val">{stats?.total_entries || 0}</div>
          <div className="stat-sub">Total entries</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Weekly Streak</div>
          <div className="stat-val colored">{stats?.streak || 0}</div>
          <div className="stat-sub">Keep it up</div>
        </div>
      </section>

      <section className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-title-row">
            <span>Mood This Week</span>
            <span className="panel-link">{savingMood ? "Saving..." : "Tap a mood"}</span>
          </div>
          <div className="mood-days">
            {weekDays.map(day => {
              const score = moodScoresByDay[day.key] || 0;
              return (
              <div className={`mood-day${day.isToday ? " today" : ""}`} key={day.key}>
                <div
                  className={`mood-dot${score ? " filled" : ""}`}
                  title={score ? `${score.toFixed(1)}/10` : "No mood logged"}
                  style={score ? { opacity: Math.max(0.45, score / 10) } : null}
                />
                <div className="mood-day-label">{day.label}</div>
              </div>
              );
            })}
          </div>
          <div className="mood-question">How are you feeling today?</div>
          <div className="mood-pills">
            {moods.map(mood => (
              <button
                key={mood.key}
                className={`mood-pill${selectedMood === mood.key ? " active" : ""}`}
                disabled={savingMood}
                onClick={() => logMood(mood)}
              >
                {mood.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row">
            <span>Recent Journal Entries</span>
            <button className="panel-link" onClick={() => navigate("/journal")}>View All</button>
          </div>
          {entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
    <div className="journal-entry" key={entry.id || index}>
      <div className="je-title">{entry.title || "Journal reflection"}</div>
      <div className="je-time">{entry.entry_date?.substring(0, 10) || "Recently"}</div>
      <div className="je-preview">
        {(entry.content || "").substring(0, 90)}{(entry.content || "").length > 90 ? "..." : ""}
      </div>
    </div>
  )) : (
    <div style={{ color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>
      No journal entries yet. Start writing to see them here.
    </div>
  )}
        </div>
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="panel-title">Risk Overview</div>
          <div className="risk-row">
            <div className="risk-box low-risk"><div className="risk-num">{riskCounts.Low || 0}</div><div className="risk-label">Low</div></div>
            <div className="risk-box mid-risk"><div className="risk-num">{riskCounts.Medium || 0}</div><div className="risk-label">Medium</div></div>
            <div className="risk-box high-risk"><div className="risk-num">{riskCounts.High || 0}</div><div className="risk-label">High</div></div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Based on your journal entries and mood logs</div>
        </div>

        <div className="panel">
          <div className="panel-title">30-Day Activity</div>
          <div className="activity-grid">
            {activityCells.map((count, index) => (
              <div
                className="act-cell"
                key={index}
                style={count ? { background: count > 1 ? "var(--accent)" : "var(--accent2)" } : null}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
