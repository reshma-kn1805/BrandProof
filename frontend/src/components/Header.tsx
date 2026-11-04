import React from "react";
import { ShieldCheck, Sparkles, UserCheck, ArrowRightLeft } from "lucide-react";
import { User } from "../lib/api";

interface HeaderProps {
  title: string;
  currentUser: User | null;
  onSwitchRole: (role: "Creator" | "Reviewer" | "Manager" | "Admin") => void;
  onLoadDemoDraft: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  currentUser,
  onSwitchRole,
  onLoadDemoDraft,
}) => {
  return (
    <header className="h-14 bg-white border-b border-[#DCE7E8] px-6 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-[#172C32]">{title}</h1>
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EAF2F3] border border-[#DCE7E8] text-[11px] text-[#205E65] font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#328C91]" />
          <span>Independent Verifier: Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Demo Launch Button */}
        <button
          onClick={onLoadDemoDraft}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#205E65] text-xs font-semibold rounded transition-colors border border-[#DCE7E8]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#328C91]" />
          <span>1-Click Test Sample</span>
        </button>

        {/* Role Switcher Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#F7FAFA] border border-[#DCE7E8] rounded-md text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#63777C]" />
            <span className="text-[#63777C] text-[11px]">Role:</span>
            <select
              value={currentUser.role}
              onChange={(e) => onSwitchRole(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-[#172C32] cursor-pointer focus:outline-none"
            >
              <option value="Creator">Creator (Submit & Fix)</option>
              <option value="Reviewer">Reviewer (Audit Findings)</option>
              <option value="Manager">Manager (Sign-Off Authority)</option>
              <option value="Admin">Admin (Full Control)</option>
            </select>
          </div>
        )}
      </div>
    </header>
  );
};

