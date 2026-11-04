import React, { useEffect, useState } from "react";
import { GitCompare, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

interface VersionCompareViewProps {
  onBack: () => void;
}

export const VersionCompareView: React.FC<VersionCompareViewProps> = ({ onBack }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparison();
  }, []);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const res = await api.compareVersions(1, "1.0", "2.0");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#DCE7E8] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-[#EAF2F3] text-[#63777C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#172C32]">Guideline Version Comparison</h2>
            <p className="text-xs text-[#63777C] mt-0.5">
              Differential audit between Guideline Version 1.0 (Archived) and Version 2.0 (Active)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 bg-[#EAF2F3] text-[#205E65] rounded font-bold">
            v1.0 → v2.0
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#63777C]">
          Calculating guideline differential...
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-xs text-[#63777C]">
          Comparison data unavailable.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
          <div className="p-4 bg-[#F7FAFA] border-b border-[#DCE7E8] flex items-center justify-between">
            <span className="text-xs font-bold text-[#172C32]">
              {data.document_title}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[#1E7E51] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#1E7E51]"></span> Modified / Added
              </span>
              <span className="flex items-center gap-1 text-[#63777C]">
                <span className="w-2 h-2 rounded-full bg-[#B9CBD0]"></span> Unchanged
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#DCE7E8]">
            {data.diffs.map((d: any, idx: number) => (
              <div key={idx} className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#205E65] text-white">
                    Clause {d.clause_number}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                      d.type === "modified"
                        ? "bg-[#FEF3C7] text-[#B45309]"
                        : d.type === "added"
                        ? "bg-[#DCFCE7] text-[#166534]"
                        : "bg-[#F7FAFA] text-[#63777C]"
                    }`}
                  >
                    {d.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-3 bg-[#F7FAFA] border border-[#DCE7E8] rounded text-xs space-y-1">
                    <span className="text-[10px] font-mono text-[#63777C] font-semibold uppercase">
                      Version 1.0:
                    </span>
                    <p className="text-[#63777C] leading-relaxed">
                      {d.v1 || <em className="italic text-[#B9CBD0]">Clause did not exist in v1.0</em>}
                    </p>
                  </div>

                  <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded text-xs space-y-1">
                    <span className="text-[10px] font-mono text-[#166534] font-semibold uppercase">
                      Version 2.0 (Active):
                    </span>
                    <p className="text-[#172C32] font-medium leading-relaxed">{d.v2}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

