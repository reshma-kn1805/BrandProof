import React, { useEffect, useState } from "react";
import { Image as ImageIcon, Plus, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { api, BrandAsset, User } from "../lib/api";

interface BrandAssetsViewProps {
  currentUser: User | null;
}

export const BrandAssetsView: React.FC<BrandAssetsViewProps> = ({ currentUser }) => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState("logo");
  const [fileUrl, setFileUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.getAssets();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAsset({
        title,
        asset_type: assetType,
        file_url: fileUrl,
        alt_text: altText,
        guidelines_notes: notes,
      });
      setShowAddModal(false);
      setTitle("");
      setFileUrl("");
      setAltText("");
      setNotes("");
      loadAssets();
    } catch (err: any) {
      alert(err.message || "Failed to add asset");
    }
  };

  const isEditor = currentUser && ["Admin", "Manager", "Reviewer"].includes(currentUser.role);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172C32]">Brand Assets & Accessibility Conformance</h2>
          <p className="text-xs text-[#63777C] mt-0.5">
            Approved imagery, official logo marks, and screen-reader accessibility metadata (Clause 5.2).
          </p>
        </div>
        {isEditor && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand Asset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-[#63777C]">
            Loading brand assets repository...
          </div>
        ) : (
          (assets ?? []).map((asset) => {
            const hasAlt = Boolean(asset.alt_text && asset.alt_text.trim().length > 5);

            return (
              <div
                key={asset.id}
                className="bg-white rounded-lg border border-[#DCE7E8] overflow-hidden shadow-subtle flex flex-col justify-between hover:border-[#328C91] transition-all"
              >
                <div>
                  <div className="h-44 bg-[#EAF2F3] relative overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={asset.file_url}
                      alt={asset.alt_text || asset.title}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#172E35] text-white">
                      {(asset.asset_type ?? "asset").replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="text-xs font-bold text-[#172C32]">{asset.title}</h3>

                    {/* Accessibility Status Pill */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {hasAlt ? (
                        <span className="flex items-center gap-1 text-[#1E7E51] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Clause 5.2 Conforming Alt Text</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#B91C1C] font-semibold bg-[#FEE2E2] px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Missing Alt Text (Clause 5.2 Flag)</span>
                        </span>
                      )}
                    </div>

                    {asset.alt_text && (
                      <p className="text-[11px] text-[#63777C] italic bg-[#F7FAFA] p-2 rounded border border-[#DCE7E8]">
                        "{asset.alt_text}"
                      </p>
                    )}

                    {asset.guidelines_notes && (
                      <p className="text-[11px] text-[#63777C] pt-1">
                        {asset.guidelines_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#F7FAFA] border-t border-[#DCE7E8] flex items-center justify-between text-[11px] text-[#63777C]">
                  <span>Status: <strong className="text-[#1E7E51] uppercase font-mono">Active</strong></span>
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#328C91] hover:text-[#205E65] font-semibold"
                  >
                    <span>View Asset</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddAsset}
            className="bg-white rounded-lg shadow-elevated border border-[#DCE7E8] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#172C32]">Add Brand Asset</h3>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Asset Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Nila Logo Mark (Forest Green)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Asset Type</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded"
              >
                <option value="logo">Logo Mark</option>
                <option value="product_image">Product Packaging Mockup</option>
                <option value="banner">Campaign Banner</option>
                <option value="reference">Reference Document</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Image URL *</label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">
                Descriptive Alt Text (Clause 5.2 Conformance)
              </label>
              <input
                type="text"
                placeholder="Descriptive text for accessibility..."
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#DCE7E8] rounded focus:outline-none focus:border-[#328C91]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Usage Notes</label>
              <textarea
                rows={2}
                placeholder="Clear space, color restrictions, background rules..."
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
                Save Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

