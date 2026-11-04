import React, { useEffect, useState } from "react";
import {
  Scale,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
} from "lucide-react";
import { api, ApprovedFact, User } from "../lib/api";

interface FactsLedgerViewProps {
  currentUser: User | null;
}

export const FactsLedgerView: React.FC<FactsLedgerViewProps> = ({ currentUser }) => {
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newStatement, setNewStatement] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newOwner, setNewOwner] = useState("Compliance Team");
  const [newExpiry, setNewExpiry] = useState("");

  useEffect(() => {
    loadFacts();
  }, [filter]);

  const loadFacts = async () => {
    try {
      setLoading(true);
      const data = await api.getFacts(filter);
      setFacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFact({
        fact_code: newCode,
        statement: newStatement,
        source_evidence: newSource,
        responsible_owner: newOwner,
        effective_date: new Date().toISOString(),
        expiry_date: newExpiry ? new Date(newExpiry).toISOString() : null,
      });
      setShowAddModal(false);
      setNewCode("");
      setNewStatement("");
      setNewSource("");
      loadFacts();
    } catch (err: any) {
      alert(err.message || "Failed to create fact");
    }
  };

  const filteredFacts = facts.filter(
    (f) =>
      f.fact_code.toLowerCase().includes(search.toLowerCase()) ||
      f.statement.toLowerCase().includes(search.toLowerCase()) ||
      f.source_evidence.toLowerCase().includes(search.toLowerCase())
  );

  const isEditor = currentUser && ["Admin", "Manager", "Reviewer"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Approved Facts Ledger</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Verified nutritional statements, clinical evidence, and market share proofs. Expired facts are strictly invalidated.
          </p>
        </div>
        {isEditor && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Approved Fact</span>
          </button>
        )}
      </div>

      {/* Critical Fact Expiry Alert Banner */}
      <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-[#991B1B]">
            Automated Fact Expiry Enforcement Active
          </span>
          <p className="text-[#7F1D1D] leading-relaxed">
            Fact <strong>F-07 ("Top 3 in breakfast cereal category")</strong> expired on 31 December 2025. The independent verifier will automatically flag and reject any marketing submissions relying on expired facts as unverified evidence.
          </p>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="bg-white p-3 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-80 px-3 py-1.5 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs">
          <Search className="w-3.5 h-3.5 text-[#63777C]" />
          <input
            type="text"
            placeholder="Search fact code, statement, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[#172C32] focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {["all", "approved", "expired", "pending"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 capitalize ${
                filter === t
                  ? "bg-[#205E65] text-white font-semibold"
                  : "bg-[#F7FAFA] text-[#63777C] hover:bg-[#EAF2F3] hover:text-[#172C32]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Facts */}
      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#63777C]">Loading facts ledger...</div>
        ) : filteredFacts.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#63777C]">No approved facts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAFA] border-b border-[#DCE7E8] text-[#63777C] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Fact Code</th>
                  <th className="px-4 py-3">Approved Statement</th>
                  <th className="px-4 py-3">Source / Audit Evidence</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7E8]">
                {filteredFacts.map((fact) => (
                  <tr key={fact.id} className="hover:bg-[#F7FAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#EAF2F3] text-[#205E65] border border-[#DCE7E8]">
                        {fact.fact_code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col max-w-md">
                        <span className="font-semibold text-[#172C32]">{fact.statement}</span>
                        {fact.description && (
                          <span className="text-[11px] text-[#63777C] mt-0.5">{fact.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#205E65] font-mono text-[11px] max-w-xs">
                      {fact.source_evidence}
                    </td>
                    <td className="px-4 py-3.5 text-[#63777C]">{fact.responsible_owner}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          fact.is_expired || fact.approval_status === "expired"
                            ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : fact.approval_status === "approved"
                            ? "bg-[#E8F5E9] text-[#1E7E51]"
                            : "bg-[#FEF3C7] text-[#B45309]"
                        }`}
                      >
                        {fact.is_expired ? "EXPIRED" : fact.approval_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {fact.expiry_date ? (
                        <div className="flex flex-col text-[11px]">
                          <span
                            className={
                              fact.is_expired ? "text-[#B91C1C] font-semibold" : "text-[#172C32]"
                            }
                          >
                            {new Date(fact.expiry_date).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-[#63777C]">
                            {fact.is_expired
                              ? "Invalidated"
                              : `${fact.days_until_expiry} days remaining`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#63777C] italic">Perpetual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Fact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFact}
            className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#172C32]">Add Approved Fact</h3>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Fact Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. F-18"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Approved Statement *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Verified factual statement..."
                value={newStatement}
                onChange={(e) => setNewStatement(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Audit / Lab Evidence Source *
              </label>
              <input
                type="text"
                required
                placeholder="Certificate or report ID..."
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
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
                Save Fact
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

