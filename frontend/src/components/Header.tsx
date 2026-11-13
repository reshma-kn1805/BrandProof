import React from "react";
import { ShieldCheck, Sparkles, UserCheck, ArrowRightLeft } from "lucide-react";
import { User } from "../lib/api";

interface HeaderProps {
  title: string;
  currentUser: User | null;
  onSwitchRole: (role: "Creator" | "Reviewer" | "Manager" | "Admin") => void;
  onLoadDemoDraft: () => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Creator: "Drafts and submits content, resolves findings, applies rewrites",
  Reviewer: "Reviews evidence, verifies citations, requests changes",
  Manager: "Final approval authority, publishes guideline revisions",
  Admin: "Workspace settings, user provisioning, system logs",
};

export const Header: React.FC<HeaderProps> = ({
  title,
  currentUser,
  onSwitchRole,
  onLoadDemoDraft,
}) => {
  const currentRole = currentUser?.role || "Creator";
  const roleDesc = ROLE_DESCRIPTIONS[currentRole] || "";

  return (
    <header className="h-14 bg-white border-b border-[#DCE7E8] px-6 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold text-[#172C32] truncate">{title}</h1>
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EAF2F3] border border-[#DCE7E8] text-[11px] text-[#205E65] font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#328C91]" />
          <span>Independent Verifier: Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Demo Launch Button */}
        <button
          onClick={onLoadDemoDraft}
          aria-label="1-Click Test Sample"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#205E65] text-xs font-semibold rounded transition-colors border border-[#DCE7E8] focus-visible:ring-2 focus-visible:ring-[#328C91]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#328C91]" />
          <span>1-Click Test Sample</span>
        </button>

        {/* Phase 8: Role Switcher with One-Line Description */}
        {currentUser && (
          <div
            className="flex flex-col items-end"
            title={`${currentRole}: ${roleDesc}`}
          >
            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs focus-within:ring-2 focus-within:ring-[#328C91]">
              <UserCheck className="w-3.5 h-3.5 text-[#63777C]" />
              <span className="text-[#63777C] text-[11px] font-medium">Role:</span>
              <select
                value={currentUser.role}
                onChange={(e) => onSwitchRole(e.target.value as any)}
                aria-label="Switch workspace user role"
                className="bg-transparent text-xs font-semibold text-[#172C32] cursor-pointer focus:outline-none"
              >
                <option value="Creator">Creator</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <span className="hidden xl:block text-[10px] text-[#63777C] font-normal mt-0.5 max-w-xs truncate">
              {roleDesc}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

