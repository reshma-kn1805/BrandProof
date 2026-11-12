import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Play,
  RotateCw,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Info,
  Layers,
  ChevronRight,
  X,
  FileText
} from "lucide-react";
import {
  api,
  GuidelineHealthResponse,
  GuidelineHealthClause,
  GuidelineHealthConflict,
  ClauseBacktestResult,
  User
} from "../lib/api";

interface GuidelineHealthViewProps {
  currentUser: User | null;
  onNavigateToVersionCompare?: (docId: number, v1: string, v2: string) => void;
}

export const GuidelineHealthView: React.FC<GuidelineHealthViewProps> = ({
  currentUser,
  onNavigateToVersionCompare,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<GuidelineHealthResponse | null>(null);
  const [includeDemoHistory, setIncludeDemoHistory] = useState<boolean>(true);

  // Reword & Backtest Modal state
  const [selectedClause, setSelectedClause] = useState<GuidelineHealthClause | null>(null);
  const [proposedTitle, setProposedTitle] = useState<string>("");
  const [proposedDesc, setProposedDesc] = useState<string>("");
  const [proposedSeverity, setProposedSeverity] = useState<string>("warning");
  const [proposedKeywords, setProposedKeywords] = useState<string>("");
  const [changelog, setChangelog] = useState<string>("");
  
  const [backtesting, setBacktesting] = useState<boolean>(false);
  const [backtestResult, setBacktestResult] = useState<ClauseBacktestResult | null>(null);
  
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<{
    versionNumber: string;
    docId: number;
  } | null>(null);

  const fetchHealth = async (includeDemo: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGuidelineHealth(includeDemo);
      setHealthData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load guideline health intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth(includeDemoHistory);
  }, [includeDemoHistory]);

  const handleOpenRewordModal = (clause: GuidelineHealthClause) => {
    setSelectedClause(clause);
    setProposedTitle(clause.title);
    setProposedDesc(clause.description);
    setProposedSeverity(clause.severity);
    setProposedKeywords("");
    setChangelog(
      `Revised criteria for Clause ${clause.clause_number} to improve clarity and reduce false positive overrides.`
    );
    setBacktestResult(null);
    setPublishSuccess(null);
  };

  const handleRunBacktest = async () => {
    if (!selectedClause) return;
    setBacktesting(true);
    setError(null);
    try {
      const keywordsList = proposedKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await api.backtestClause(selectedClause.clause_id, {
        proposed_title: proposedTitle,
        proposed_description: proposedDesc,
        proposed_severity: proposedSeverity,
        proposed_rules: keywordsList.length > 0 ? { keywords: keywordsList } : null,
        include_demo_history: includeDemoHistory,
      });
      setBacktestResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to execute rule backtest.");
    } finally {
      setBacktesting(false);
    }
  };

  const handlePublishRevision = async () => {
    if (!selectedClause) return;
    setPublishing(true);
    setError(null);
    try {
      const keywordsList = proposedKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await api.publishRevisedClause(selectedClause.clause_id, {
        changelog: changelog || `Updated Clause ${selectedClause.clause_number}`,
        title: proposedTitle,
        description: proposedDesc,
        severity: proposedSeverity,
        rules_json: keywordsList.length > 0 ? { keywords: keywordsList } : null,
      });

      setPublishSuccess({
        versionNumber: res.version_number,
        docId: res.document_id,
      });
      // Refresh background data
      fetchHealth(includeDemoHistory);
    } catch (err: any) {
      setError(err?.message || "Failed to publish guideline revision.");
    } finally {
      setPublishing(false);
    }
  };

  const isManagerOrAdmin =
    currentUser?.role === "Manager" || currentUser?.role === "Admin";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header & Demo Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Guideline Health & Rule Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2B2B2B] text-white">
              Improvement 1
            </span>
            {healthData?.kpis.has_demo_history && includeDemoHistory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <Info className="w-3 h-3" />
                Includes demo history
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real review telemetry analyzing clause override rates, ambiguous rules, and overlapping conflicts.
          </p>
        </div>

        {/* Demo History Switch */}
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 cursor-pointer">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            Include Historical Demo Data
          </label>
          <input
            type="checkbox"
            checked={includeDemoHistory}
            onChange={(e) => setIncludeDemoHistory(e.target.checked)}
            className="w-4 h-4 text-[#328C91] rounded border-gray-300 focus:ring-[#328C91]"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchHealth(includeDemoHistory)}
            className="text-xs underline font-semibold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-[#328C91]" />
          <p className="text-sm">Calculating guideline override analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>Monitored Clauses</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {healthData?.kpis.total_clauses ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Active tenant guideline rules
              </p>
            </div>

            <div
              className={`p-5 rounded-xl border shadow-sm ${
                (healthData?.kpis.unclear_clauses_count ?? 0) > 0
                  ? "bg-amber-50/50 border-amber-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span className="text-amber-800">Possibly Unclear</span>
                <HelpCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-amber-900 mt-2">
                {healthData?.kpis.unclear_clauses_count ?? 0}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                ≥6 decisions with ≥50% overrides
              </p>
            </div>

            <div
              className={`p-5 rounded-xl border shadow-sm ${
                (healthData?.kpis.conflicting_pairs_count ?? 0) > 0
                  ? "bg-red-50/50 border-red-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span className="text-red-800">Conflicting Pairs</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-3xl font-extrabold text-red-900 mt-2">
                {healthData?.kpis.conflicting_pairs_count ?? 0}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Overlapping spans in ≥3 reviews
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <span>Global Override Rate</span>
                <TrendingDown className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {healthData?.kpis.global_override_rate ?? 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Across {healthData?.kpis.total_decisions_recorded ?? 0} human decisions
              </p>
            </div>
          </div>

          {/* Section 1: Possibly Unclear Clauses Alert Banner */}
          {(healthData?.kpis.unclear_clauses_count ?? 0) > 0 && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Attention Required: Frequently Overridden Guideline Clauses</span>
              </div>
              <p className="text-sm text-amber-800">
                The intelligence engine identified rules where reviewers and creators frequently reject or edit findings. Rewording these clauses can reduce friction and false positives.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {healthData?.clauses
                  .filter((c) => c.is_unclear)
                  .map((c) => (
                    <div
                      key={c.clause_id}
                      className="bg-white p-4 rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-900">
                            Clause {c.clause_number}: {c.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            {c.override_rate}% Override Rate
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                          {c.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {Object.entries(c.reasons_breakdown).map(([r, count]) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px]"
                            >
                              {r} ({count})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleOpenRewordModal(c)}
                          className="px-3 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Reword & Backtest Clause
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 2: Conflicting Clause Pairs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Conflicting Guideline Clause Pairs
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pairs of distinct clauses that trigger concurrently on overlapping content spans across multiple drafts.
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                Threshold: ≥3 reviews
              </span>
            </div>

            {(!healthData?.conflicts || healthData.conflicts.length === 0) ? (
              <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-gray-700">No Conflicting Clauses Detected</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  All active guideline clauses evaluate distinct, non-overlapping content patterns.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {healthData.conflicts.map((conf, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-red-200 bg-red-50/20 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                          Conflict #{idx + 1}
                        </span>
                        <span>
                          Clause {conf.clause_a_number} ({conf.clause_a_title})
                        </span>
                        <span className="text-gray-400">vs</span>
                        <span>
                          Clause {conf.clause_b_number} ({conf.clause_b_title})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                          Overlaps in {conf.reviews_count} Reviews
                        </span>
                      </div>
                    </div>

                    {/* Example quotations showing overlap */}
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sample Overlapping Evidence from Reviews:
                      </p>
                      {conf.example_quotations.map((ex, eIdx) => (
                        <div
                          key={eIdx}
                          className="bg-white p-3 rounded border border-gray-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-gray-500">
                            <span className="font-medium text-gray-700">
                              Review #{ex.review_id}: {ex.review_title}
                            </span>
                          </div>
                          <p className="text-gray-800 font-mono bg-yellow-50/80 px-2 py-1 rounded border border-yellow-200/60 inline-block">
                            "{ex.overlapping_text}"
                          </p>
                          <div className="text-[11px] text-gray-500 flex gap-4 pt-0.5">
                            <span>
                              <b className="text-gray-700">Clause {conf.clause_a_number}:</b> "{ex.clause_a_text}"
                            </span>
                            <span>
                              <b className="text-gray-700">Clause {conf.clause_b_number}:</b> "{ex.clause_b_text}"
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Clause Performance Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Clause Telemetry & Override Analysis
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ordered by override rate. Rules with ≥6 decisions and ≥50% overrides are categorized as unclear.
                </p>
              </div>
              <span className="text-xs text-gray-500">
                Total clauses: {healthData?.clauses.length ?? 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3 px-4">Clause</th>
                    <th className="py-3 px-4">Category & Severity</th>
                    <th className="py-3 px-3 text-center">Triggered</th>
                    <th className="py-3 px-3 text-center">Decisions</th>
                    <th className="py-3 px-4">Override Rate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {(!healthData?.clauses || healthData.clauses.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        No active guideline clauses found.
                      </td>
                    </tr>
                  ) : (
                    healthData.clauses.map((c) => (
                      <tr key={c.clause_id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">
                            Clause {c.clause_number}
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-1">
                            {c.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="text-gray-700 font-medium">{c.category}</span>
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : c.severity === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-xs font-medium text-gray-700">
                          {c.total_triggered}
                        </td>
                        <td className="py-3.5 px-3 text-center text-xs">
                          {c.total_decisions < 6 ? (
                            <span className="text-gray-400 font-medium">
                              {c.total_decisions} / 6 min
                            </span>
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {c.total_decisions}
                              <div className="text-[10px] text-gray-400 font-normal">
                                {c.accepted_count} acc / {c.edited_count} ed / {c.rejected_count} rej
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {c.total_decisions < 6 ? (
                            <span className="text-gray-400 italic">
                              Not enough decisions yet (need 6)
                            </span>
                          ) : (
                            <div className="w-36 space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span
                                  className={
                                    c.override_rate >= 50
                                      ? "text-red-700"
                                      : c.override_rate >= 25
                                      ? "text-amber-700"
                                      : "text-green-700"
                                  }
                                >
                                  {c.override_rate}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    c.override_rate >= 50
                                      ? "bg-red-500"
                                      : c.override_rate >= 25
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(c.override_rate, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {c.health_status === "unclear" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              Possibly Unclear
                            </span>
                          ) : c.health_status === "healthy" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Healthy
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Insufficient Data
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isManagerOrAdmin ? (
                            <button
                              onClick={() => handleOpenRewordModal(c)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#328C91] hover:text-white hover:bg-[#328C91] border border-[#328C91] rounded transition-colors inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Reword & Backtest
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Manager only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reword & Backtest Modal */}
      {selectedClause && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-gray-200 my-8 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#328C91]" />
                <h3 className="font-bold text-gray-900 text-base">
                  Reword & Backtest Clause {selectedClause.clause_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClause(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
                <div className="font-semibold text-gray-700">Current Clause Baseline:</div>
                <div className="text-gray-800 mt-0.5 font-medium">{selectedClause.title}</div>
                <div className="text-gray-500 mt-1">{selectedClause.description}</div>
                <div className="mt-2 text-amber-800 font-semibold">
                  Current Override Rate: {selectedClause.override_rate}% ({selectedClause.total_decisions} decisions)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Proposed Clause Title
                </label>
                <input
                  type="text"
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#328C91]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Proposed Clause Description (Guideline Requirement)
                </label>
                <textarea
                  rows={3}
                  value={proposedDesc}
                  onChange={(e) => setProposedDesc(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#328C91]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Severity
                  </label>
                  <select
                    value={proposedSeverity}
                    onChange={(e) => setProposedSeverity(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="notice">Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Rule Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. clinical trial, certified"
                    value={proposedKeywords}
                    onChange={(e) => setProposedKeywords(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Action Button: Run Backtest */}
              <div className="pt-2">
                <button
                  onClick={handleRunBacktest}
                  disabled={backtesting || !proposedTitle || !proposedDesc}
                  className="w-full py-2 bg-[#2B2B2B] hover:bg-black text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {backtesting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Replaying Past Content Drafts...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      Run Backtest Simulation
                    </>
                  )}
                </button>
              </div>

              {/* Backtest Results Panel */}
              {backtestResult && (
                <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#328C91]" />
                      Backtest Simulation Results
                    </span>
                    <span className="text-xs text-gray-500">
                      {backtestResult.reviews_analyzed} reviews evaluated
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded border border-teal-200">
                      <div className="text-xl font-extrabold text-green-700">
                        {backtestResult.summary.removed}
                      </div>
                      <div className="text-[11px] text-gray-500">Findings Removed (Permitted)</div>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-teal-200">
                      <div className="text-xl font-extrabold text-red-700">
                        {backtestResult.summary.added}
                      </div>
                      <div className="text-[11px] text-gray-500">New Violations Added</div>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-teal-200">
                      <div className="text-xl font-extrabold text-gray-700">
                        {backtestResult.summary.unchanged}
                      </div>
                      <div className="text-[11px] text-gray-500">Unchanged Violations</div>
                    </div>
                  </div>

                  {/* Examples */}
                  {backtestResult.examples.removed.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-gray-700">Sample Now-Permitted Content:</span>
                      {backtestResult.examples.removed.map((ex, i) => (
                        <div key={i} className="bg-white p-2 rounded text-[11px] text-gray-600 border border-teal-100">
                          <span className="text-green-700 font-semibold line-through mr-1">"{ex.text_no_longer_flagged}"</span>
                          <span className="text-gray-400">({ex.review_title})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] text-gray-500 italic bg-white/70 p-2 rounded border border-teal-100">
                    ℹ️ {backtestResult.notice}
                  </div>

                  {/* Publish Section */}
                  <div className="pt-3 border-t border-teal-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Version Changelog Note
                    </label>
                    <input
                      type="text"
                      value={changelog}
                      onChange={(e) => setChangelog(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                    />

                    <button
                      onClick={handlePublishRevision}
                      disabled={publishing || !changelog}
                      className="w-full py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {publishing ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          Publishing New Guideline Version...
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-4 h-4" />
                          Publish as New Guideline Version
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Publish Success State */}
              {publishSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                  <div className="font-bold text-sm text-green-900">
                    Published Guideline Version {publishSuccess.versionNumber}!
                  </div>
                  <p className="text-xs text-green-800">
                    Previous version archived and revision logged to cryptographic audit trail.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    {onNavigateToVersionCompare && (
                      <button
                        onClick={() => {
                          setSelectedClause(null);
                          onNavigateToVersionCompare(
                            publishSuccess.docId,
                            "1.0",
                            publishSuccess.versionNumber
                          );
                        }}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Version Comparison
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedClause(null)}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

