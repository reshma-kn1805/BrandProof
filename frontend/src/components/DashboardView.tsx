import React, { useEffect, useState } from "react";
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Scale,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { api, DashboardMetrics } from "../lib/api";

interface DashboardViewProps {
  onNavigateToReviews: () => void;
  onNavigateToNewReview: () => void;
  onNavigateToFacts: () => void;
  onNavigateToGuidelines: () => void;
  onSelectReview: (id: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToReviews,
  onNavigateToNewReview,
  onNavigateToFacts,
  onNavigateToGuidelines,
  onSelectReview,
}) => {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Phase 8: 3-Minute First-Run Guide
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("brandproof_guide_dismissed") === "true";
    }
    return false;
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("brandproof_guide_steps");
        return stored ? JSON.parse(stored) : [1];
      } catch {
        return [1];
      }
    }
    return [1];
  });

  const toggleStep = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepNum)
        ? prev.filter((s) => s !== stepNum)
        : [...prev, stepNum];
      if (typeof window !== "undefined") {
        localStorage.setItem("brandproof_guide_steps", JSON.stringify(next));
      }
      return next;
    });
  };

  const handleDismissGuide = () => {
    setGuideDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("brandproof_guide_dismissed", "true");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const metrics = await api.getDashboard();
      setData(metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-[#63777C]">
          <div className="w-6 h-6 border-2 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Loading organization compliance metrics...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-[#172E35] to-[#205E65] text-white p-6 rounded-lg shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-widest bg-[#328C91] px-2 py-0.5 rounded text-white font-semibold">
              Live Governance Workspace
            </span>
            <span className="text-xs text-[#DCE7E8]/80 font-medium">
              Nila Foods (Fictional Demonstration)
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Brand Governance & Content Verification
          </h2>
          <p className="text-xs text-[#DCE7E8]/80 mt-1 max-w-xl">
            Strict evidence-based verification. Every finding is anchored to an active guideline clause or approved, unexpired fact.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onNavigateToNewReview}
            className="px-4 py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#328C91]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Submit Content for Audit</span>
          </button>
        </div>
      </div>

      {/* Phase 8: 3-Minute First-Run Interactive Checklist */}
      {!guideDismissed && (
        <div className="p-5 bg-white border border-[#CBD5E1] rounded-lg shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#EAF2F3] text-[#205E65] rounded-md font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#328C91]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Try the Demo in 3 Minutes
                </h3>
                <p className="text-[11px] text-[#475569]">
                  Follow this guided quick-tour to experience evidence verification, role approvals, and cryptographic audit logs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[#328C91] bg-[#EAF2F3] px-2.5 py-1 rounded-full">
                {completedSteps.length} of 5 completed
              </span>
              <button
                type="button"
                onClick={handleDismissGuide}
                title="Dismiss checklist"
                aria-label="Dismiss checklist"
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
            {[
              {
                num: 1,
                title: "1. Submit Draft",
                desc: "Paste marketing copy or click a sample preset",
                action: onNavigateToNewReview,
                actionLabel: "Submit Copy",
              },
              {
                num: 2,
                title: "2. Inspect Evidence",
                desc: "Examine cited clause & accept phrase correction",
                action: () => data.recent_activity?.[0]?.id ? onSelectReview(data.recent_activity[0].id) : onNavigateToReviews(),
                actionLabel: "Open Review",
              },
              {
                num: 3,
                title: "3. Switch to Manager",
                desc: "Use role dropdown at top right to switch",
                action: undefined,
                actionLabel: undefined,
              },
              {
                num: 4,
                title: "4. Authorize Document",
                desc: "Final approval by human manager with note",
                action: onNavigateToReviews,
                actionLabel: "View Queue",
              },
              {
                num: 5,
                title: "5. Verify Audit Report",
                desc: "Inspect SHA-256 tamper-evident fingerprint",
                action: () => window.location.hash = "#verify_report",
                actionLabel: "Verify Log",
              },
            ].map((step) => {
              const done = completedSteps.includes(step.num);
              return (
                <div
                  key={step.num}
                  className={`p-3 rounded-md border text-left flex flex-col justify-between transition-colors ${
                    done
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#328C91]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold ${done ? "text-[#166534]" : "text-[#0F172A]"}`}>
                        {step.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStep(step.num)}
                        aria-label={`Mark step ${step.num} as ${done ? "incomplete" : "complete"}`}
                        className="text-[#328C91] hover:text-[#205E65]"
                      >
                        {done ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-tight">
                      {step.desc}
                    </p>
                  </div>
                  {step.action && !done && (
                    <button
                      type="button"
                      onClick={() => {
                        step.action?.();
                        toggleStep(step.num);
                      }}
                      className="mt-2 text-[10px] font-bold text-[#328C91] hover:text-[#205E65] flex items-center gap-1"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#63777C]">
            <span className="text-xs font-medium uppercase tracking-wide">Total Reviews</span>
            <FileCheck2 className="w-4 h-4 text-[#328C91]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#172C32]">{data.total_reviews}</span>
            <span className="text-[11px] text-[#63777C]">all time submissions</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#63777C]">
            <span className="text-xs font-medium uppercase tracking-wide">Avg Compliance Score</span>
            <TrendingUp className="w-4 h-4 text-[#1E7E51]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#172C32]">{data.compliance_average}%</span>
            <span className="text-[11px] text-[#1E7E51] font-medium">verified standard</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#63777C]">
            <span className="text-xs font-medium uppercase tracking-wide">Reviews Requiring Attention</span>
            <AlertTriangle className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#B45309]">
              {data.submissions_requiring_attention}
            </span>
            <span className="text-[11px] text-[#63777C]">critical or human review</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#63777C]">
            <span className="text-xs font-medium uppercase tracking-wide">Expired Facts</span>
            <Scale className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#B91C1C]">
              {data.expired_facts_count}
            </span>
            <span className="text-[11px] text-[#63777C]">e.g. Fact F-07 (Expired)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Approvals & Triggered Clauses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Approvals Queue (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-[#DCE7E8] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172C32]">Submissions Awaiting Approval</h3>
              <p className="text-[11px] text-[#63777C]">Human reviewer and manager sign-off queue</p>
            </div>
            <button
              onClick={onNavigateToReviews}
              className="text-xs font-semibold text-[#328C91] hover:text-[#205E65] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#DCE7E8]">
            {(data.pending_approvals ?? []).length === 0 ? (
              <div className="p-8 text-center text-xs text-[#63777C]">
                No pending submissions in queue. All reviews up to date.
              </div>
            ) : (
              (data.pending_approvals ?? []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectReview(item.id)}
                  className="p-4 flex items-center justify-between hover:bg-[#F7FAFA] cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#172C32]">{item.title}</span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#63777C]">
                      <span>Author: {item.author}</span>
                      <span>•</span>
                      <span>{item.date || item.submitted || "Today"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        item.score >= 80
                          ? "bg-[#E8F5E9] text-[#1E7E51]"
                          : item.score >= 50
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#FEE2E2] text-[#B91C1C]"
                      }`}
                    >
                      Score: {item.score}%
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF2F3] text-[#205E65] uppercase font-semibold">
                      {(item.status ?? "in_review").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Frequently Triggered Clauses (1 col) */}
        <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#DCE7E8] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172C32]">Frequently Triggered Clauses</h3>
              <p className="text-[11px] text-[#63777C]">Top guideline violations across submissions</p>
            </div>
            <BookOpen className="w-4 h-4 text-[#63777C]" />
          </div>

          <div className="p-4 flex-1 space-y-3">
            {(data.frequently_triggered_clauses ?? []).length === 0 ? (
              <div className="p-4 text-center text-xs text-[#63777C]">No clauses triggered yet.</div>
            ) : (
              (data.frequently_triggered_clauses ?? []).map((c, i) => (
                <div
                  key={c.clause_number}
                  className="p-2.5 rounded border border-[#DCE7E8] bg-[#F7FAFA] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-[#205E65] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {c.clause_number}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#172C32]">{c.title}</span>
                      <span className="text-[10px] text-[#63777C]">{c.category}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded">
                    {c.trigger_count}x
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-[#DCE7E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#63777C]" />
            <h3 className="text-sm font-bold text-[#172C32]">Recent Verification & Audit Trail</h3>
          </div>
          <span className="text-[11px] text-[#63777C]">Immutable audit log</span>
        </div>
        <div className="divide-y divide-[#DCE7E8]">
          {(data.recent_activity ?? []).map((log) => (
            <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#328C91]"></span>
                <span className="font-semibold text-[#172C32]">{log.user_name}</span>
                <span className="text-[#63777C] font-mono bg-[#EAF2F3] px-1.5 py-0.5 rounded text-[10px]">
                  {log.action}
                </span>
                <span className="text-[#63777C] hidden sm:inline">{log.target_type}</span>
              </div>
              <span className="text-[#63777C] text-[11px]">{log.time_ago}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

