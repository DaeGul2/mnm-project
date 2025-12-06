// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import EvalWizardPage from "./pages/EvalWizardPage";
import ReportBuilderPage from "./pages/ReportBuilderPage";
import ReportEditorPage from './pages/ReportEditorPage';
const appShellStyle = {
  minHeight: "100vh",
  backgroundColor: "#f3f4f6",
};

const navBarStyle = {
  borderBottom: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
};

const navInnerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "10px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const navLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const navBrandStyle = {
  fontWeight: 700,
  fontSize: "16px",
};

const navMenuStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const navLinkBaseStyle = {
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  textDecoration: "none",
  border: "1px solid transparent",
};

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...navLinkBaseStyle,
        borderColor: isActive ? "#2563eb" : "transparent",
        backgroundColor: isActive ? "#eff6ff" : "transparent",
        color: isActive ? "#1d4ed8" : "#4b5563",
      })}
    >
      {label}
    </NavLink>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={appShellStyle}>
        {/* 상단 네비게이션 바 */}
        <header style={navBarStyle}>
          <div style={navInnerStyle}>
            <div style={navLeftStyle}>
              <div style={navBrandStyle}>MNM Evaluation</div>
              <nav style={navMenuStyle}>
                <NavItem to="/graphs" label="그래프 만들기" />
                <NavItem to="/reports" label="보고서 만들기" />
              </nav>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              v0.1 · 내부용
            </div>
          </div>
        </header>

        {/* 실제 페이지 영역 */}
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/graphs" replace />} />
            <Route path="/graphs" element={<EvalWizardPage />} />
            <Route path="/reports" element={<ReportBuilderPage />} />
            <Route path="/report-editor/:roundId" element={<ReportEditorPage />} />
          </Routes>
        </main>
      </div>

    </BrowserRouter>
  );
}

export default App;
