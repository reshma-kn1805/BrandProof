import React, { useState } from "react";
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Eye,
  X,
  ShieldCheck,
} from "lucide-react";
import { api, RedactionPreviewResult } from "../lib/api";

interface NewReviewViewProps {
  onReviewCreated: (id: number) => void;
  onCancel: () => void;
}

export const NewReviewView: React.FC<NewReviewViewProps> = ({
  onReviewCreated,
  onCancel,
}) => {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [confidentialMode, setConfidentialMode] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redaction Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RedactionPreviewResult | null>(null);

  // Preset demo drafts
  const SAMPLE_VIOLATIONS_DRAFT =
    "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.";

  const SAMPLE_COMPLIANT_DRAFT =
    "Nila Millet Mix: a healthy breakfast made with 5 whole millets.";

  const SAMPLE_CONFIDENTIAL_DRAFT =
    "Nila Millet-Mix is India's #1 healthy breakfast! For bulk distribution quotes, email sales@nilafoods.com or call +91 9876543210. Approved budget: ₹50,000 via [[Project Phoenix]]. Buy now.";

  const handleLoadViolationsDraft = () => {
    setTitle("Q1 Millet-Mix Multi-Channel Campaign");
    setContent(SAMPLE_VIOLATIONS_DRAFT);
    setError(null);
  };

  const handleLoadCompliantDraft = () => {
    setTitle("Approved Social Post - Millets Nutritional Blend");
    setContent(SAMPLE_COMPLIANT_DRAFT);
    setError(null);
  };

  const handleLoadConfidentialDraft = () => {
    setTitle("Confidential Wholesale Distribution Proposal");
    setContent(SAMPLE_CONFIDENTIAL_DRAFT);
    setConfidentialMode(true);
    setError(null);
  };

  const handlePreviewRedaction = async () => {
    if (!content.trim()) return;
    try {
      setPreviewLoading(true);
      const res = await api.getRedactionPreview(content);
      setPreviewData(res);
      setShowPreviewModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate redaction preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a title for this review.");
      return;
    }

    try {
      setSubmitting(true);
      if (tab === "text") {
        if (!content.trim()) {
          setError("Content cannot be empty.");
          setSubmitting(false);
          return;
        }
        const review = await api.submitReview({
          title,
          content,
          file_name: "direct_input.txt",
          file_type: "text",
          confidential_mode: confidentialMode,
        });
        onReviewCreated(review.id);
      } else {
        if (!selectedFile) {
          setError("Please select a file to upload.");
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", selectedFile);
        formData.append("confidential_mode", String(confidentialMode));
        const review = await api.uploadReviewFile(formData);
        onReviewCreated(review.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process content review");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Submit Content for Verification</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Content undergoes multi-stage deterministic checks, claim retrieval, and evidence verification.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-[#63777C] hover:text-[#172C32]"
        >
          Cancel
        </button>
      </div>

      {/* Preset Demo Buttons Card */}
      <div className="bg-[#EAF2F3] border border-[#DCE7E8] rounded-lg p-4 flex flex-col items-start gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#328C91]" />
          <div>
            <span className="text-xs font-bold text-[#172C32]">Hackathon Demonstration Shortcuts</span>
            <p className="text-[11px] text-[#63777C]">
              Load pre-configured Nila Foods sample content to test the complete multi-stage pipeline.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadViolationsDraft}
            className="px-3 py-1.5 bg-white hover:bg-[#F7FAFA] text-[#B91C1C] border border-[#B91C1C]/30 text-xs font-semibold rounded shadow-subtle transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Load Sample with Violations</span>
          </button>
          <button
            type="button"
            onClick={handleLoadCompliantDraft}
            className="px-3 py-1.5 bg-white hover:bg-[#F7FAFA] text-[#1E7E51] border border-[#1E7E51]/30 text-xs font-semibold rounded shadow-subtle transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Load Clean Compliant Sample</span>
          </button>
          <button
            type="button"
            onClick={handleLoadConfidentialDraft}
            className="px-3 py-1.5 bg-white hover:bg-[#F7FAFA] text-[#205E65] border border-[#205E65]/30 text-xs font-semibold rounded shadow-subtle transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-[#328C91]" />
            <span>Load Confidential Sample (PII Redaction)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-md text-xs text-[#B91C1C] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#172C32] mb-1">
            Campaign or Document Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Q1 Breakfast Launch Social Copy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-[#DCE7E8] rounded-md focus:outline-none focus:border-[#328C91] text-[#172C32]"
          />
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#DCE7E8]">
          <button
            type="button"
            onClick={() => setTab("text")}
            className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 ${
              tab === "text"
                ? "border-[#328C91] text-[#328C91]"
                : "border-transparent text-[#63777C] hover:text-[#172C32]"
            }`}
          >
            Direct Text Input
          </button>
          <button
            type="button"
            onClick={() => setTab("file")}
            className={`pb-2.5 px-4 text-xs font-semibold transition-colors border-b-2 ${
              tab === "file"
                ? "border-[#328C91] text-[#328C91]"
                : "border-transparent text-[#63777C] hover:text-[#172C32]"
            }`}
          >
            Upload Document (.docx, .pdf, .txt)
          </button>
        </div>

        {tab === "text" ? (
          <div>
            <label className="block text-xs font-semibold text-[#172C32] mb-1">
              Marketing Copy / Publication Draft *
            </label>
            <textarea
              rows={8}
              required
              placeholder="Paste plain text, marketing claims, packaging copy, or newsletter draft..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 text-xs border border-[#DCE7E8] rounded-md focus:outline-none focus:border-[#328C91] font-mono leading-relaxed text-[#172C32]"
            />
            <p className="text-[11px] text-[#63777C] mt-1">
              BrandProof will extract text, parse terminology, evaluate against active clauses & facts, and verify citations.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[#172C32] mb-1">
              Select Marketing Document (.docx, .pdf)
            </label>
            <div className="border-2 border-dashed border-[#DCE7E8] rounded-lg p-8 text-center hover:border-[#328C91] transition-colors cursor-pointer bg-[#F7FAFA]">
              <input
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    if (!title && e.target.files[0].name) {
                      setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                <UploadCloud className="w-8 h-8 text-[#328C91]" />
                <span className="text-xs font-semibold text-[#172C32]">
                  {selectedFile ? selectedFile.name : "Click to select or drag and drop document"}
                </span>
                <span className="text-[11px] text-[#63777C]">Supports DOCX, PDF, and plain text up to 5MB</span>
              </label>
            </div>
          </div>
        )}

        {/* Phase 5: Confidential Mode & Redaction Preview Control */}
        <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#1E7E51] mt-0.5 shrink-0" />
              <div>
                <label htmlFor="confidential-mode-checkbox" className="text-xs font-bold text-[#0F172A] cursor-pointer">
                  Confidential Mode (Redact PII & sensitive data)
                </label>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  Masks email addresses, Indian/int'l phone numbers, currencies, digits, and [[confidential terms]] before sending to any external AI provider. Replaced tokens are restored locally before saving.
                </p>
              </div>
            </div>
            <input
              id="confidential-mode-checkbox"
              type="checkbox"
              checked={confidentialMode}
              onChange={(e) => setConfidentialMode(e.target.checked)}
              className="w-4 h-4 text-[#328C91] rounded border-[#CBD5E1] focus:ring-[#328C91]"
            />
          </div>

          {confidentialMode && content.trim() && (
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-[11px] text-[#64748B]">
                Want to inspect what external services see?
              </span>
              <button
                type="button"
                onClick={handlePreviewRedaction}
                disabled={previewLoading}
                className="px-3 py-1 bg-white hover:bg-[#F1F5F9] text-[#205E65] border border-[#CBD5E1] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewLoading ? "Generating..." : "What will be sent preview"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DCE7E8]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#63777C] hover:text-[#172C32]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Executing Review Pipeline...</span>
              </>
            ) : (
              <>
                <span>Run BrandProof Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* "What will be sent" Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#166534]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  "What Will Be Sent" AI Redaction Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#475569]">
              This is the exact sanitized payload that would be transmitted to external LLM services. All sensitive entities have been transformed into deterministic tokens. Raw text and token mappings remain strictly on this system.
            </p>

            {/* Counts Badges */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono font-semibold">
              <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] rounded border border-[#BFDBFE]">
                Total Redactions: {previewData.counts.total ?? 0}
              </span>
              <span className="px-2 py-0.5 bg-[#F0FDF4] text-[#15803D] rounded border border-[#BBF7D0]">
                Emails: {previewData.counts.email ?? 0}
              </span>
              <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#B45309] rounded border border-[#FDE68A]">
                Phones: {previewData.counts.phone ?? 0}
              </span>
              <span className="px-2 py-0.5 bg-[#FAF5FF] text-[#7E22CE] rounded border border-[#E9D5FF]">
                Currencies: {previewData.counts.currency ?? 0}
              </span>
              <span className="px-2 py-0.5 bg-[#FFF1F2] text-[#BE123C] rounded border border-[#FECDD3]">
                Confidential Terms: {previewData.counts.terms ?? 0}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-[#64748B]">
                Sanitized Payload
              </span>
              <div className="p-3 bg-[#0F172A] text-[#F8FAFC] font-mono text-xs rounded-md max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {previewData.redacted_text}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
