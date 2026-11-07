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
import { api, clearToken, getToken, User } from "../lib/api";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView | "review_detail">("dashboard");
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    checkAuth();
    if (
      typeof window !== "undefined" &&
      (window.location.hostname.includes("github.io") ||
        window.location.hostname.includes("vercel.app") ||
        window.location.port === "")
    ) {
      setIsDemoMode(true);
    }
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
    } catch (err) {
      clearToken();
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
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
      localStorage.setItem("brandproof_token", res.access_token);
      setCurrentUser(res.user);
    } catch (err) {
      console.error("Role switch failed", err);
    }
  };

  const handleSelectReview = (id: number) => {
    setSelectedReviewId(id);
    setActiveView("review_detail");
  };

  const handleLoadDemoDraft = () => {
    setActiveView("new_review");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#EAF2F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#205E65]">
          <div className="w-8 h-8 border-3 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold">Initializing BrandProof Workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7FAFA]">
      {/* Permanent Charcoal Sidebar */}
      <Sidebar
        activeView={activeView === "review_detail" ? "reviews" : activeView}
        setActiveView={(v) => {
          setSelectedReviewId(null);
          setActiveView(v);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isDemoMode && (
          <div className="bg-[#EAF2F3] border-b border-[#205E65]/20 text-[#205E65] px-4 py-1.5 text-xs text-center font-medium">
            Demo mode: this page runs in your browser on sample data. The full engine runs from the GitHub repository.
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
              onNavigateToReviews={() => setActiveView("reviews")}
              onNavigateToNewReview={() => setActiveView("new_review")}
              onNavigateToFacts={() => setActiveView("facts")}
              onNavigateToGuidelines={() => setActiveView("guidelines")}
              onSelectReview={handleSelectReview}
            />
          )}

          {activeView === "reviews" && (
            <ReviewsView
              onSelectReview={handleSelectReview}
              onNavigateToNewReview={() => setActiveView("new_review")}
            />
          )}

          {activeView === "new_review" && (
            <NewReviewView
              onReviewCreated={(id) => handleSelectReview(id)}
              onCancel={() => setActiveView("reviews")}
            />
          )}

          {activeView === "review_detail" && selectedReviewId && (
            <ReviewDetailView
              reviewId={selectedReviewId}
              currentUser={currentUser}
              onBack={() => setActiveView("reviews")}
              onReviewUpdated={() => {}}
            />
          )}

          {activeView === "guidelines" && (
            <GuidelinesView
              currentUser={currentUser}
              onNavigateToCompare={() => setActiveView("version_compare")}
            />
          )}

          {activeView === "version_compare" && (
            <VersionCompareView onBack={() => setActiveView("guidelines")} />
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
  );
}

