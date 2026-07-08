import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #E2DDD4",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    background: "#F0EDE6",
    color: "#1A1714",
    transition: "border-color 0.2s, background 0.2s"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F2EC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px"
    }}>

      {/* Subtle background shapes */}
      <div style={{ position: "fixed", top: 60, right: 100, width: 180, height: 180, borderRadius: "50%", border: "16px solid #E2DDD4", opacity: 0.4, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 100, left: 80, width: 80, height: 80, background: "#D4C5B0", borderRadius: 16, transform: "rotate(20deg)", opacity: 0.35, pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "45%", left: 50, width: 48, height: 48, background: "#C8D8E8", borderRadius: "50%", opacity: 0.3, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 60, right: 60, width: 60, height: 60, background: "#C5D4C0", borderRadius: 12, transform: "rotate(-15deg)", opacity: 0.3, pointerEvents: "none" }} />

      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 900,
        background: "#FFFEFB",
        borderRadius: 24,
        border: "1px solid #E2DDD4",
        overflow: "hidden"
      }}>

        {/* LEFT PANEL */}
        <div style={{
          flex: 1,
          background: "#4A3728",
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* decorative circle */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
              <div style={{
                width: 38, height: 38,
                background: "rgba(255,255,255,0.12)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.15)"
              }}>
                <span style={{ fontSize: 18 }}>🌿</span>
              </div>
              <span style={{ color: "#FFFEFB", fontSize: 18, fontFamily: "'DM Serif Display', serif", letterSpacing: 0.3 }}>MindTrack</span>
            </div>

            <h2 style={{
              color: "#FFFEFB",
              fontSize: 26,
              fontFamily: "'DM Serif Display', serif",
              fontWeight: 400,
              lineHeight: 1.35,
              marginBottom: 14
            }}>
              Understand your mental health through your social media
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.75 }}>
              Upload your social media posts and let our explainable AI analyse your mental health patterns over time.
            </p>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
            {[
              "Explainable AI risk analysis",
              "Longitudinal pattern detection",
              "Social media text analysis",
              "Transparent, interpretable insights"
            ].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "#FFFEFB", flexShrink: 0
                }}>✓</div>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{f}</span>
              </div>
            ))}

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8, paddingTop: 16 }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.6 }}>
                Not a substitute for professional mental health support. If you're in crisis, please call iCall: 9152987821
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          flex: 1,
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 24,
              fontFamily: "'DM Serif Display', serif",
              fontWeight: 400,
              color: "#1A1714",
              marginBottom: 6
            }}>
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p style={{ color: "#A09B95", fontSize: 13 }}>
              {isLogin ? "Sign in to continue your journey" : "Start tracking your mental wellness"}
            </p>
          </div>

          {/* Toggle tabs */}
          <div style={{
            display: "flex",
            background: "#F0EDE6",
            border: "1px solid #E2DDD4",
            borderRadius: 10,
            padding: 4,
            marginBottom: 28
          }}>
            {["Sign in", "Sign up"].map((label, i) => (
              <button
                key={label}
                onClick={() => { setIsLogin(i === 0); setError(""); }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 7,
                  border: (isLogin ? i === 0 : i === 1) ? "1px solid #E2DDD4" : "1px solid transparent",
                  background: (isLogin ? i === 0 : i === 1) ? "#FFFEFB" : "transparent",
                  color: (isLogin ? i === 0 : i === 1) ? "#4A3728" : "#A09B95",
                  fontSize: 13,
                  fontWeight: (isLogin ? i === 0 : i === 1) ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .15s"
                }}
              >{label}</button>
            ))}
          </div>

          <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#6B6660", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Full Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = "#7C5C47"; e.target.style.background = "#FFFEFB"; }}
                  onBlur={e => { e.target.style.borderColor = "#E2DDD4"; e.target.style.background = "#F0EDE6"; }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6B6660", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#7C5C47"; e.target.style.background = "#FFFEFB"; }}
                onBlur={e => { e.target.style.borderColor = "#E2DDD4"; e.target.style.background = "#F0EDE6"; }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6B6660", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#7C5C47"; e.target.style.background = "#FFFEFB"; }}
                onBlur={e => { e.target.style.borderColor = "#E2DDD4"; e.target.style.background = "#F0EDE6"; }}
              />
            </div>

            {error && (
              <div style={{
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#A09B95" : "#4A3728",
                color: "#FFFEFB",
                border: "none",
                borderRadius: 10,
                padding: "13px",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                marginTop: 4,
                transition: "background .15s"
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = "#7C5C47"; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = "#4A3728"; }}
            >
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "#A09B95", lineHeight: 1.6 }}>
            🔒 Your data is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}