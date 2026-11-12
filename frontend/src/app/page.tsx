"use client";

import React, { useEffect, useState } from "react";
import { Sidebar, ActiveView } from "../components/Sidebar";
import { Header } from "../components/Header";
import { DashboardView } from "../components/DashboardView";
import { ReviewsView } from "../components/ReviewsView";
import { ReviewDetailView } from "../components/ReviewDetailView";
import { NewReviewView } from "../components/NewReviewView";
import { GuidelinesView } from "../components/GuidelinesView";
import { VersionCompareView } from "../components/VersionCompareView";
import { FactsLedgerView } from "../components/FactsLedgerView";
import { TerminologyView } from "../components/TerminologyView";
import { BrandAssetsView } from "../components/BrandAssetsView";
import { ApprovalQueueView } from "../components/ApprovalQueueView";
import { AuditLogView } from "../components/AuditLogView";
import { TeamView } from "../components/TeamView";
import { SettingsView } from "../components/SettingsView";
import { AuthModal } from "../components/AuthModal";
import { BrandLogo } from "../components/BrandLogo";
import { ErrorBoundary } from "../components/ErrorBoundary";
import {
  api,
  clearToken,
  getToken,
  setToken,
  User,
  checkBackendHealth,
  setEngineMode,
} from "../lib/api";

