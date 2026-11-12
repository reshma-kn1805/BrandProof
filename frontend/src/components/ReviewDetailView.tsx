import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Edit2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  GitCommit,
  CheckCircle2,
  FileText,
  AlertCircle,
  Scale,
  HelpCircle,
  Send,
  CornerDownRight,
} from "lucide-react";
import { api, ContentReview, ReviewFinding, User } from "../lib/api";

interface ReviewDetailViewProps {
  reviewId: number;
  currentUser: User | null;
  onBack: () => void;
  onReviewUpdated?: () => void;
}

export const ReviewDetailView: React.FC<ReviewDetailViewProps> = ({
  reviewId,
  currentUser,
  onBack,
  onReviewUpdated,
}) => {
  const [review, setReview] = useState<ContentReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editModalFinding, setEditModalFinding] = useState<ReviewFinding | null>(null);
  const [customCorrection, setCustomCorrection] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [rejectModalFinding, setRejectModalFinding] = useState<ReviewFinding | null>(null);
  const [rejectReason, setRejectReason] = useState("False positive");
  const [rejectNote, setRejectNote] = useState("");
  const [activeAskFindingId, setActiveAskFindingId] = useState<number | null>(null);
  const [findingCommentMsg, setFindingCommentMsg] = useState("");
  const [isAskManagerThread, setIsAskManagerThread] = useState(false);
  const [threadSubmitting, setThreadSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedRevisionIndex, setSelectedRevisionIndex] = useState<number>(-1);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionModal, setDecisionModal] = useState<"approved" | "changes_requested" | "rejected" | null>(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadReviewDetails();
  }, [reviewId]);

  const loadReviewDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getReview(reviewId);
      setReview(data);
      setSelectedRevisionIndex(data.revisions.length - 1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load review details");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    findingId: number,
    action: "accept" | "edit" | "reject",
    options?: {
      editedText?: string;
      rejectReason?: string;
      rejectNote?: string;
    }
  ) => {
    try {
      setActionLoading(findingId);
      setEditError(null);
      const updated = await api.handleFindingAction(reviewId, findingId, action, options);
      setReview(updated);
      setSelectedRevisionIndex(updated.revisions.length - 1);
      setEditModalFinding(null);
      setRejectModalFinding(null);
      if (onReviewUpdated) onReviewUpdated();
    } catch (err: any) {
      if (action === "edit") {
        setEditError(err.message || "Edit failed brand verification.");
      } else {
        alert(err.message || "Action failed");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const added = await api.addComment(reviewId, newComment);
      setReview((prev) => (prev ? { ...prev, comments: [...prev.comments, added] } : null));
      setNewComment("");
    } catch (err: any) {
      alert(err.message || "Failed to post comment");
    }
  };

  const handlePostFindingComment = async (findingId: number) => {
    if (!findingCommentMsg.trim()) return;
    try {
      setThreadSubmitting(true);
      const commentType = isAskManagerThread ? "ask_manager" : "finding";
      const added = await api.addComment(reviewId, findingCommentMsg, findingId, commentType);
      setReview((prev) =>
        prev
          ? {
              ...prev,
              requires_human_attention: isAskManagerThread ? true : prev.requires_human_attention,
              comments: [...prev.comments, added],
            }
          : null
      );
      setFindingCommentMsg("");
      setIsAskManagerThread(false);
    } catch (err: any) {
      alert(err.message || "Failed to post comment");
    } finally {
      setThreadSubmitting(false);
    }
  };

  const handleDecision = async (decision: "approved" | "changes_requested" | "rejected") => {
    try {
      setDecisionSubmitting(true);
      const updated = await api.decideReview(reviewId, decision, decisionNotes);
      setReview(updated);
      setDecisionModal(null);
      setDecisionNotes("");
      if (onReviewUpdated) onReviewUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to record approval decision");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#63777C] flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
        <span>Retrieving review pipeline details...</span>
      </div>
    );
  }

  if (errorMsg || !review) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-8 h-8 text-[#B91C1C]" />
        <h3 className="text-sm font-bold text-[#172C32]">Failed to Load Review Record</h3>
        <p className="text-xs text-[#63777C] max-w-sm">
          {errorMsg || "The requested content review could not be retrieved from the database."}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={loadReviewDetails}
            className="px-3.5 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            Retry Request
          </button>
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#172C32] text-xs font-semibold rounded border border-[#DCE7E8] transition-colors"
          >
            Back to Reviews
          </button>
        </div>
      </div>
    );
  }

  const activeRevision =
    selectedRevisionIndex >= 0 && review.revisions[selectedRevisionIndex]
      ? review.revisions[selectedRevisionIndex]
      : review.revisions[review.revisions.length - 1];

  // Helper to render before-and-after visual diff
  const renderVisualDiff = () => {
    if (!review.revisions || review.revisions.length <= 1) {
      return (
        <div className="p-4 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#172C32]">
          {review.current_content}
        </div>
      );
    }

    const original = review.original_content;
    const current = review.current_content;

    return (
      <div className="space-y-3">
        <div className="p-3 bg-[#FEE2E2]/40 border border-[#FCA5A5]/60 rounded-md">
          <span className="text-[10px] font-mono font-bold uppercase text-[#991B1B] block mb-1">
            Original Submission (Revision 1)
          </span>
          <p className="font-mono text-xs text-[#991B1B] leading-relaxed line-through whitespace-pre-wrap">
            {original}
          </p>
        </div>

        <div className="p-3 bg-[#DCFCE7]/40 border border-[#86EFAC]/60 rounded-md">
          <span className="text-[10px] font-mono font-bold uppercase text-[#166534] block mb-1">
            Current Revised Content (Revision {review.revisions.length})
          </span>
          <p className="font-mono text-xs text-[#166534] font-medium leading-relaxed whitespace-pre-wrap">
            {current}
          </p>
        </div>
      </div>
    );
  };

  const isReviewerOrManager = currentUser && ["Reviewer", "Manager", "Admin"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE7E8] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-[#EAF2F3] text-[#63777C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#172C32]">{review.title}</h2>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                  review.status === "approved"
                    ? "bg-[#E8F5E9] text-[#1E7E51]"
                    : review.status === "rejected"
                    ? "bg-[#FEE2E2] text-[#B91C1C]"
                    : review.status === "changes_requested"
                    ? "bg-[#FEF3C7] text-[#B45309]"
                    : "bg-[#EAF2F3] text-[#205E65]"
                }`}
              >
                {(review.status ?? "in_review").replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-[#63777C] mt-0.5">
              Author: <strong className="text-[#172C32]">{review.author_name}</strong> • Source:{" "}
              <span className="font-mono">{review.source_filename || "direct_input.txt"}</span> • Revisions:{" "}
              {(review.revisions ?? []).length}
            </p>
          </div>
        </div>

        {/* Right Score Gauge & Decision Actions */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#63777C] uppercase block">Compliance Health</span>
            <span
              className={`text-2xl font-bold ${
                review.overall_score >= 80
                  ? "text-[#1E7E51]"
                  : review.overall_score >= 50
                  ? "text-[#B45309]"
                  : "text-[#B91C1C]"
              }`}
            >
              {review.overall_score}%
            </span>
          </div>

          {/* Decision Buttons (for Reviewer / Manager) */}
          {isReviewerOrManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDecisionModal("approved")}
                disabled={review.has_critical_violations}
                className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1 ${
                  review.has_critical_violations
                    ? "bg-[#DCE7E8] text-[#63777C] cursor-not-allowed"
                    : "bg-[#1E7E51] hover:bg-[#166534] text-white"
                }`}
                title={
                  review.has_critical_violations
                    ? "Cannot approve while critical violations or expired facts exist."
                    : "Sign-off and approve"
                }
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>

              <button
                onClick={() => setDecisionModal("changes_requested")}
                className="px-3 py-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] text-xs font-semibold rounded border border-[#F59E0B]/30 transition-colors"
              >
                Request Changes
              </button>

              <button
                onClick={() => setDecisionModal("rejected")}
                className="px-3 py-1.5 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#B91C1C] text-xs font-semibold rounded border border-[#EF4444]/30 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Unavailable Banner if external LLM failed or timed out */}
      {review.review_notes && (review.review_notes.toLowerCase().includes("ai review unavailable") || review.review_notes.toLowerCase().includes("ai call failed")) && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-lg p-3 text-xs text-[#B45309] flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>
              <strong>AI Unavailable:</strong> {review.review_notes}
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white text-[#B45309] border border-[#F59E0B]/30 font-semibold shrink-0">
            Deterministic Engine Active
          </span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Content, Diffs, Revisions, Comments (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Revision History & Content Card */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-[#DCE7E8] flex items-center justify-between bg-[#F7FAFA]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#328C91]" />
                <h3 className="text-xs font-bold text-[#172C32] uppercase tracking-wide">
                  Document Revisions
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {(review.revisions ?? []).map((rev, idx) => (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedRevisionIndex(idx)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      selectedRevisionIndex === idx
                        ? "bg-[#205E65] text-white font-bold"
                        : "bg-[#EAF2F3] text-[#205E65] hover:bg-[#DCE7E8]"
                    }`}
                  >
                    Rev {rev.revision_number}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {activeRevision && (
                <div className="text-[11px] text-[#63777C] flex items-center justify-between border-b border-[#DCE7E8] pb-2">
                  <span>
                    Revision {activeRevision.revision_number} • {activeRevision.change_type}
                  </span>
                  <span>{new Date(activeRevision.created_at).toLocaleTimeString()}</span>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-[#172C32] block mb-2">
                  Content Preview & Visual Diff
                </span>
                {renderVisualDiff()}
              </div>
            </div>
          </div>

          {/* Comments & Review Notes */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-[#DCE7E8] flex items-center gap-2 bg-[#F7FAFA]">
              <MessageSquare className="w-4 h-4 text-[#328C91]" />
              <h3 className="text-xs font-bold text-[#172C32] uppercase tracking-wide">
                Review Discussion & Notes ({review.comments.length})
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {review.comments.length === 0 ? (
                  <p className="text-xs text-[#63777C] italic text-center py-2">
                    No comments yet. Start a discussion with the author or reviewer.
                  </p>
                ) : (
                  (review.comments ?? []).map((comm) => (
                    <div
                      key={comm.id}
                      className={`p-3 rounded-md text-xs space-y-1.5 border ${
                        comm.comment_type === "ask_manager"
                          ? "bg-[#FEFCE8] border-[#FEF08A]"
                          : "bg-[#F7FAFA] border-[#DCE7E8]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#172C32]">
                            {comm.user_name}{" "}
                            <span className="text-[10px] font-mono text-[#328C91]">
                              ({comm.user_role})
                            </span>
                          </span>
                          {comm.comment_type === "ask_manager" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              Ask Manager Thread
                            </span>
                          )}
                          {comm.finding_id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                              Finding #{comm.finding_id}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#63777C]">
                          {new Date(comm.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[#172C32]">{comm.message}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-[#DCE7E8]">
                <input
                  type="text"
                  placeholder="Add note, citation request, or reviewer feedback..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-[#DCE7E8] rounded-md focus:outline-none focus:border-[#328C91]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Evidence Findings & Corrections Workflow (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#172C32] flex items-center gap-1.5">
              <span>Verified Governance Findings</span>
              <span className="w-5 h-5 rounded-full bg-[#328C91] text-white text-[11px] font-bold flex items-center justify-center">
                {(review.findings ?? []).length}
              </span>
            </h3>
            <span className="text-[11px] font-mono text-[#63777C]">No citation, no flag.</span>
          </div>

          {(review.findings ?? []).length === 0 ? (
            <div className="p-8 bg-white border border-[#DCE7E8] rounded-lg text-center shadow-subtle space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#1E7E51] mx-auto" />
              <h4 className="text-sm font-bold text-[#172C32]">Zero Violations Detected</h4>
              <p className="text-xs text-[#63777C]">
                All statements, claims, and terminology comply with active brand guidelines and current approved facts.
              </p>
            </div>
          ) : (
            (review.findings ?? []).map((finding) => {
              const isExpired = finding.verification_status === "expired_fact_detected";
              const isPending = finding.decision_status === "pending";

              return (
                <div
                  key={finding.id}
                  className={`bg-white rounded-lg border p-4 shadow-subtle space-y-3 transition-all ${
                    isExpired
                      ? "border-[#B91C1C] ring-1 ring-[#B91C1C]/20"
                      : finding.severity === "critical"
                      ? "border-[#FCA5A5]"
                      : "border-[#DCE7E8]"
                  }`}
                >
                  {/* Finding Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          finding.severity === "critical"
                            ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : finding.severity === "warning"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#EAF2F3] text-[#205E65]"
                        }`}
                      >
                        {finding.severity}
                      </span>

                      {/* Verification Status Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          isExpired
                            ? "bg-[#B91C1C] text-white"
                            : finding.verification_status === "verified_fact"
                            ? "bg-[#1E7E51] text-white"
                            : "bg-[#205E65] text-white"
                        }`}
                      >
                        {(finding.verification_status ?? "verified_clause").replace(/_/g, " ").toUpperCase()}
                      </span>

                      {/* AI-Assisted Badge */}
                      {(finding.is_ai_assisted || finding.engine_source === "ai") && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#9333EA]" />
                          AI-Assisted
                        </span>
                      )}

                      {/* Pre-Check Withheld Badge */}
                      {(finding.needs_human_look || !finding.suggested_correction) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                          Needs a human look
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-[#63777C]">
                      Confidence: {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>

                  {/* Title & Flagged Text */}
                  <div>
                    <h4 className="text-xs font-bold text-[#172C32]">{finding.title}</h4>
                    <div className="mt-1.5 p-2 bg-[#F7FAFA] border border-[#DCE7E8] rounded text-xs font-mono text-[#B91C1C] flex items-center gap-1.5">
                      <span className="font-semibold text-[#63777C] text-[10px]">FLAGGED:</span>
                      <span>"{finding.original_text}"</span>
                    </div>
                  </div>

                  {/* Citations & Evidence Anchor */}
                  <div className="bg-[#EAF2F3] border border-[#DCE7E8] p-2.5 rounded text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-[#205E65] font-semibold">
                      <Scale className="w-3.5 h-3.5 text-[#328C91]" />
                      <span>{finding.evidence_source || `Clause ${finding.clause_number}`}</span>
                    </div>
                    <p className="text-[#172C32] leading-relaxed whitespace-pre-line">{finding.explanation}</p>
                  </div>

                  {/* Suggested Correction */}
                  {finding.suggested_correction ? (
                    <div className="p-2.5 bg-[#F0FDF4] border border-[#86EFAC] rounded text-[11px] space-y-1">
                      <span className="font-bold text-[#166534] block">
                        Verified Safe Suggestion:
                      </span>
                      <p className="font-mono text-xs text-[#166534]">
                        "{finding.suggested_correction}"
                      </p>
                    </div>
                  ) : finding.needs_human_look ? (
                    <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded text-[11px] space-y-1">
                      <span className="font-bold text-[#92400E] block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Needs a human look
                      </span>
                      <p className="text-xs text-[#B45309]">
                        Automated rewrite withheld to prevent unverified claims or new violations. Please use <strong>Edit</strong> to enter an approved phrasing, or <strong>Reject</strong> with reason.
                      </p>
                    </div>
                  ) : null}

                  {/* Action Buttons: Accept / Edit / Reject / Ask Manager */}
                  {isPending ? (
                    <div className="flex items-center gap-2 pt-1 border-t border-[#DCE7E8] flex-wrap">
                      {finding.suggested_correction && !finding.needs_human_look ? (
                        <button
                          onClick={() => handleAction(finding.id, "accept")}
                          disabled={actionLoading === finding.id}
                          className="flex-1 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {actionLoading === finding.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{actionLoading === finding.id ? "Applying..." : "Accept & Recheck"}</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 py-1.5 bg-[#F3F4F6] text-[#9CA3AF] text-xs font-semibold rounded border border-[#E5E7EB] cursor-not-allowed"
                          title="Automated rewrite withheld. Please edit or reject."
                        >
                          Rewrite Withheld (Use Edit)
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditModalFinding(finding);
                          setCustomCorrection(finding.suggested_correction || finding.original_text || "");
                          setEditError(null);
                        }}
                        disabled={actionLoading === finding.id}
                        className="px-3 py-1.5 bg-[#F7FAFA] hover:bg-[#EAF2F3] text-[#172C32] text-xs font-semibold rounded border border-[#DCE7E8] transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#63777C]" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalFinding(finding);
                          setRejectReason("False positive");
                          setRejectNote("");
                        }}
                        disabled={actionLoading === finding.id}
                        className="px-3 py-1.5 hover:bg-[#FEE2E2] rounded text-[#B91C1C] text-xs font-semibold border border-[#FCA5A5]/40 transition-colors flex items-center gap-1"
                        title="Reject suggestion"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() =>
                          setActiveAskFindingId(activeAskFindingId === finding.id ? null : finding.id)
                        }
                        className="px-2.5 py-1.5 bg-[#F7FAFA] hover:bg-[#EAF2F3] text-[#205E65] text-xs font-semibold rounded border border-[#DCE7E8] transition-colors flex items-center gap-1 ml-auto"
                        title="Discuss or Ask Manager"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-[#328C91]" />
                        <span>Ask Manager</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-[#63777C] pt-1 border-t border-[#DCE7E8] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold uppercase text-[#328C91]">
                          Decision: {finding.decision_status}
                        </span>
                        {finding.edited_correction && (
                          <span>• Custom: "{finding.edited_correction}"</span>
                        )}
                        {finding.reject_reason && (
                          <span className="text-[#B91C1C]">
                            • Reason: {finding.reject_reason}
                            {finding.reject_note && ` ("${finding.reject_note}")`}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setActiveAskFindingId(activeAskFindingId === finding.id ? null : finding.id)
                        }
                        className="text-[11px] text-[#328C91] hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Thread
                      </button>
                    </div>
                  )}

                  {/* Inline Finding Comments & Ask Manager Thread */}
                  {(() => {
                    const findingComments = (review.comments ?? []).filter(
                      (c) => c.finding_id === finding.id
                    );
                    const isOpen = activeAskFindingId === finding.id;
                    if (!isOpen && findingComments.length === 0) return null;

                    return (
                      <div className="mt-2 pt-2 border-t border-[#DCE7E8] bg-[#F7FAFA] -mx-4 -mb-4 p-3 rounded-b-lg space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#172C32]">
                          <span className="flex items-center gap-1 text-[#205E65]">
                            <MessageSquare className="w-3.5 h-3.5 text-[#328C91]" />
                            Finding Thread ({findingComments.length})
                          </span>
                          {!isOpen && (
                            <button
                              onClick={() => setActiveAskFindingId(finding.id)}
                              className="text-[10px] text-[#328C91] hover:underline font-semibold"
                            >
                              + Add Note / Ask Manager
                            </button>
                          )}
                        </div>

                        {findingComments.map((fc) => (
                          <div
                            key={fc.id}
                            className={`p-2 rounded text-[11px] border ${
                              fc.comment_type === "ask_manager"
                                ? "bg-[#FEFCE8] border-[#FEF08A] text-[#92400E]"
                                : "bg-white border-[#DCE7E8] text-[#172C32]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold mb-0.5">
                              <span className="flex items-center gap-1">
                                {fc.user_name} ({fc.user_role})
                                {fc.comment_type === "ask_manager" && (
                                  <span className="px-1 py-0.2 bg-[#FDE68A] text-[#92400E] rounded text-[9px] font-bold">
                                    Manager Request
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-[#63777C]">
                                {new Date(fc.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p>{fc.message}</p>
                          </div>
                        ))}

                        {isOpen && (
                          <div className="pt-2 border-t border-[#DCE7E8]/60 space-y-2">
                            <textarea
                              rows={2}
                              value={findingCommentMsg}
                              onChange={(e) => setFindingCommentMsg(e.target.value)}
                              placeholder="Write a message to discuss this finding or ask a manager..."
                              className="w-full p-2 text-xs border border-[#DCE7E8] rounded bg-white focus:outline-none focus:border-[#328C91]"
                            />
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 text-[11px] text-[#172C32] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isAskManagerThread}
                                  onChange={(e) => setIsAskManagerThread(e.target.checked)}
                                  className="rounded text-[#328C91] focus:ring-0"
                                />
                                <span className="font-semibold text-[#92400E]">
                                  Flag as "Ask Manager" Thread
                                </span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveAskFindingId(null)}
                                  className="px-2 py-1 text-[11px] text-[#63777C]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={threadSubmitting || !findingCommentMsg.trim()}
                                  onClick={() => handlePostFindingComment(finding.id)}
                                  className="px-3 py-1 bg-[#328C91] hover:bg-[#205E65] text-white text-[11px] font-semibold rounded flex items-center gap-1 disabled:opacity-50 shadow-sm"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{threadSubmitting ? "Posting..." : "Post"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Suggestion Modal */}
      {editModalFinding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#172C32]">Edit Correction</h3>
            <p className="text-xs text-[#63777C]">
              Type a custom replacement for this finding. Your text will be automatically re-verified by the rule engine to confirm it complies with brand guidelines and approved facts.
            </p>
            {editError && (
              <div className="p-2.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded text-xs text-[#991B1B]">
                {editError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#63777C] uppercase">
                Original Flagged Text
              </label>
              <div className="p-2 bg-[#FEE2E2] text-xs font-mono text-[#991B1B] rounded">
                {editModalFinding.original_text}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#63777C] uppercase">
                Custom Replacement Text
              </label>
              <textarea
                rows={3}
                value={customCorrection}
                onChange={(e) => setCustomCorrection(e.target.value)}
                placeholder="Type your compliant replacement text..."
                className="w-full p-2.5 text-xs font-mono border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setEditModalFinding(null);
                  setEditError(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(editModalFinding.id, "edit", { editedText: customCorrection })
                }
                disabled={actionLoading === editModalFinding.id || !customCorrection.trim()}
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
              >
                {actionLoading === editModalFinding.id ? "Re-verifying..." : "Apply & Re-verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Finding Modal */}
      {rejectModalFinding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#172C32]">Reject Finding</h3>
            <p className="text-xs text-[#63777C]">
              Specify the rationale for rejecting this governance finding. The reason will be stored in the permanent audit trail.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#63777C] uppercase">
                Rejection Reason (Required)
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 text-xs border border-[#DCE7E8] rounded bg-white focus:outline-none focus:border-[#328C91]"
              >
                <option value="False positive">False positive</option>
                <option value="Approved exception">Approved exception</option>
                <option value="Contextually permitted">Contextually permitted</option>
                <option value="Will rephrase manually">Will rephrase manually</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#63777C] uppercase">
                Optional Notes / Context
              </label>
              <textarea
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Optional clarification for the audit log..."
                className="w-full p-2 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalFinding(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(rejectModalFinding.id, "reject", {
                    rejectReason,
                    rejectNote,
                  })
                }
                disabled={actionLoading === rejectModalFinding.id}
                className="px-4 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
              >
                {actionLoading === rejectModalFinding.id ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Decision Notes Modal */}
      {decisionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#172C32]">
              Record Decision:{" "}
              <span className="uppercase text-[#328C91]">{(decisionModal ?? "").replace(/_/g, " ")}</span>
            </h3>
            <p className="text-xs text-[#63777C]">
              Provide reviewer notes or publication clearance remarks for the persistent audit trail.
            </p>
            <textarea
              rows={3}
              placeholder="Add review notes, audit reference, or change instructions..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                disabled={decisionSubmitting}
                onClick={() => handleDecision(decisionModal)}
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {decisionSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{decisionSubmitting ? "Recording..." : "Confirm Decision"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

