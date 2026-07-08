import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const SAMPLE_CSV = `date,text
2024-01-01,"Feeling anxious today"
2024-01-05,"Had a great day!"
2024-01-09,"Struggling to focus lately"`;

export default function UploadCSV() {
  const { authFetch } = useAuth();
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const parseCSV = text => {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map(header => header.trim().toLowerCase());
    const dateIndex = headers.indexOf("date");
    const textIndex = headers.indexOf("text");
    if (dateIndex === -1 || textIndex === -1) throw new Error("CSV must include date and text columns");
    return lines.slice(1).map(line => {
      const cols = line.split(",");
      return {
        date: cols[dateIndex]?.trim(),
        text: cols.slice(textIndex).join(",").trim().replace(/^"|"$/g, "")
      };
    }).filter(row => row.date && row.text);
  };

  const handleFile = selectedFile => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }

    setFileName(selectedFile.name);
    setSuccess(false);
    setError("");
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = parseCSV(event.target.result);
        setPreview(parsed);
        setProgress(18);
        await uploadAndAnalyze(parsed, selectedFile.name);
      } catch (err) {
        setError(err.message);
        setProgress(0);
      }
    };
    reader.readAsText(selectedFile);
  };

  const uploadAndAnalyze = async rows => {
    setLoading(true);
    setProgress(45);
    try {
      const res = await authFetch("/journal/csv", {
        method: "POST",
        body: JSON.stringify({ entries: rows })
      });
      const data = await res.json();
      setResults(data.results || []);
      setProgress(100);
      setSuccess(true);
    } catch {
      setError("Upload failed. Please try again.");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_mindtrack.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page page-muted">
      <div className="page-title">Upload Data</div>
      <div className="page-sub">Upload a CSV of past posts to analyse longitudinal mental health patterns.</div>

      {/* Steps row on top */}
      <section className="steps-row" style={{ marginBottom: 24 }}>
        {[
          ["1", "Prepare your CSV", "Export posts from your social media or journal app. Make sure columns are labelled date and text."],
          ["2", "Upload the file", "Drag and drop or click to browse. Only .csv files are accepted. Max file size is 10 MB."],
          ["3", "View your report", "Head to the Risk Report page to see your entries tagged, trended, and visualised on the 30-day heatmap."],
        ].map(([num, title, body]) => (
          <div className="step-card" key={num}>
            <div className="step-num">{num}</div>
            <div className="step-title">{title}</div>
            <div className="step-sub">{body}</div>
          </div>
        ))}
      </section>

      {/* Upload left, Sample right */}
      <div className="u-content-grid">
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="u-card" style={{ padding: 20 }}>
            <div
              className="drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                handleFile(event.dataTransfer.files[0]);
              }}
              style={{ marginTop: 0 }}
            >
              <div className="drop-icon-wrap">CSV</div>
              <div className="drop-title">{fileName || "Drop your CSV file here"}</div>
              <div className="drop-sub">or <span className="drop-browse">click to browse</span> · .csv files only</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={event => handleFile(event.target.files[0])} />
            </div>

            {(loading || progress > 0) && !success && (
              <div className="progress-wrap" style={{ display: "block" }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <div className="progress-label">{loading ? `Uploading... ${progress}%` : "Processing complete"}</div>
              </div>
            )}

            {success && (
              <div className="success-bar">
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{fileName} uploaded successfully</div>
                  <div style={{ fontSize: 12, opacity: .8 }}>AI is now analysing your entries for risk patterns.</div>
                </div>
              </div>
            )}

            {error && <div className="u-note" style={{ background: "var(--red-bg)", color: "var(--red)" }}>{error}</div>}
          </div>

          {preview.length > 0 && (
            <div className="u-card">
              <div className="u-label">Preview ({preview.length} entries)</div>
              {preview.slice(0, 4).map((row, index) => (
                <div className="journal-entry" key={index}>
                  <div className="je-time">{row.date}</div>
                  <div className="je-preview">{row.text}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sample CSV on right */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="u-card">
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="u-label" style={{ marginBottom: 0 }}>Required CSV format</div>
              <button className="dl-btn" onClick={downloadSample}>Sample CSV</button>
            </div>
            <div className="code-block">
              <span className="code-comment">// Headers required:</span><br />
              <span className="code-field">date</span>, <span className="code-field">text</span><br /><br />
              <span className="code-comment">// Example rows:</span><br />
              <span className="code-value">2024-01-01</span>, <span className="code-value">"Feeling anxious today"</span><br />
              <span className="code-value">2024-01-05</span>, <span className="code-value">"Had a great day!"</span><br />
              <span className="code-value">2024-01-09</span>, <span className="code-value">"Struggling to focus lately"</span>
            </div>
          </div>
        </section>
      </div>

      {results.length > 0 && (
        <section className="u-card" style={{ marginTop: 16 }}>
          <div className="u-label">Latest Analysis ({results.length})</div>
          {results.slice(0, 5).map((row, index) => (
            <div className="journal-entry" key={index}>
              <div className="je-title">{row.risk_level} · {Math.round((row.risk_score || 0) * 100)}%</div>
              <div className="je-time">{row.date}</div>
              <div className="je-preview">{row.ai_response}</div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
