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

  // Phase 7: Visual Asset / Image Attachment State
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [imageAltText, setImageAltText] = useState("");

  const createSampleImage = (type: "non_compliant" | "compliant") => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (type === "non_compliant") {
      // Off-palette Magenta background #FF00FF
      ctx.fillStyle = "#FF00FF";
      ctx.fillRect(0, 0, 240, 160);
      // Low-contrast dark purple text #990099 (contrast ratio 1.8:1, fails 4.5:1)
      ctx.fillStyle = "#990099";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Nila Millet Mix", 35, 85);
      setImageData(canvas.toDataURL("image/png"));
      setImageFilename("packaging_mockup_v1.png");
      setImageAltText(""); // Intentionally empty to trigger Clause 5.2
    } else {
      // Approved Nila Green background #2E7D4F
      ctx.fillStyle = "#2E7D4F";
      ctx.fillRect(0, 0, 240, 160);
      // Approved Cream text #FFF8EC (contrast ratio 8.5:1, passes 4.5:1)
      ctx.fillStyle = "#FFF8EC";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Nila Millet Mix", 35, 85);
      setImageData(canvas.toDataURL("image/png"));
      setImageFilename("nila_millet_mix_pack.png");
      setImageAltText("Nila Foods traditional millet cereal packaging illustration");
    }
  };

  const handleImageFileSelect = (file: File) => {
    setImageFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageData(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageData(null);
    setImageFilename(null);
    setImageAltText("");
  };

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
          file_name: imageFilename || "direct_input.txt",
          file_type: imageData ? "image" : "text",
          confidential_mode: confidentialMode,
          image_filename: imageFilename || undefined,
          image_data: imageData || undefined,
          image_alt_text: imageAltText,
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
        if (imageAltText) {
          formData.append("alt_text", imageAltText);
        }
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

        {/* Phase 7 (Improvement 2): Image & Visual-Asset Accessibility Checks */}
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <span>Visual Asset & Accessibility Checks</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#E0F2FE] text-[#0369A1] rounded">
                  Pillow &bull; WCAG 2.2
                </span>
              </span>
              <p className="text-[11px] text-[#475569] mt-0.5">
                Attach marketing artwork, packaging mockup, or banner (PNG, JPG, WebP &le; 5 MB). Evaluates alt text, WCAG 2.2 contrast ratio, and approved palette conformance.
              </p>
            </div>
            {imageData && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove Asset</span>
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                createSampleImage("non_compliant");
                if (!title) setTitle("Packaging Mockup - Summer Millet Blend");
                if (!content) setContent("Nila Millet Mix packaging banner artwork.");
              }}
              className="text-[11px] px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-medium flex items-center gap-1 transition-colors"
            >
              <span>Attach Non-Compliant Mockup (No Alt, Low Contrast, Magenta)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                createSampleImage("compliant");
                if (!title) setTitle("Compliant Brand Asset - Nila Green Pouch");
                if (!content) setContent("Nila Millet Mix certified packaging banner.");
              }}
              className="text-[11px] px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-medium flex items-center gap-1 transition-colors"
            >
              <span>Attach Compliant Asset (Alt Text, 8.5:1 Contrast, Approved Palette)</span>
            </button>
          </div>

          {imageData ? (
            <div className="flex items-start gap-4 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md">
              <img
                src={imageData}
                alt={imageAltText || "Attached visual asset preview"}
                className="w-28 h-20 object-cover rounded border border-[#CBD5E1] shadow-sm bg-white"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {imageFilename || "attached_image.png"}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Ready for analysis</span>
                </div>
                <div>
                  <label htmlFor="image-alt-text-input" className="block text-[11px] font-semibold text-[#0F172A] mb-1">
                    Image Alternative Text (Required for Clause 5.2 Accessibility) *
                  </label>
                  <input
                    id="image-alt-text-input"
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="e.g. Nila Foods traditional millet cereal packaging illustration"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded focus:outline-none focus:border-[#328C91] text-[#0F172A]"
                  />
                  {!imageAltText.trim() && (
                    <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Missing alt text will trigger Clause 5.2 finding.</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                id="image-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFileSelect(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="image-file-input"
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#328C91]" />
                <span>Upload PNG, JPG, WebP image</span>
              </label>
              <span className="text-[11px] text-[#64748B]">Max 5 MB. Or click a quick preset above.</span>
            </div>
          )}
        </div>

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
