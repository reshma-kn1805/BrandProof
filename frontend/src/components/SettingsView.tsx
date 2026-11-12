import React, { useEffect, useState } from "react";
import { Settings, ShieldCheck, Lock, Database, Cpu, Info, Check, Save } from "lucide-react";
import { api, AICallLogEntry } from "../lib/api";

export const SettingsView: React.FC = () => {
  const [ws, setWs] = useState<any | null>(null);
  const [ai, setAi] = useState<any | null>(null);
  const [aiCalls, setAiCalls] = useState<AICallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWs, setSavingWs] = useState(false);
  const [confidentialDefault, setConfidentialDefault] = useState(false);
  const [confidentialTermsInput, setConfidentialTermsInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [wsData, aiData, callsData] = await Promise.all([
        api.getWorkspaceSettings(),
        api.getAIPrivacySettings(),
        api.getAICalls().catch(() => []),
      ]);
      setWs(wsData);
      setAi(aiData);
      setAiCalls(callsData);
      setConfidentialDefault(Boolean(wsData?.confidential_mode_default));
      setConfidentialTermsInput((wsData?.confidential_terms || []).join(", "));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkspaceSettings = async () => {
    try {
      setSavingWs(true);
      setSaveSuccess(false);
      const termsArray = confidentialTermsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api.updateWorkspaceSettings({
        confidential_mode_default: confidentialDefault,
        confidential_terms: termsArray,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWs(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[#172C32]">Workspace & AI Governance Settings</h2>
        <p className="text-xs text-[#63777C] mt-0.5">
          Tenant isolation, confidential redaction policies, and AI transparency disclosure.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#63777C]">Loading settings...</div>
      ) : (
        <div className="space-y-6">
          {/* Tenant Isolation Card */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#328C91]" />
              <h3 className="text-sm font-bold text-[#172C32]">Tenant Isolation & Workspace Architecture</h3>
            </div>
            <p className="text-xs text-[#63777C] leading-relaxed">
              BrandProof enforces strict organization-level data boundaries. Guidelines, facts, terminology, assets, reviews, and audit logs are isolated by foreign key scoping and query filters.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-[#F7FAFA] border border-[#DCE7E8] rounded space-y-1">
                <span className="text-[10px] text-[#63777C] uppercase font-mono font-bold block">
                  Active Organization
                </span>
                <span className="font-bold text-[#172C32]">{ws?.name}</span>
              </div>
              <div className="p-3 bg-[#F7FAFA] border border-[#DCE7E8] rounded space-y-1">
                <span className="text-[10px] text-[#63777C] uppercase font-mono font-bold block">
                  Isolation Mode
                </span>
                <span className="font-mono text-[#1E7E51] font-semibold">{ws?.tenant_isolation_mode}</span>
              </div>
            </div>
          </div>

          {/* Phase 5: Workspace Confidential Privacy Policies */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#166534]" />
              <h3 className="text-sm font-bold text-[#172C32]">Workspace Confidential Mode Policies</h3>
            </div>
            <p className="text-xs text-[#63777C] leading-relaxed">
              Configure default redaction behaviors applied across marketing drafts before external AI evaluation.
            </p>

            <div className="space-y-4 pt-1 text-xs">
              <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
                <div>
                  <span className="font-semibold text-[#0F172A] block">
                    Default Confidential Mode for New Drafts
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    When enabled, all content reviews default to active redaction mode on submission.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={confidentialDefault}
                  onChange={(e) => setConfidentialDefault(e.target.checked)}
                  className="w-4 h-4 text-[#328C91] rounded border-[#CBD5E1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  Organization Confidential Terms (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Project Phoenix, Secret Blend, Q4 Formula"
                  value={confidentialTermsInput}
                  onChange={(e) => setConfidentialTermsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded focus:outline-none focus:border-[#328C91] text-[#0F172A]"
                />
                <p className="text-[11px] text-[#64748B]">
                  These proprietary terms will be automatically replaced with [REDACTED_TERM_N] in addition to email, phone, and currency tokens.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                {saveSuccess ? (
                  <span className="text-xs font-semibold text-[#166534] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Workspace privacy policy saved successfully</span>
                  </span>
                ) : (
                  <span></span>
                )}
                <button
                  onClick={handleSaveWorkspaceSettings}
                  disabled={savingWs}
                  className="px-4 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingWs ? "Saving..." : "Save Privacy Policy"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Processing & Model Configuration */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#328C91]" />
              <h3 className="text-sm font-bold text-[#172C32]">AI Processing & Model Configuration</h3>
            </div>
            <p className="text-xs text-[#63777C] leading-relaxed">
              BrandProof uses a multi-stage architecture where deterministic Python rule engines run first. When external LLMs are connected, they operate under strict JSON constraints and are independently validated by the Python verification layer.
            </p>
            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3 bg-[#F7FAFA] border border-[#DCE7E8] rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#172C32] block">Active Engine Provider</span>
                  <span className="text-[11px] text-[#63777C]">{ai?.active_provider}</span>
                </div>
                <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#1E7E51] font-mono text-[10px] font-bold rounded">
                  {ai?.deterministic_engine_status}
                </span>
              </div>

              <div className="p-3 bg-[#F7FAFA] border border-[#DCE7E8] rounded flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#172C32] block">Independent Verifier Enforcement</span>
                  <span className="text-[11px] text-[#63777C]">Checks quoted text, clause IDs, and fact expiry</span>
                </div>
                <span className="px-2 py-0.5 bg-[#205E65] text-white font-mono text-[10px] font-bold rounded">
                  Enforced
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#EAF2F3] border border-[#DCE7E8] rounded text-xs text-[#172C32] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#205E65]">
                <ShieldCheck className="w-4 h-4 text-[#328C91]" />
                <span>Zero Data Retention Privacy Guarantee</span>
              </div>
              <p className="text-[11px] text-[#63777C] leading-relaxed">
                {ai?.privacy_disclosure}
              </p>
            </div>
          </div>

          {/* Phase 5: AI Call Transparency & Disclosure Log */}
          <div className="bg-white rounded-lg border border-[#DCE7E8] p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#172C32]">AI Call Transparency & Disclosure Log</h3>
                <p className="text-xs text-[#63777C] mt-0.5">
                  Complete audit record of every call to external AI services. Raw draft content and token mappings are never stored.
                </p>
              </div>
              <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-mono text-[10px] font-bold rounded">
                Zero Raw Content Storage
              </span>
            </div>

            {aiCalls.length === 0 ? (
              <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-center text-xs text-[#64748B]">
                No external AI calls logged yet. Engine is operating in deterministic offline mode or with mock provider verification.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#475569] font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Redaction</th>
                      <th className="px-3 py-2">Redaction Counts</th>
                      <th className="px-3 py-2">Latency</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {aiCalls.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-3 py-2 font-mono text-[11px] text-[#64748B]">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-2 font-semibold text-[#0F172A] uppercase font-mono text-[10px]">
                          {c.provider}
                        </td>
                        <td className="px-3 py-2 font-mono text-[#0F172A]">{c.model}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.redaction_enabled
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : "bg-[#F1F5F9] text-[#64748B]"
                            }`}
                          >
                            {c.redaction_enabled ? "REDACTED" : "OFF"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-[#64748B]">
                          {c.redaction_counts ? JSON.stringify(c.redaction_counts) : "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[#64748B]">{c.latency_ms}ms</td>
                        <td className="px-3 py-2 font-semibold text-[#166534] uppercase text-[10px]">
                          {c.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
