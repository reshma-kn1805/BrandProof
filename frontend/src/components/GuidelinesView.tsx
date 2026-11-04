import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  UploadCloud,
  Edit2,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { api, GuidelineClause, User } from "../lib/api";

interface GuidelinesViewProps {
  currentUser: User | null;
  onNavigateToCompare: () => void;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({
  currentUser,
  onNavigateToCompare,
}) => {
  const [clauses, setClauses] = useState<GuidelineClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editingClause, setEditingClause] = useState<GuidelineClause | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSeverity, setEditSeverity] = useState("warning");
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    loadClauses();
  }, [category, search]);

  const loadClauses = async () => {
    try {
      setLoading(true);
      const catParam = category === "all" ? undefined : category;
      const data = await api.getClauses(search || undefined, catParam);
      setClauses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClause) return;
    try {
      await api.updateClause(editingClause.id, {
        title: editTitle,
        description: editDesc,
        severity: editSeverity,
      });
      setEditingClause(null);
      loadClauses();
    } catch (err: any) {
      alert(err.message || "Failed to update clause");
    }
  };

  const handleUploadGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("file", uploadFile);
      await api.uploadGuidelineFile(formData);
      setUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      loadClauses();
    } catch (err: any) {
      alert(err.message || "Failed to upload guideline document");
    } finally {
      setUploadLoading(false);
    }
  };

  const isEditor = currentUser && ["Admin", "Manager"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Brand Guidelines & Rule Repository</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Active clauses, tone requirements, claims rules, and naming standards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToCompare}
            className="px-3 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#205E65] text-xs font-semibold rounded transition-colors"
          >
            Compare Versions
          </button>
          {isEditor && (
            <button
              onClick={() => setUploadModal(true)}
              className="px-3.5 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Guideline (.docx/.pdf)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-80 px-3 py-1.5 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs">
          <Search className="w-3.5 h-3.5 text-[#63777C]" />
          <input
            type="text"
            placeholder="Search clause number, keyword, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[#172C32] focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {["all", "Brand Voice", "Claims & Advertising", "Health & Nutrition", "Terminology", "Accessibility"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                  category === cat
                    ? "bg-[#205E65] text-white font-semibold"
                    : "bg-[#F7FAFA] text-[#63777C] hover:bg-[#EAF2F3] hover:text-[#172C32]"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Clauses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#63777C]">
            Loading active guideline clauses...
          </div>
        ) : clauses.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-[#63777C]">
            No guideline clauses match your search.
          </div>
        ) : (
          clauses.map((clause) => (
            <div
              key={clause.id}
              className="bg-white rounded-lg border border-[#DCE7E8] p-5 shadow-subtle flex flex-col justify-between hover:border-[#328C91] transition-all space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded bg-[#205E65] text-white text-xs font-mono font-bold flex items-center justify-center">
                    {clause.clause_number}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        clause.severity === "critical"
                          ? "bg-[#FEE2E2] text-[#B91C1C]"
                          : clause.severity === "warning"
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#EAF2F3] text-[#205E65]"
                      }`}
                    >
                      {clause.severity}
                    </span>
                    {isEditor && (
                      <button
                        onClick={() => {
                          setEditingClause(clause);
                          setEditTitle(clause.title);
                          setEditDesc(clause.description);
                          setEditSeverity(clause.severity);
                        }}
                        className="p-1 hover:bg-[#EAF2F3] rounded text-[#63777C] hover:text-[#172C32]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#172C32]">{clause.title}</h3>
                  <span className="text-[10px] font-mono text-[#328C91] uppercase">
                    {clause.category}
                  </span>
                </div>

                <p className="text-xs text-[#63777C] leading-relaxed line-clamp-4">
                  {clause.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#DCE7E8] flex items-center justify-between text-[11px] text-[#63777C]">
                <span>Status: <strong className="text-[#1E7E51] font-mono uppercase">{clause.status}</strong></span>
                <span>Active in Verifier</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Clause Modal */}
      {editingClause && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveClause}
            className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#172C32]">
              Edit Clause {editingClause.clause_number}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Description</label>
              <textarea
                rows={4}
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Severity</label>
              <select
                value={editSeverity}
                onChange={(e) => setEditSeverity(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="notice">Notice</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingClause(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm"
              >
                Save Updates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadGuideline}
            className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#172C32]">Import Guideline Document</h3>
            <p className="text-xs text-[#63777C]">
              Upload DOCX or PDF guideline documents. BrandProof will automatically parse and index clauses.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g. Nila Brand Standards 2026"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Select File</label>
              <input
                type="file"
                accept=".docx,.pdf,.txt,.md"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-[#63777C]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadLoading}
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5"
              >
                {uploadLoading ? "Processing..." : "Extract & Import"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

