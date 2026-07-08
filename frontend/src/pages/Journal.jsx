import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const coverClasses = [
  "pattern-1",
  "pattern-2",
  "pattern-3",
  "pattern-4",
  "pattern-5",
];

const MOODS = [
  "Happy",
  "Calm",
  "Neutral",
  "Sad",
  "Anxious",
  "Angry",
  "Excited",
  "Grateful",
  "Tired",
];

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Journal() {
  const { authFetch } = useAuth();
  const [entries, setEntries] = useState([]);
  const [activeView, setActiveView] = useState("collection");
  const [activeEntry, setActiveEntry] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("Calm");
  const [entryDate, setEntryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newJournalName, setNewJournalName] = useState("");
  const [selectedCover, setSelectedCover] = useState("pattern-1");
  const [journals, setJournals] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const activeEntryRef = useRef(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const r = await authFetch("/journal");
      if (!r.ok) throw new Error("Failed to load");
      const data = await r.json();
      setEntries(data);
      if (data.length && !activeEntryRef.current) {
        applyEntry(data[0]);
      }
    } catch (err) {
      console.error("Load entries failed:", err);
    }
  };

  const applyEntry = (entry) => {
    activeEntryRef.current = entry.id;
    setActiveEntry(entry.id);
    setTitle(entry.title || "Journal reflection");
    setContent(entry.content || "");
    setEntryDate(entry.entry_date || new Date().toISOString());
    setMood(
      entry.mood
        ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)
        : "Calm",
    );
    setAnalysis(null);
    setSaveStatus("");
  };

  const selectEntry = (entry) => {
    applyEntry(entry);
    setActiveView("write");
  };

  const newEntry = () => {
    activeEntryRef.current = "new";
    setActiveEntry("new");
    setTitle("New entry");
    setContent("");
    setMood("Calm");
    setEntryDate(new Date().toISOString());
    setAnalysis(null);
    setSaveStatus("");
    setActiveView("write");
  };

  const save = async () => {
    if (!content.trim()) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2500);
      return null;
    }
    if (activeEntryRef.current === null) {
      activeEntryRef.current = "new";
    }
    setLoading(true);
    setSaveStatus("");
    try {
      let savedEntry;
      const payload = {
        title: title.trim() || "Journal entry",
        content,
        mood: mood.toLowerCase(),
        entry_date: new Date().toISOString(),
      };

      if (activeEntryRef.current === "new") {
        const r = await authFetch("/journal", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const e = await r.json();
          throw new Error(e.detail || "Save failed");
        }
        savedEntry = await r.json();
        setActiveEntry(savedEntry.id);
        activeEntryRef.current = savedEntry.id;
      } else {
        const r = await authFetch(`/journal/${activeEntryRef.current}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const e = await r.json();
          throw new Error(e.detail || "Update failed");
        }
        savedEntry = await r.json();
      }

      setEntryDate(savedEntry.entry_date || new Date().toISOString());
      await fetchEntries();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2500);
      return savedEntry.id;
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2500);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setSaveStatus("");

    try {
      const entryId = await save();
      if (!entryId) throw new Error("Could not save before analyzing");

      const apiRes = await authFetch(`/journal/${entryId}/analyze`, {
        method: "POST",
      });

      if (!apiRes.ok) throw new Error("Analysis failed");
      const data = await apiRes.json();

      setAnalysis({
        mood_detected: data.mood,
        stress_level: Math.round((data.risk_score || 0) * 100),
        stress_label:
          data.risk_level === "High"
            ? "High"
            : data.risk_level === "Medium"
              ? "Moderate"
              : "Low",
        summary: data.analysis,
        key_phrases: data.key_phrases || [],
        suggestions: [
          "Take a short mindful break today.",
          "Stay hydrated and get enough rest.",
        ],
        affirmation: "You are handling things better than you think.",
      });

      await fetchEntries();
    } catch (err) {
      console.error("Analyze failed:", err);
      setAnalysis({
        error: err.message || "Analysis failed. Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteEntry = async () => {
    if (!activeEntry || activeEntry === "new") return;
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    setLoading(true);
    try {
      const r = await authFetch(`/journal/${activeEntry}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Delete failed");
      const updated = entries.filter((e) => e.id !== activeEntry);
      setEntries(updated);
      if (updated.length) applyEntry(updated[0]);
      else {
        setActiveEntry(null);
        setTitle("");
        setContent("");
        setMood("Calm");
        setEntryDate("");
      }
      setAnalysis(null);
      setSaveStatus("");
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const createJournal = () => {
    const name = newJournalName.trim() || "Untitled";
    setJournals((prev) => [
      ...prev,
      {
        name,
        created: "Created today",
        count: 0,
        cover: selectedCover,
        mark: name.charAt(0).toUpperCase() || "J",
      },
    ]);
    setNewJournalName("");
    setSelectedCover("pattern-1");
    setShowModal(false);
  };

  const stressColor = (level) => {
    if (!level && level !== 0) return "#888";
    if (level >= 70) return "#dc2626";
    if (level >= 40) return "#d97706";
    return "#16a34a";
  };

  const riskColor = (label) => {
    if (!label) return "#888";
    if (label === "High" || label === "Very High") return "#dc2626";
    if (label === "Moderate" || label === "Medium") return "#d97706";
    return "#16a34a";
  };

  const canDelete = activeEntry && activeEntry !== "new";
  const canSave = content.trim().length > 0;
  const canAnalyze = content.trim().length > 0;

  return (
    <main className="page page-muted" style={{ position: "relative" }}>
      <div className="page-header">
        <div>
          <div className="page-title">My Journals</div>
          <div className="page-sub" style={{ marginBottom: 0 }}>
            Organise your thoughts, stories, and reflections.
          </div>
        </div>
        <div className="header-actions">
          <div className="tab-bar">
            <button
              className={`tab${activeView === "collection" ? " active" : ""}`}
              onClick={() => setActiveView("collection")}
            >
              Collection
            </button>
            <button
              className={`tab${activeView === "write" ? " active" : ""}`}
              onClick={() => setActiveView("write")}
            >
              Write
            </button>
          </div>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            + Add New
          </button>
        </div>
      </div>

      {/* Collection View */}
      <section
        className={`view${activeView === "collection" ? " active" : ""}`}
      >
        <div className="journals-grid">
          {journals.map((journal) => (
            <button
              className="journal-card"
              key={journal.name}
              onClick={() => setActiveView("write")}
            >
              <div className={`jc-thumb ${journal.cover}`}>
                <svg
                  width="100%"
                  height="140"
                  viewBox="0 0 200 140"
                  style={{
                    left: 0,
                    opacity: 0.18,
                    position: "absolute",
                    top: 0,
                  }}
                >
                  <circle cx="44" cy="32" r="60" fill="#4A3728" />
                  <circle cx="160" cy="110" r="50" fill="#4A3728" />
                </svg>
                <div className="jc-icon-wrap">{journal.mark}</div>
                <div className="jc-thumb-overlay" />
              </div>
              <div className="jc-body">
                <div className="jc-name">{journal.name}</div>
                <div className="jc-meta">
                  <span>{journal.created}</span>
                  <span className="jc-count-badge">
                    {journal.count} entries
                  </span>
                </div>
              </div>
            </button>
          ))}
          <button className="add-card" onClick={() => setShowModal(true)}>
            <span style={{ fontSize: 28 }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>New journal</span>
          </button>
        </div>
      </section>

      {/* Write View */}
      <section className={`view${activeView === "write" ? " active" : ""}`}>
        <div className="write-wrap">
          <aside className="write-sidebar">
            <button className="new-entry-btn" onClick={newEntry}>
              + New entry
            </button>
            {entries.map((entry) => (
              <button
                className={`write-entry-item${activeEntry === entry.id ? " active" : ""}`}
                key={entry.id}
                onClick={() => selectEntry(entry)}
              >
                <div className="wei-title">
                  {entry.title || "Journal reflection"}
                </div>
                <div className="wei-meta">
                  <span>
                    {entry.entry_date
                      ? new Date(entry.entry_date).toLocaleDateString("en-IN")
                      : "Today"}
                  </span>
                  <span className="wei-mood">
                    {entry.mood
                      ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)
                      : "Calm"}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          <section className="write-main">
            <div className="write-toolbar">
              <span className="write-toolbar-title">{title || "Untitled"}</span>
              <button className="tb-btn">Tag</button>
              <button
                className="tb-btn"
                onClick={deleteEntry}
                disabled={loading || !canDelete}
                style={{
                  color: canDelete ? "#dc2626" : undefined,
                  borderColor: canDelete ? "#dc2626" : undefined,
                }}
              >
                Delete
              </button>
              <button
                className="tb-btn primary"
                onClick={analyze}
                disabled={analyzing || loading || !canAnalyze}
              >
                {analyzing ? "Analyzing…" : "Analyze"}
              </button>
            </div>

            <input
              className="entry-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title..."
            />
            <div className="entry-date-line">
              {entryDate
                ? formatDate(entryDate)
                : formatDate(new Date().toISOString())}
            </div>
            <textarea
              className="entry-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely..."
            />

            {analyzing && (
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: "1px solid #E2DDD4",
                  background: "#FDFAF6",
                  marginTop: 16,
                  fontSize: 13,
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid #ccc",
                    borderTopColor: "#c8a96e",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Analyzing your journal entry…
              </div>
            )}

            {analysis && !analyzing && (
              <div
                style={{
                  marginTop: 16,
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: "1px solid #E2DDD4",
                  background: "#FDFAF6",
                }}
              >
                {analysis.error ? (
                  <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>
                    {analysis.error}
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 12px",
                          borderRadius: 20,
                          background: "#F0EDE6",
                          color: "#4A3728",
                        }}
                      >
                        Mood: {analysis.mood_detected || analysis.mood}
                      </span>
                      {analysis.stress_level !== undefined && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: 20,
                            background: "#F0EDE6",
                            color: stressColor(analysis.stress_level),
                          }}
                        >
                          Stress: {analysis.stress_level}/100 —{" "}
                          {analysis.stress_label}
                        </span>
                      )}
                      {analysis.risk_level && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 12px",
                            borderRadius: 20,
                            background: "#F0EDE6",
                            color: riskColor(analysis.risk_level),
                          }}
                        >
                          Risk: {analysis.risk_level}
                        </span>
                      )}
                    </div>

                    {analysis.stress_level !== undefined && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "#888",
                            marginBottom: 4,
                          }}
                        >
                          <span>Stress level</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: stressColor(analysis.stress_level),
                            }}
                          >
                            {analysis.stress_level}/100
                          </span>
                        </div>
                        <div
                          style={{
                            background: "#F0EDE6",
                            borderRadius: 20,
                            height: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${analysis.stress_level}%`,
                              height: "100%",
                              borderRadius: 20,
                              background: stressColor(analysis.stress_level),
                              transition: "width 0.8s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {analysis.summary && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#4A3728",
                          margin: "0 0 12px",
                          lineHeight: 1.7,
                        }}
                      >
                        {analysis.summary}
                      </p>
                    )}

                    {analysis.suggestions?.length > 0 && (
                      <div
                        style={{
                          background: "#F8F5F0",
                          borderRadius: 8,
                          padding: "10px 14px",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: 6,
                          }}
                        >
                          Suggestions
                        </div>
                        {analysis.suggestions.map((s, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 13,
                              color: "#4A3728",
                              marginBottom: 4,
                            }}
                          >
                            • {s}
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.affirmation && (
                      <div
                        style={{
                          borderLeft: "3px solid #c8a96e",
                          paddingLeft: 12,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "#888",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: 4,
                          }}
                        >
                          Affirmation
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#4A3728",
                            fontStyle: "italic",
                          }}
                        >
                          "{analysis.affirmation}"
                        </div>
                      </div>
                    )}

                    {analysis.key_phrases?.length > 0 && (
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {analysis.key_phrases.map((kp) => (
                          <span
                            key={kp}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 20,
                              background: "#EDE8E3",
                              color: "#6B6660",
                            }}
                          >
                            {kp}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="write-footer">
              <select
                className="mood-select"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {MOODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <span className="char-info">{content.length} characters</span>
              {saveStatus === "saved" && (
                <span style={{ fontSize: 12, color: "#16a34a" }}>✓ Saved</span>
              )}
              {saveStatus === "error" && (
                <span style={{ fontSize: 12, color: "#dc2626" }}>
                  ✗ Save failed — write something first
                </span>
              )}
              <button
                className="tb-btn primary"
                onClick={save}
                disabled={loading || !canSave}
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </section>
        </div>
      </section>

      {/* New Journal Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Create a new journal</div>
            <div className="modal-sub">
              Give it a name and pick a cover to get started.
            </div>
            <input
              className="modal-input"
              value={newJournalName}
              onChange={(e) => setNewJournalName(e.target.value)}
              placeholder="Journal name e.g. Travel Notes"
            />
            <div
              style={{
                color: "var(--text2)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: ".06em",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Choose a cover
            </div>
            <div className="cover-pick">
              {coverClasses.map((cover) => (
                <button
                  key={cover}
                  className={`cover-opt ${cover}${selectedCover === cover ? " selected" : ""}`}
                  onClick={() => setSelectedCover(cover)}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="btn-create" onClick={createJournal}>
                Create journal
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
