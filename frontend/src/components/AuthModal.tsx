import React, { useState } from "react";
import { ShieldCheck, UserCheck, Key, Lock, Mail, User, Sparkles, ArrowRight } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { api, setToken, User as UserType } from "../lib/api";

interface AuthModalProps {
  onSuccess: (user: UserType) => void;
  sessionExpiredMessage?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, sessionExpiredMessage }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Creator");
  const [orgName, setOrgName] = useState("Nila Foods");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: "Creator",
      email: "creator@nilafoods.com",
      name: "Arjun Mehta",
      desc: "Submits draft copy and applies verified corrections.",
      badge: "bg-[#EAF2F3] text-[#205E65]",
    },
    {
      role: "Reviewer",
      email: "reviewer@nilafoods.com",
      name: "Ananya Deshmukh",
      desc: "Audits citations, flags expired facts, requests changes.",
      badge: "bg-[#FEF3C7] text-[#B45309]",
    },
    {
      role: "Manager",
      email: "manager@nilafoods.com",
      name: "Vikram Patel",
      desc: "Holds publication sign-off authority and approval rights.",
      badge: "bg-[#E8F5E9] text-[#1E7E51]",
    },
    {
      role: "Admin",
      email: "admin@nilafoods.com",
      name: "Priya Sharma",
      desc: "Configures guidelines, approved facts, and terminology.",
      badge: "bg-[#172E35] text-white",
    },
  ];

  const handleQuickLogin = async (accEmail: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.login({ email: accEmail, password: "BrandProof2026!" });
      setToken(res.access_token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (isRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role,
            organization_name: orgName,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Registration failed");
        }
        const data = await res.json();
        setToken(data.access_token);
        onSuccess(data.user);
      } else {
        const res = await api.login({ email, password });
        setToken(res.access_token);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF2F3] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-elevated border border-[#DCE7E8] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Brand presentation and Demo Accounts (7 cols) */}
        <div className="md:col-span-7 bg-[#172E35] text-white p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <BrandLogo variant="full" theme="dark" size="lg" showTagline={true} />
            <p className="text-xs text-[#DCE7E8]/80 leading-relaxed pt-2">
              The intelligent enterprise brand governance and content verification platform. No citation, no flag. No verified evidence, no automatic approval.
            </p>
          </div>

          {/* 1-Click Demo Accounts Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#328C91]" />
              <span>1-Click Demonstration Accounts</span>
            </div>
            <p className="text-[11px] text-[#DCE7E8]/70">
              Select any role to instantly authenticate into the <strong>Nila Foods</strong> workspace:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className="p-3 rounded-lg bg-[#205E65]/50 hover:bg-[#205E65] border border-[#328C91]/40 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">{acc.name}</span>
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${acc.badge}`}>
                      {acc.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#DCE7E8]/70 block truncate">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#205E65]/50 text-[10px] text-[#DCE7E8]/60 flex items-center justify-between font-mono">
            <span>Password for all demo accounts: BrandProof2026!</span>
          </div>
        </div>

        {/* Right Side: Traditional Login / Register Form (5 cols) */}
        <div className="md:col-span-5 p-8 flex flex-col justify-center space-y-5 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#172C32]">
              {isRegister ? "Create Account" : "Sign In to BrandProof"}
            </h3>
            <p className="text-xs text-[#63777C] mt-0.5">
              {isRegister ? "Register a new organization workspace" : "Enter your email credentials"}
            </p>
          </div>

          {sessionExpiredMessage && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#172C32] mb-1">Full Name</label>
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-[#DCE7E8] rounded-md focus-within:border-[#328C91]">
                    <User className="w-3.5 h-3.5 text-[#63777C]" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs text-[#172C32] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172C32] mb-1">Organization</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DCE7E8] rounded-md text-xs text-[#172C32] focus:outline-none focus:border-[#328C91]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172C32] mb-1">Initial Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DCE7E8] rounded-md text-xs text-[#172C32]"
                  >
                    <option value="Creator">Creator</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Work Email</label>
              <div className="flex items-center gap-2 px-3 py-1.5 border border-[#DCE7E8] rounded-md focus-within:border-[#328C91]">
                <Mail className="w-3.5 h-3.5 text-[#63777C]" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs text-[#172C32] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172C32] mb-1">Password</label>
              <div className="flex items-center gap-2 px-3 py-1.5 border border-[#DCE7E8] rounded-md focus-within:border-[#328C91]">
                <Lock className="w-3.5 h-3.5 text-[#63777C]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs text-[#172C32] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegister ? "Register & Enter" : "Sign In"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs font-semibold text-[#328C91] hover:underline"
            >
              {isRegister ? "Already registered? Sign In" : "Need a custom account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

