import React, { useEffect, useState } from "react";
import { SpellCheck, Plus, Trash2, Search, Check, AlertCircle } from "lucide-react";
import { api, Terminology, User } from "../lib/api";

interface TerminologyViewProps {
  currentUser: User | null;
}

export const TerminologyView: React.FC<TerminologyViewProps> = ({ currentUser }) => {
  const [terms, setTerms] = useState<Terminology[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [preferred, setPreferred] = useState("");
  const [prohibited, setProhibited] = useState("");
  const [variations, setVariations] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadTerminology();
  }, []);

  const loadTerminology = async () => {
    try {
      setLoading(true);
      const data = await api.getTerminology();
      setTerms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTerminology({
        preferred_term: preferred,
        prohibited_term: prohibited,
        incorrect_variations: variations
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        approved_alternatives: alternatives
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        case_sensitive: false,
        notes,
      });
      setShowAddModal(false);
      setPreferred("");
      setProhibited("");
      setVariations("");
      setAlternatives("");
      setNotes("");
      loadTerminology();
    } catch (err: any) {
      alert(err.message || "Failed to create terminology rule");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this terminology rule?")) return;
    try {
      await api.deleteTerminology(id);
      loadTerminology();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const isEditor = currentUser && ["Admin", "Manager", "Reviewer"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Brand Terminology & Naming Rules</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Registered trademarks, prohibited product names, and casing standards evaluated by the rule engine.
          </p>
        </div>
        {isEditor && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Terminology Rule</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#63777C]">
            Loading terminology standards...
          </div>
        ) : (
          terms.map((term) => (
            <div
              key={term.id}
              className="bg-white rounded-lg border border-[#DCE7E8] p-5 shadow-subtle flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold bg-[#E8F5E9] text-[#1E7E51] px-2 py-0.5 rounded">
                      PREFERRED
                    </span>
                    <span className="text-sm font-bold text-[#172C32]">{term.preferred_term}</span>
                  </div>
                  {isEditor && (
                    <button
                      onClick={() => handleDelete(term.id)}
                      className="p-1 hover:bg-[#FEE2E2] rounded text-[#63777C] hover:text-[#B91C1C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-[#FEE2E2]/50 border border-[#FCA5A5]/60 rounded-md">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#991B1B] block mb-1">
                    Prohibited Variations (Triggers Clause 4.1):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-mono font-semibold text-[#991B1B] bg-white px-2 py-0.5 rounded border border-[#FCA5A5]">
                      {term.prohibited_term}
                    </span>
                    {term.incorrect_variations.map((v, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono text-[#991B1B] bg-white px-2 py-0.5 rounded border border-[#FCA5A5]"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {term.approved_alternatives.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#63777C] block mb-1">
                      Approved Safe Alternatives:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {term.approved_alternatives.map((alt, i) => (
                        <span
                          key={i}
                          className="text-xs font-mono text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {term.notes && (
                  <p className="text-xs text-[#63777C] pt-2 border-t border-[#DCE7E8]">
                    {term.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddTerm}
            className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#172C32]">Add Terminology Rule</h3>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Preferred Approved Term *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nila Millet Mix"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Primary Prohibited Term *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Millet-Mix"
                value={prohibited}
                onChange={(e) => setProhibited(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Incorrect Variations (comma separated)
              </label>
              <input
                type="text"
                placeholder="Millet-Mix, millet mix, Nila-Millet-Mix"
                value={variations}
                onChange={(e) => setVariations(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Notes</label>
              <textarea
                rows={2}
                placeholder="Brand compliance guidance notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#63777C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm"
              >
                Save Terminology
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

