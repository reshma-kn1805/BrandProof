import React, { useEffect, useState } from "react";
import { Users, Shield, UserCheck, Key } from "lucide-react";
import { api, User } from "../lib/api";

interface TeamViewProps {
  currentUser: User | null;
}

export const TeamView: React.FC<TeamViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await api.updateUserRole(userId, role);
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const isAdmin = currentUser?.role === "Admin";

  const roleDescriptions = [
    {
      role: "Creator",
      badgeColor: "bg-[#EAF2F3] text-[#205E65]",
      desc: "Submits draft campaigns, reviews suggested corrections, applies fixes, and sends content for human review.",
    },
    {
      role: "Reviewer",
      badgeColor: "bg-[#FEF3C7] text-[#B45309]",
      desc: "Validates citations, examines evidence findings, requests adjustments, and discusses nuances with creators.",
    },
    {
      role: "Manager",
      badgeColor: "bg-[#E8F5E9] text-[#1E7E51]",
      desc: "Holds final publication sign-off authority. Approves or formally rejects content with audit remarks.",
    },
    {
      role: "Admin",
      badgeColor: "bg-[#172E35] text-white",
      desc: "Configures brand guideline documents, approved facts ledger, terminology standards, and team roles.",
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[#172C32]">Team & Role-Based Access Control</h2>
        <p className="text-xs text-[#63777C] mt-0.5">
          Role-based governance enforced across backend API endpoints and approval workflows.
        </p>
      </div>

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleDescriptions.map((r) => (
          <div
            key={r.role}
            className="p-4 bg-white rounded-lg border border-[#DCE7E8] shadow-subtle space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${r.badgeColor}`}>
                {r.role}
              </span>
              <Shield className="w-3.5 h-3.5 text-[#63777C]" />
            </div>
            <p className="text-xs text-[#63777C] leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[#DCE7E8] shadow-subtle overflow-hidden">
        <div className="p-4 bg-[#F7FAFA] border-b border-[#DCE7E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#328C91]" />
            <h3 className="text-xs font-bold text-[#172C32] uppercase tracking-wide">
              Active Organization Members ({users.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#63777C]">Workspace: Nila Foods</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#63777C]">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAFA] border-b border-[#DCE7E8] text-[#63777C] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Assign Role</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE7E8]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F7FAFA] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#172C32]">{u.full_name}</td>
                    <td className="px-4 py-3.5 text-[#63777C] font-mono text-[11px]">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-[#EAF2F3] text-[#205E65]">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-mono text-[#1E7E51] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded">
                        Active
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-xs bg-[#F7FAFA] border border-[#DCE7E8] rounded px-2 py-1 font-semibold text-[#172C32]"
                        >
                          <option value="Creator">Creator</option>
                          <option value="Reviewer">Reviewer</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                    )}
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

