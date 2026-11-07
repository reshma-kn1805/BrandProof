import React, { useEffect, useState } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { api, ContentReview } from "../lib/api";

interface ReviewsViewProps {
  onSelectReview: (id: number) => void;
  onNavigateToNewReview: () => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  onSelectReview,
  onNavigateToNewReview,
}) => {
  const [reviews, setReviews] = useState<ContentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReviews();
  }, [filter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getReviews(filter);
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Content Verification Reviews</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Audit history, verification findings, and approval lifecycle
          </p>
        </div>
        <button
          onClick={onNavigateToNewReview}
          className="px-4 py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Content Review</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-80 px-3 py-1.5 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs">
          <Search className="w-3.5 h-3.5 text-[#63777C]" />
          <input
            type="text"
            placeholder="Search campaigns or authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[#172C32] focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "in_review", label: "In Review" },
            { id: "changes_requested", label: "Changes Requested" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                filter === tab.id
                  ? "bg-[#205E65] text-white font-semibold"
                  : "bg-[#F7FAFA] text-[#63777C] hover:bg-[#EAF2F3] hover:text-[#172C32]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#63777C] flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading reviews...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#63777C]">
            No reviews match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAFA] border-b border-[#DCE7E8] text-[#63777C] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Campaign / Document</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7E8]">
                {(filteredReviews ?? []).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReview(r.id)}
                    className="hover:bg-[#F7FAFA] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#172C32]">{r.title}</span>
                        <span className="text-[11px] text-[#63777C] font-mono mt-0.5">
                          {r.source_filename || "direct_input.txt"} • {(r.source_file_type ?? "text").toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs ${
                            r.overall_score >= 80
                              ? "bg-[#E8F5E9] text-[#1E7E51]"
                              : r.overall_score >= 50
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#FEE2E2] text-[#B91C1C]"
                          }`}
                        >
                          {r.overall_score}%
                        </span>
                        {r.has_critical_violations && (
                          <span title="Critical violations present">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#B91C1C]" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                          r.status === "approved"
                            ? "bg-[#E8F5E9] text-[#1E7E51]"
                            : r.status === "rejected"
                            ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : r.status === "changes_requested"
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#EAF2F3] text-[#205E65]"
                        }`}
                      >
                        {(r.status ?? "in_review").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#172C32] font-medium">{r.author_name}</td>
                    <td className="px-4 py-3.5 text-[#63777C]">{r.reviewer_name || "Unassigned"}</td>
                    <td className="px-4 py-3.5 text-[#63777C]">
                      {new Date(r.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReview(r.id);
                        }}
                        className="p-1 hover:bg-[#EAF2F3] rounded text-[#328C91] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

