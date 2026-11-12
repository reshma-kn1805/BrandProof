import React from "react";
import {
  LayoutDashboard,
  FileCheck2,
  FilePlus2,
  BookOpen,
  Scale,
  SpellCheck,
  Image as ImageIcon,
  CheckSquare,
  History,
  Users,
  Settings,
  LogOut,
  ShieldAlert,
  GitCompare,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { User } from "../lib/api";

export type ActiveView =
  | "dashboard"
  | "reviews"
  | "new_review"
  | "guidelines"
  | "version_compare"
  | "facts"
  | "terminology"
  | "assets"
  | "approvals"
  | "audit"
  | "verify_report"
  | "team"
  | "settings";

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "reviews", label: "Content Reviews", icon: FileCheck2 },
    { id: "new_review", label: "Submit Content", icon: FilePlus2, highlight: true },
    { id: "approvals", label: "Approval Queue", icon: CheckSquare },
    { section: "GOVERNANCE REPOSITORY" },
    { id: "guidelines", label: "Brand Guidelines", icon: BookOpen },
    { id: "version_compare", label: "Version Comparison", icon: GitCompare },
    { id: "facts", label: "Approved Facts Ledger", icon: Scale },
    { id: "terminology", label: "Terminology Rules", icon: SpellCheck },
    { id: "assets", label: "Brand Assets", icon: ImageIcon },
    { section: "SYSTEM & AUDIT" },
    { id: "audit", label: "Audit Logs", icon: History },
    { id: "verify_report", label: "Verify Report", icon: ShieldAlert },
    { id: "team", label: "Team & Permissions", icon: Users },
    { id: "settings", label: "Workspace & AI Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#172E35] text-[#F7FAFA] flex flex-col h-screen select-none border-r border-[#205E65]/40 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#205E65]/50 flex items-center justify-between">
        <BrandLogo variant="full" theme="dark" size="sm" showTagline={true} />
      </div>

      {/* Tenant Workspace Indicator */}
      <div className="px-5 py-3 bg-[#13252B] border-b border-[#205E65]/30 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[#DCE7E8]/60 font-semibold">
            Active Workspace
          </span>
          <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#328C91] animate-pulse"></span>
            Nila Foods
            <span className="text-[9px] bg-[#205E65] text-[#EAF2F3] px-1 py-0.2 rounded font-mono">
              Demo
            </span>
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <div
                key={`sec-${idx}`}
                className="pt-4 pb-1.5 px-3 text-[10px] font-mono tracking-wider text-[#DCE7E8]/50 uppercase font-semibold"
              >
                {item.section}
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ActiveView)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${
                isActive
                  ? "bg-[#328C91] text-white shadow-sm font-semibold"
                  : "text-[#DCE7E8]/80 hover:bg-[#205E65]/60 hover:text-white"
              } ${item.highlight && !isActive ? "border border-[#328C91]/40 text-[#EAF2F3]" : ""}`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-white" : item.highlight ? "text-[#328C91]" : "text-[#DCE7E8]/70"
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#328C91]"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      {currentUser && (
        <div className="p-3 border-t border-[#205E65]/50 bg-[#13252B]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded bg-[#205E65] text-white font-bold flex items-center justify-center text-xs shrink-0 border border-[#328C91]/40">
                {currentUser.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {currentUser.full_name}
                </span>
                <span className="text-[10px] text-[#328C91] font-mono">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded text-[#DCE7E8]/70 hover:text-white hover:bg-[#205E65] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

