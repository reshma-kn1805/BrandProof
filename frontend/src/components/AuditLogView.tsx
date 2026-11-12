import React, { useEffect, useState } from "react";
import { History, Search, Filter, ShieldCheck, AlertTriangle, Clock, User } from "lucide-react";
import { api, AuditLog, AuditVerifyResult } from "../lib/api";

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [chainStatus, setChainStatus] = useState<AuditVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogsAndVerify();
  }, [filter]);

  const loadLogsAndVerify = async () => {
    try {
      setLoading(true);
      const [logsData, verifyData] = await Promise.all([
        api.getAuditLogs(filter === "all" ? undefined : filter),
        api.verifyAuditChain().catch(() => null),
      ]);
      setLogs(logsData);
      setChainStatus(verifyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(search.toLowerCase())) ||
      l.target_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Tamper-Evident Governance Audit Trail</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Cryptographic SHA-256 hash-chained record of guideline changes, fact updates, suggestions, and sign-offs.
          </p>
        </div>

        {/* Real Dynamic Hash-Chain Integrity Badge */}
        {chainStatus?.valid ? (
          <div
            className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] border border-[#86EFAC] rounded text-xs font-semibold text-[#166534]"
            title={`Cryptographic SHA-256 Chain Head: ${chainStatus.head || "GENESIS"}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#166534]" />
            <span>Audit Integrity: Verified ({chainStatus.entries} entries chained)</span>
          </div>
        ) : chainStatus?.valid === false ? (
          <div
            className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] border border-[#FCA5A5] rounded text-xs font-semibold text-[#B91C1C]"
            title={`Chain broken at entry ID #${chainStatus.first_broken_entry}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C]" />
            <span>Audit Integrity: BROKEN (entry #{chainStatus.first_broken_entry})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EAF2F3] border border-[#DCE7E8] rounded text-xs font-semibold text-[#205E65]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#328C91]" />
            <span>Audit Integrity: Verifying...</span>
          </div>
        )}
      </div>

      <div className="bg-white p-3 rounded-lg border border-[#DCE7E8] shadow-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-80 px-3 py-1.5 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs">
          <Search className="w-3.5 h-3.5 text-[#63777C]" />
          <input
            type="text"
            placeholder="Search action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[#172C32] focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {["all", "SUBMIT", "FINDING", "REVIEW", "FACT", "GUIDELINE"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                filter === f
                  ? "bg-[#205E65] text-white font-semibold"
                  : "bg-[#F7FAFA] text-[#63777C] hover:bg-[#EAF2F3] hover:text-[#172C32]"
              }`}
            >
              {f === "all" ? "All Logs" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#63777C] flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#328C91] border-t-transparent rounded-full animate-spin"></div>
            <span>Verifying audit ledger & loading events...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF2F3] flex items-center justify-center text-[#205E65]">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#172C32]">Audit Log Empty</h3>
            <p className="text-xs text-[#63777C] max-w-sm">
              No audit events found matching the active filter. Governance actions, rule checks, and sign-offs will appear here automatically.
            </p>
            <button
              onClick={loadLogsAndVerify}
              className="mt-1 px-3.5 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#205E65] text-xs font-semibold rounded-md border border-[#DCE7E8] transition-colors"
            >
              Refresh Logs
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAFA] border-b border-[#DCE7E8] text-[#63777C] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">SHA-256 Entry Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7E8]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7FAFA] transition-colors">
                    <td className="px-5 py-3 text-[#63777C] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#172C32]">
                      {log.user_name || "System"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF2F3] text-[#205E65] uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#63777C] text-[11px]">
                      {log.target_type} #{log.target_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#172C32] max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-[#63777C] whitespace-nowrap">
                      {log.entry_hash ? (
                        <span
                          className="bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0] font-mono text-[#334155]"
                          title={`SHA-256 Entry Hash: ${log.entry_hash}\nPrev Hash: ${log.prev_hash || "GENESIS"}`}
                        >
                          {log.entry_hash.slice(0, 10)}...{log.entry_hash.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] italic">Unchained</span>
                      )}
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
