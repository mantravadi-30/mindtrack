import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const heatClasses = { Low: "low", Medium: "med", High: "high" };

export default function RiskReport() {
  const { authFetch } = useAuth();
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    authFetch("/journal").then(r => r.json()).then(setEntries);
  }, []);

  const counts = {
    Low: entries.filter(entry => entry.risk_level === "Low").length,
    Medium: entries.filter(entry => entry.risk_level === "Medium").length,
    High: entries.filter(entry => entry.risk_level === "High").length,
  };

  const heatmap = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const dateText = date.toISOString().substring(0, 10);
    const entry = entries.find(item => item.entry_date?.substring(0, 10) === dateText);
    return { day: index + 1, risk: entry?.risk_level || null };
  }), [entries]);

  const filtered = filter === "All" ? entries : entries.filter(entry => entry.risk_level === filter);

  return (
    <main className="page page-muted">
      <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div className="page-title">Risk Report</div>
          <div className="page-sub">Longitudinal mental health risk analysis based on your journal entries.</div>
        </div>
        <div className="tab-row">
          {["overview", "heatmap", "log"].map(tab => (
            <button
              className={`tab${activeTab === tab ? " active" : ""}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? "Overview" : tab === "heatmap" ? "Heatmap" : "Entry Log"}
            </button>
          ))}
        </div>
      </div>

      <section className="stat-row">
        <div className="stat-card low">
          <div className="stat-badge low">Low Risk</div>
          <div className="stat-num">{counts.Low}</div>
          <div className="stat-sub">entries analysed</div>
        </div>
        <div className="stat-card med">
          <div className="stat-badge med">Medium Risk</div>
          <div className="stat-num">{counts.Medium}</div>
          <div className="stat-sub">entries analysed</div>
        </div>
        <div className="stat-card high">
          <div className="stat-badge high">High Risk</div>
          <div className="stat-num">{counts.High}</div>
          <div className="stat-sub">entries analysed</div>
        </div>
      </section>

      <section className={`view${activeTab === "overview" ? " active" : ""}`}>
        <div className="r-panel">
          <div className="r-panel-head">
            <div className="r-panel-title">Risk Score Trend</div>
          </div>
          <div className="no-data">
            <span>{entries.length ? "Your latest entries are ready for review in the Entry Log." : "No data yet - start journaling to see your trend!"}</span>
          </div>
        </div>
        <div className="r-panel">
          <div className="r-panel-head">
            <div className="r-panel-title">How risk is calculated</div>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              ["Journal tone", "Sentiment and emotional language in your entries."],
              ["Mood patterns", "Consistency and trends in your daily mood logs."],
              ["Activity streak", "Gaps and frequency of check-ins over time."],
            ].map(([title, body]) => (
              <div key={title} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{title}</div>
                <div style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`view${activeTab === "heatmap" ? " active" : ""}`}>
        <div className="r-panel">
          <div className="r-panel-head">
            <div className="r-panel-title">30-Day Risk Heatmap</div>
            <div className="legend">
              <div className="leg-item"><span className="leg-dot" style={{ background: "var(--green)" }} />Low</div>
              <div className="leg-item"><span className="leg-dot" style={{ background: "#D97706" }} />Medium</div>
              <div className="leg-item"><span className="leg-dot" style={{ background: "#DC2626" }} />High</div>
              <div className="leg-item"><span className="leg-dot" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />No entry</div>
            </div>
          </div>
          <div className="heatmap">
            {heatmap.map(cell => (
              <div className={`hm-cell${cell.risk ? ` ${heatClasses[cell.risk]}` : ""}`} key={cell.day}>
                {cell.day}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`view${activeTab === "log" ? " active" : ""}`}>
        <div className="r-panel">
          <div className="r-panel-head">
            <div className="r-panel-title">Entry Log</div>
            <div className="filter-row">
              {["All", "Low", "Medium", "High"].map(item => (
                <button className={`f-chip${filter === item ? " active" : ""}`} key={item} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="no-data">
              <span>No entries found. Start journaling to populate this log.</span>
            </div>
          ) : filtered.map((entry, index) => (
            <div className="journal-entry" key={entry.id || index}>
              <div className="je-title">{entry.risk_level} Risk · {Math.round((entry.risk_score || 0) * 100)}%</div>
              <div className="je-time">{entry.entry_date?.substring(0, 10)}</div>
              <div className="je-preview">{(entry.content || "").substring(0, 180)}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
