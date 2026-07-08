import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Chat from "./pages/Chat";
import RiskReport from "./pages/RiskReport";
import UploadCSV from "./pages/UploadCSV";

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-text">Loading MindTrack...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="app-shell">
      <Sidebar />
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/journal" element={<ProtectedLayout><Journal /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><Chat /></ProtectedLayout>} />
      <Route path="/mood" element={<Navigate to="/dashboard" />} />
      <Route path="/risk" element={<ProtectedLayout><RiskReport /></ProtectedLayout>} />
      <Route path="/upload" element={<ProtectedLayout><UploadCSV /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
