"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "An unexpected rendering error occurred." };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[BrandProof ErrorBoundary]", error, errorInfo);
  }

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleGoToDashboard = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("brandproof_active_view", "dashboard");
      localStorage.removeItem("brandproof_selected_review_id");
      this.setState({ hasError: false, errorMessage: "" });
      window.location.href = window.location.pathname;
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#EAF2F3] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-elevated border border-[#DCE7E8] p-8 text-center space-y-6">
            <div className="flex justify-center">
              <BrandLogo variant="full" size="md" showTagline={true} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#B91C1C]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[#172C32]">Something went wrong</h2>
              <p className="text-xs text-[#63777C] leading-relaxed">
                Something went wrong. Reload or go back to the dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#328C91] hover:bg-[#205E65] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoToDashboard}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#EAF2F3] hover:bg-[#DCE7E8] text-[#172C32] text-xs font-semibold rounded-lg transition-colors border border-[#DCE7E8]"
              >
                <Home className="w-3.5 h-3.5 text-[#205E65]" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
