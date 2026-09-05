import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/AdminLayout";
import { Login } from "./pages/Login";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import "./App.css";

// Lazy load all pages for fast initial load
const Dashboard = React.lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Users = React.lazy(() => import("./pages/Users").then((m) => ({ default: m.Users })));
const Contacts = React.lazy(() => import("./pages/Contacts").then((m) => ({ default: m.Contacts })));
const Campaigns = React.lazy(() => import("./pages/Campaigns").then((m) => ({ default: m.Campaigns })));
const Queue = React.lazy(() => import("./pages/Queue").then((m) => ({ default: m.Queue })));
const Events = React.lazy(() => import("./pages/Events").then((m) => ({ default: m.Events })));
const Templates = React.lazy(() => import("./pages/Templates").then((m) => ({ default: m.Templates })));
const Broadcast = React.lazy(() => import("./pages/Broadcast").then((m) => ({ default: m.Broadcast })));
const AuditLogs = React.lazy(() => import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const Settings = React.lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const System = React.lazy(() => import("./pages/System").then((m) => ({ default: m.System })));

const PageLoader = () => (
  <div className="flex h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs font-medium text-muted-foreground animate-pulse">Loading view...</span>
    </div>
  </div>
);

const AdminSuspenseOutlet = () => (
  <Suspense fallback={<PageLoader />}>
    <Outlet />
  </Suspense>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route element={<AdminSuspenseOutlet />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/events" element={<Events />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/system" element={<System />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