type ServerStatus = "checking" | "waking" | "connected" | "demo";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [wakingElapsed, setWakingElapsed] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

  // Restore persisted view & selection across refreshes
  const [activeView, setActiveView] = useState<ActiveView | "review_detail">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brandproof_active_view");
      if (saved) return saved as ActiveView | "review_detail";
    }
    return "dashboard";
  });

  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brandproof_selected_review_id");
      if (saved) return Number(saved);
    }
    return null;
  });

  useEffect(() => {
    let isCancelled = false;

    // Detect deep link view parameter when unauthenticated
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const deepLink = params.get("view") || window.location.hash.replace("#", "");
      const validViews = [
        "dashboard", "reviews", "new_review", "guidelines", "version_compare",
        "facts", "terminology", "assets", "approvals", "audit", "team", "settings"
      ];
      if (deepLink && validViews.includes(deepLink)) {
        sessionStorage.setItem("brandproof_return_view", deepLink);
      }
    }

    async function initSystem() {
      // If user previously switched to demo mode in this session, keep them in demo mode without waking pause
      if (typeof window !== "undefined" && sessionStorage.getItem("brandproof_force_demo") === "true") {
        const quickCheck = await checkBackendHealth(1500);
        if (quickCheck && !isCancelled) {
          sessionStorage.removeItem("brandproof_force_demo");
          setEngineMode("connected");
          setIsDemoMode(false);
          setServerStatus("connected");
          await checkAuth();
          return;
        } else if (!isCancelled) {
          setEngineMode("demo");
          setIsDemoMode(true);
          setServerStatus("demo");
          await checkAuth();
          return;
        }
      }

      // Step 1: Probe backend with a 6-second timeout
      const isOnline = await checkBackendHealth(6000);
      if (isCancelled) return;

      if (isOnline) {
        setEngineMode("connected");
        setIsDemoMode(false);
        setServerStatus("connected");
        await checkAuth();
        return;
      }

      // Step 2: Backend cold/sleeping -> Show "Waking the server, one moment" and retry with backoff for up to 60s
      setServerStatus("waking");
      const startTime = Date.now();
      const maxWaitMs = 60000;
      let delayMs = 2000;

      while (Date.now() - startTime < maxWaitMs) {
        if (isCancelled) return;
        setWakingElapsed(Math.round((Date.now() - startTime) / 1000));
        await new Promise((r) => setTimeout(r, delayMs));
        if (isCancelled) return;

        const retryOnline = await checkBackendHealth(5000);
        if (isCancelled) return;

        if (retryOnline) {
          setEngineMode("connected");
          setIsDemoMode(false);
          setServerStatus("connected");
          await checkAuth();
          return;
        }

        delayMs = Math.min(delayMs * 1.5, 5000);
      }

      // Step 3: Timed out after 60s -> Fall back to isolated demo mode with clear banner
      if (!isCancelled) {
        sessionStorage.setItem("brandproof_force_demo", "true");
        setEngineMode("demo");
        setIsDemoMode(true);
        setServerStatus("demo");
        await checkAuth();
      }
    }

    initSystem();

    // Global session expiration handler (401 response anywhere)
    const handleSessionExpired = (e: any) => {
      clearToken();
      setCurrentUser(null);
      setSessionExpiredMsg(e?.detail || "Your session expired");
    };

    window.addEventListener("brandproof:session_expired", handleSessionExpired);

    return () => {
      isCancelled = true;
      window.removeEventListener("brandproof:session_expired", handleSessionExpired);
    };
  }, []);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      setSessionExpiredMsg(null);
    } catch (err: any) {
      clearToken();
      setCurrentUser(null);
      if (err?.message === "Your session expired") {
        setSessionExpiredMsg("Your session expired");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
    setSessionExpiredMsg(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brandproof_force_demo");
      localStorage.removeItem("brandproof_active_view");
      localStorage.removeItem("brandproof_selected_review_id");
    }
  };

  const handleSwitchRole = async (role: "Creator" | "Reviewer" | "Manager" | "Admin") => {
    const roleEmailMap: Record<string, string> = {
      Creator: "creator@nilafoods.com",
      Reviewer: "reviewer@nilafoods.com",
      Manager: "manager@nilafoods.com",
      Admin: "admin@nilafoods.com",
    };
    try {
      const email = roleEmailMap[role];
      const res = await api.login({ email, password: "BrandProof2026!" });
      setToken(res.access_token);
      setCurrentUser(res.user);
      setSessionExpiredMsg(null);
    } catch (err) {
      console.error("Role switch failed", err);
    }
  };

  const handleSetActiveView = (view: ActiveView | "review_detail") => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      localStorage.setItem("brandproof_active_view", view);
    }
  };

  const handleSelectReview = (id: number) => {
    setSelectedReviewId(id);
    handleSetActiveView("review_detail");
    if (typeof window !== "undefined") {
      localStorage.setItem("brandproof_selected_review_id", String(id));
    }
  };

  const handleLoadDemoDraft = () => {
    handleSetActiveView("new_review");
  };

  // Screen: Waking the server
  if (serverStatus === "waking") {
    return (
      <div className="min-h-screen bg-[#EAF2F3] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-elevated border border-[#DCE7E8] p-8 text-center space-y-5">
          <div className="flex justify-center">
            <BrandLogo variant="full" size="md" showTagline={true} />
          </div>
          <div className="space-y-2 pt-2">
            <div className="w-10 h-10 mx-auto rounded-full border-3 border-[#328C91] border-t-transparent animate-spin" />
            <h2 className="text-base font-bold text-[#172C32]">Waking the server, one moment</h2>
            <p className="text-xs text-[#63777C] leading-relaxed">
              The BrandProof backend engine is spinning up from cold sleep on the free cloud tier. Connecting automatically...
            </p>
          </div>
          <div className="bg-[#F7FAFA] border border-[#DCE7E8] rounded-lg py-2.5 px-4 text-xs text-[#205E65] font-mono">
            Elapsed: {wakingElapsed}s (retrying up to 60s)
          </div>
          <div>
            <button
              onClick={() => {
                sessionStorage.setItem("brandproof_force_demo", "true");
                setEngineMode("demo");
                setIsDemoMode(true);
                setServerStatus("demo");
                checkAuth();
              }}
              className="text-xs text-[#328C91] hover:text-[#205E65] underline font-medium transition-colors"
            >
              Skip waiting & use offline demo mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Initializing / loading
  if (serverStatus === "checking" || authLoading) {
    return (
      <div className="min-h-screen bg-[#EAF2F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#205E65]">
          <div className="w-8 h-8 border-3 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Connecting to BrandProof Engine...</span>
        </div>
      </div>
    );
  }

  // Screen: Unauthenticated
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <AuthModal
          onSuccess={(user) => {
            setCurrentUser(user);
            setSessionExpiredMsg(null);
            if (typeof window !== "undefined") {
              const returnView = sessionStorage.getItem("brandproof_return_view");
              if (returnView) {
                sessionStorage.removeItem("brandproof_return_view");
                handleSetActiveView(returnView as any);
              }
            }
          }}
          sessionExpiredMessage={sessionExpiredMsg}
        />
      </ErrorBoundary>
    );
  }

  const getViewTitle = (): string => {
    switch (activeView) {
      case "dashboard":
        return "Governance Dashboard";
      case "reviews":
        return "Content Verification Reviews";
      case "new_review":
        return "Submit Content for Audit";
      case "review_detail":
        return "Review & Evidence Audit";
      case "guidelines":
        return "Brand Guidelines & Clauses";
      case "version_compare":
        return "Version Differential Comparison";
      case "facts":
        return "Approved Facts Ledger";
      case "terminology":
        return "Brand Terminology Standards";
      case "assets":
        return "Brand Assets & Media Conformance";
      case "approvals":
        return "Human Review & Sign-Off Queue";
      case "audit":
        return "Immutable Audit Logs";
      case "team":
        return "Team & Role Permissions";
      case "settings":
        return "Workspace & AI Settings";
      default:
        return "BrandProof";
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F7FAFA]">
        {/* Permanent Charcoal Sidebar */}
        <Sidebar
          activeView={activeView === "review_detail" ? "reviews" : activeView}
          setActiveView={(v) => {
            setSelectedReviewId(null);
            handleSetActiveView(v);
            if (typeof window !== "undefined") {
              localStorage.removeItem("brandproof_selected_review_id");
            }
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isDemoMode && (
            <div className="bg-[#EAF2F3] border-b border-[#205E65]/20 text-[#205E65] px-4 py-2 text-xs text-center font-medium">
              Demo mode: sample data in your browser. The full engine could not be reached.
            </div>
          )}
          <Header
            title={getViewTitle()}
            currentUser={currentUser}
            onSwitchRole={handleSwitchRole}
            onLoadDemoDraft={handleLoadDemoDraft}
          />

          <main className="flex-1 overflow-y-auto">
            {activeView === "dashboard" && (
              <DashboardView
                onNavigateToReviews={() => handleSetActiveView("reviews")}
                onNavigateToNewReview={() => handleSetActiveView("new_review")}
                onNavigateToFacts={() => handleSetActiveView("facts")}
                onNavigateToGuidelines={() => handleSetActiveView("guidelines")}
                onSelectReview={handleSelectReview}
              />
            )}

            {activeView === "reviews" && (
              <ReviewsView
                onSelectReview={handleSelectReview}
                onNavigateToNewReview={() => handleSetActiveView("new_review")}
              />
            )}

            {activeView === "new_review" && (
              <NewReviewView
                onReviewCreated={(id) => handleSelectReview(id)}
                onCancel={() => handleSetActiveView("reviews")}
              />
            )}

            {activeView === "review_detail" && selectedReviewId && (
              <ReviewDetailView
                reviewId={selectedReviewId}
                currentUser={currentUser}
                onBack={() => handleSetActiveView("reviews")}
                onReviewUpdated={() => {}}
              />
            )}

            {activeView === "guidelines" && (
              <GuidelinesView
                currentUser={currentUser}
                onNavigateToCompare={() => handleSetActiveView("version_compare")}
              />
            )}

            {activeView === "version_compare" && (
              <VersionCompareView onBack={() => handleSetActiveView("guidelines")} />
            )}

            {activeView === "facts" && <FactsLedgerView currentUser={currentUser} />}

            {activeView === "terminology" && <TerminologyView currentUser={currentUser} />}

            {activeView === "assets" && <BrandAssetsView currentUser={currentUser} />}

            {activeView === "approvals" && (
              <ApprovalQueueView
                currentUser={currentUser}
                onSelectReview={handleSelectReview}
              />
            )}

            {activeView === "audit" && <AuditLogView />}

            {activeView === "team" && <TeamView currentUser={currentUser} />}

            {activeView === "settings" && <SettingsView />}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
