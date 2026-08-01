import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { SuspenseFallback } from "@/components/SuspenseFallback";

const Login = React.lazy(() => import("@/pages/Login"));
const VerifyEmail = React.lazy(() => import("@/pages/VerifyEmail"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Contacts = React.lazy(() => import("@/pages/Contacts"));
const Campaigns = React.lazy(() => import("@/pages/Campaigns"));
const Templates = React.lazy(() => import("@/pages/Templates"));
const Analytics = React.lazy(() => import("@/pages/Analytics"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const EmailQueue = React.lazy(() => import("@/pages/EmailQueue"));
const CampaignReport = React.lazy(() => import("@/pages/CampaignReport"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const Emails = React.lazy(() => import("@/pages/Emails"));
const Forms = React.lazy(() => import("@/pages/Forms"));
const Workflows = React.lazy(() => import("@/pages/Workflows"));
const CampaignWizard = React.lazy(() => import("@/pages/CampaignWizard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<Navigate to="/login" replace />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/audience" element={<Navigate to="/contacts" replace />} />
                <Route path="/emails" element={<Emails />} />
                <Route path="/forms" element={<Forms />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/new" element={<CampaignWizard />} />
                <Route path="/campaigns/:id/report" element={<CampaignReport />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/email-queue" element={<EmailQueue />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
