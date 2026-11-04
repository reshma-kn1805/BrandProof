import React, { useEffect, useState } from "react";
import { Settings, ShieldCheck, Lock, Database, Cpu, Info } from "lucide-react";
import { api } from "../lib/api";

export const SettingsView: React.FC = () => {
  const [ws, setWs] = useState<any | null>(null);
  const [ai, setAi] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [wsData, aiData] = await Promise.all([
        api.getWorkspaceSettings(),
        api.getAIPrivacySettings(),
      ]);
      setWs(wsData);
      setAi(aiData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[#172C32]">Workspace & AI Governance Settings</h2>
        <p className="text-xs text-[#63777C] mt-0.5">
          Tenant isolation, data boundaries, and AI privacy configuration.
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

          {/* AI Privacy & Processing Card */}
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
        </div>
      )}
    </div>
  );
};

