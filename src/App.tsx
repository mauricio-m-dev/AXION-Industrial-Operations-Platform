/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { ClickTracker } from "./components/ClickTracker";

// Lazy Loaded Pages
const OperatorPage = lazy(() => import("./pages/OperatorPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ExecutivePage = lazy(() => import("./pages/ExecutivePage"));

// Suspense Fallback
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-white">
    <div className="flex items-center gap-3 mb-6">
      <span className="h-6 w-1.5 bg-[#DC2626] inline-block animate-pulse" />
      <span className="text-3xl font-black tracking-widest text-white">AXION</span>
    </div>
    <div className="w-[180px] h-[3px] bg-red-950/30 rounded-full overflow-hidden relative">
      <div 
        className="absolute top-0 h-full bg-gradient-to-r from-transparent via-[#DC2626] to-transparent" 
        style={{ 
          width: '100%',
          animation: 'shimmer-bar 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1)' 
        }} 
      />
    </div>
    <div className="text-[#71717A] text-[9px] font-bold uppercase tracking-[0.3em] mt-4 opacity-80">
      Industrial Operations
    </div>
    <style>{`
      @keyframes shimmer-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, adminPath }: { children: React.ReactNode, adminPath: string }) => {
  const isAuthenticated = !!localStorage.getItem("admin-token");
  if (!isAuthenticated) return <Navigate to={`/${adminPath}/login`} replace />;
  return <>{children}</>;
};

export default function App() {
  const adminPath = (import.meta as any).env.VITE_ADMIN_PATH || "admin";

  return (
    <Router>
      <ClickTracker />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Route */}
          <Route path="/chamado" element={<OperatorPage />} />
          
          {/* Admin Routes */}
          <Route path={`/${adminPath}/login`} element={<LoginPage />} />
          <Route 
            path={`/${adminPath}`} 
            element={
              <ProtectedRoute adminPath={adminPath}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Executive Dashboard */}
          <Route 
            path="/painel-executivo" 
            element={
              <ProtectedRoute adminPath={adminPath}>
                <ExecutivePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/chamado" replace />} />
          <Route path="*" element={<Navigate to="/chamado" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" />
    </Router>
  );
}

