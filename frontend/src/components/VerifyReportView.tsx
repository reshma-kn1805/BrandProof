import React, { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, AlertTriangle, FileText, Lock, ExternalLink } from "lucide-react";
import { api, ReportVerifyResult } from "../lib/api";

interface VerifyReportViewProps {
  onOpenReview?: (reviewId: number) => void;
}

export const VerifyReportView: React.FC<VerifyReportViewProps> = ({ onOpenReview }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.verifyReport(query.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to verify report record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#1E7E51]" />
          <h2 className="text-xl font-bold text-[#172C32]">Verify Audit Report Authenticity</h2>
        </div>
        <p className="text-xs text-[#63777C] mt-1">
          Cryptographically verify any exported BrandProof PDF report. Every report carries a SHA-256 fingerprint linked to our immutable, tamper-evident audit ledger.
        </p>
      </div>

      <form onSubmit={handleVerify} className="bg-white p-6 rounded-lg border border-[#DCE7E8] shadow-subtle space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#172C32] mb-1">
            Report SHA-256 Fingerprint or Review ID
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="e.g. 101 or 4a2d7b89f3... (64 hex characters)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono border border-[#DCE7E8] rounded-md focus:outline-none focus:border-[#328C91] text-[#172C32]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-[#328C91] hover:bg-[#205E65] disabled:bg-[#DCE7E8] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-2 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? "Verifying..." : "Verify Report"}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#63777C] mt-1.5">
            Tip: You can enter either the review ID number (e.g. <code>1</code>) or the exact 64-character SHA-256 fingerprint from the top of the exported PDF.
          </p>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-md text-xs text-[#B91C1C] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div
          className={`p-6 rounded-lg border shadow-subtle space-y-4 ${
            result.matched
              ? "bg-[#F0FDF4] border-[#86EFAC]"
              : "bg-[#FEF2F2] border-[#FCA5A5]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {result.matched ? (
                <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#166534]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#B91C1C]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3
                  className={`text-sm font-bold ${
                    result.matched ? "text-[#166534]" : "text-[#991B1B]"
                  }`}
                >
                  {result.matched
                    ? "Cryptographic Authenticity Verified"
                    : "No Matching Authenticated Report"}
                </h3>
                <p className="text-xs text-[#475569]">{result.message}</p>
              </div>
            </div>
            {result.matched && (
              <span className="px-2.5 py-1 bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-mono font-bold rounded uppercase">
                Tamper-Evident Match
              </span>
            )}
          </div>

          {result.matched && (
            <div className="bg-white p-4 rounded border border-[#CBD5E1] space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] text-[#63777C] uppercase font-mono block">Review Title</span>
                  <span className="font-bold text-[#172C32]">{result.title}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#63777C] uppercase font-mono block">Status / Score</span>
                  <span className="font-semibold text-[#166534]">
                    {(result.status ?? "in_review").toUpperCase()} &bull; {result.score}%
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#63777C] uppercase font-mono block">
                  SHA-256 Fingerprint
                </span>
                <span className="font-mono text-[11px] text-[#1E293B] bg-[#F8FAFC] p-1.5 rounded block border border-[#E2E8F0] break-all">
                  {result.fingerprint || result.stored_fingerprint || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </span>
              </div>

              {result.review_id && onOpenReview && (
                <div className="pt-1">
                  <button
                    onClick={() => onOpenReview(result.review_id!)}
                    className="text-xs font-semibold text-[#328C91] hover:text-[#205E65] flex items-center gap-1"
                  >
                    <span>Open full review details in BrandProof</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

