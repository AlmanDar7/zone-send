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
const EmailBuilder = React.lazy(() => import("@/pages/EmailBuilder"));
const FormBuilder = React.lazy(() => import("@/pages/FormBuilder"));
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
const TemplateGallery = React.lazy(() => import("@/pages/TemplateGallery"));
const FormPublishWizard = React.lazy(() => import("@/pages/FormPublishWizard"));
const WorkflowBuilder = React.lazy(() => import("@/pages/WorkflowBuilder"));
const PublicFormPage = React.lazy(() => import("@/pages/PublicFormPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes stale-time
      gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PublicSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicSuspense><Login /></PublicSuspense>} />
            <Route path="/auth/callback" element={<Navigate to="/login" replace />} />
            <Route path="/verify-email" element={<PublicSuspense><VerifyEmail /></PublicSuspense>} />
            <Route path="/reset-password" element={<PublicSuspense><ResetPassword /></PublicSuspense>} />
            <Route path="/f/:id" element={<PublicSuspense><PublicFormPage /></PublicSuspense>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/audience" element={<Navigate to="/contacts" replace />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/workflows/builder" element={<WorkflowBuilder />} />
              <Route path="/workflows/:id/builder" element={<WorkflowBuilder />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<CampaignWizard />} />
              <Route path="/campaigns/:id/report" element={<CampaignReport />} />
              <Route path="/forms/templates" element={<TemplateGallery category="form" />} />
              <Route path="/forms/:id/publish" element={<FormPublishWizard />} />
              <Route path="/emails/templates" element={<TemplateGallery category="email" />} />
              <Route path="/forms/builder" element={<FormBuilder />} />
              <Route path="/emails/builder" element={<EmailBuilder />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/email-queue" element={<EmailQueue />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            
            <Route path="*" element={<PublicSuspense><NotFound /></PublicSuspense>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
