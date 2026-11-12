import React, { useEffect, useState } from "react";
import { CheckSquare, Check, X, AlertTriangle, ArrowRight, ShieldCheck, User } from "lucide-react";
import { api, ContentReview, User as UserType } from "../lib/api";

interface ApprovalQueueViewProps {
  currentUser: UserType | null;
  onSelectReview: (id: number) => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  currentUser,
  onSelectReview,
}) => {
  const [reviews, setReviews] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      setLoading(true);
      const all = await api.getReviews();
      const pending = all.filter((r) =>
        ["in_review", "changes_requested", "resubmitted"].includes(r.status)
      );
      setReviews(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isReviewerOrManager =
    currentUser && ["Reviewer", "Manager", "Admin"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Human Review & Approval Queue</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Strict human oversight. AI proposes verified citations; human reviewers hold final sign-off authority.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] text-[#1E7E51] border border-[#86EFAC] rounded text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Human Sign-off Required</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#63777C] flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading approval queue...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1E7E51]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#172C32]">Approval Queue Clear</h3>
            <p className="text-xs text-[#63777C] max-w-sm">
              All submitted campaigns and copy drafts have been audited. No reviews are awaiting human sign-off at this time.
            </p>
            <button
              onClick={loadPending}
              className="mt-1 px-3.5 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#205E65] text-xs font-semibold rounded-md border border-[#DCE7E8] transition-colors"
            >
              Refresh Queue
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DCE7E8]">
            {(reviews ?? []).map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectReview(r.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F7FAFA] cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#172C32]">{r.title}</span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        r.status === "changes_requested"
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#EAF2F3] text-[#205E65]"
                      }`}
                    >
                      {(r.status ?? "in_review").replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[#63777C]">
                    Submitted by <strong>{r.author_name}</strong> • Source:{" "}
                    <span className="font-mono">{r.source_filename}</span> • {(r.revisions ?? []).length} revision(s)
                  </p>
                  {r.review_notes && (
                    <p className="text-xs text-[#B45309] bg-[#FEF3C7]/40 p-1.5 rounded border border-[#F59E0B]/20 max-w-xl">
                      Reviewer Note: {r.review_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#63777C] uppercase block">
                      Compliance Score
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        r.overall_score >= 80
                          ? "text-[#1E7E51]"
                          : r.overall_score >= 50
                          ? "text-[#B45309]"
                          : "text-[#B91C1C]"
                      }`}
                    >
                      {r.overall_score}%
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectReview(r.id);
                    }}
                    className="px-4 py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Audit & Sign-off</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

