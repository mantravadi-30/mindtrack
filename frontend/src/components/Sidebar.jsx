import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/journal", label: "Journal" },
  { path: "/upload", label: "Upload Data" },
  { path: "/risk", label: "Risk Report" },
  { path: "/chat", label: "AI Companion" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <nav className="top-nav">
      <button className="logo" onClick={() => navigate("/dashboard")}>
        MindTrack
      </button>
      <div className="nav-links">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-link${location.pathname === item.path ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <button className="btn-signout" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
