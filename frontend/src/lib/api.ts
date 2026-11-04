/**
 * BrandProof Frontend API Client
 * Seamlessly interfaces with FastAPI backend (/api/*)
 */

const API_BASE = ""; // Relative path proxied via next.config.js to http://127.0.0.1:8000

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "Creator" | "Reviewer" | "Manager" | "Admin";
  organization_id: number;
  organization_name?: string;
  is_active: boolean;
}

export interface ReviewFinding {
  id: number;
  review_id: number;
  clause_id?: number;
  fact_id?: number;
  clause_number?: string;
  fact_code?: string;
  title: string;
  original_text: string;
  severity: "critical" | "warning" | "notice";
  explanation: string;
  suggested_correction?: string;
  edited_correction?: string;
  confidence: number;
  verification_status: "verified_clause" | "verified_fact" | "expired_fact_detected" | "pending_human_review" | "abstain";
  evidence_source?: string;
  decision_status: "pending" | "accepted" | "edited" | "rejected";
  created_at: string;
}

export interface DocumentRevision {
  id: number;
  revision_number: number;
  content: string;
  diff_summary?: string;
  change_type: string;
  created_at: string;
  created_by_name?: string;
}

export interface ReviewComment {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

export interface ApprovalDecision {
  id: number;
  user_id: number;
  user_name: string;
  decision: string;
  notes?: string;
  decided_at: string;
}

export interface ContentReview {
  id: number;
  title: string;
  original_content: string;
  current_content: string;
  source_filename?: string;
  source_file_type: string;
  status: "draft" | "in_review" | "changes_requested" | "resubmitted" | "approved" | "rejected";
  author_id: number;
  author_name: string;
  reviewer_id?: number;
  reviewer_name?: string;
  overall_score: number;
  has_critical_violations: boolean;
  requires_human_attention: boolean;
  review_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  findings: ReviewFinding[];
  revisions: DocumentRevision[];
  comments: ReviewComment[];
  approvals: ApprovalDecision[];
}

export interface GuidelineClause {
  id: number;
  clause_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface ApprovedFact {
  id: number;
  fact_code: string;
  statement: string;
  description?: string;
  source_evidence: string;
  responsible_owner: string;
  approval_status: "approved" | "pending" | "rejected" | "expired";
  effective_date: string;
  expiry_date?: string;
  last_verified_date: string;
  is_expired: boolean;
  days_until_expiry?: number;
}

export interface Terminology {
  id: number;
  preferred_term: string;
  prohibited_term: string;
  incorrect_variations: string[];
  approved_alternatives: string[];
  case_sensitive: boolean;
  notes?: string;
}

export interface BrandAsset {
  id: number;
  title: string;
  asset_type: string;
  file_url: string;
  alt_text?: string;
  guidelines_notes?: string;
  status: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_reviews: number;
  reviews_in_progress: number;
  approved_submissions: number;
  submissions_requiring_attention: number;
  compliance_average: number;
  total_clauses: number;
  total_approved_facts: number;
  expired_facts_count: number;
  recent_activity: any[];
  frequently_triggered_clauses: any[];
  pending_approvals: any[];
  status_distribution: Record<string, number>;
}

export interface AuditLog {
  id: number;
  user_name?: string;
  user_email?: string;
  action: string;
  target_type: string;
  target_id?: number;
  details?: any;
  ip_address: string;
  created_at: string;
}

// Token helper
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("brandproof_token");
};

export const setToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("brandproof_token", token);
  }
};

export const clearToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("brandproof_token");
  }
};

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

// API methods
export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMe: () => apiFetch<User>("/api/auth/me"),
  getDemoUsers: () => apiFetch<any>("/api/auth/demo-users"),

  // Dashboard
  getDashboard: () => apiFetch<DashboardMetrics>("/api/analytics/dashboard"),

  // Reviews
  getReviews: (status?: string) =>
    apiFetch<ContentReview[]>(`/api/reviews/${status ? `?status_filter=${status}` : ""}`),
  getReview: (id: number) => apiFetch<ContentReview>(`/api/reviews/${id}`),
  submitReview: (data: { title: string; content: string; file_name?: string; file_type?: string }) =>
    apiFetch<ContentReview>("/api/reviews/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadReviewFile: (formData: FormData) =>
    apiFetch<ContentReview>("/api/reviews/upload", {
      method: "POST",
      body: formData,
    }),
  handleFindingAction: (reviewId: number, findingId: number, action: "accept" | "edit" | "reject", editedText?: string) =>
    apiFetch<ContentReview>(`/api/reviews/${reviewId}/findings/${findingId}/action`, {
      method: "POST",
      body: JSON.stringify({ action, edited_text: editedText }),
    }),
  addComment: (reviewId: number, message: string) =>
    apiFetch<ReviewComment>(`/api/reviews/${reviewId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  assignReviewer: (reviewId: number, reviewerId: number) =>
    apiFetch<any>(`/api/reviews/${reviewId}/assign-reviewer?reviewer_id=${reviewerId}`, {
      method: "POST",
    }),
  decideReview: (reviewId: number, decision: "approved" | "rejected" | "changes_requested", notes?: string) =>
    apiFetch<ContentReview>(`/api/reviews/${reviewId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, notes }),
    }),

  // Guidelines
  getGuidelines: () => apiFetch<any[]>("/api/guidelines/"),
  getClauses: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    return apiFetch<GuidelineClause[]>(`/api/guidelines/clauses?${params.toString()}`);
  },
  updateClause: (id: number, data: Partial<GuidelineClause>) =>
    apiFetch<GuidelineClause>(`/api/guidelines/clauses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  compareVersions: (docId: number, v1: string, v2: string) =>
    apiFetch<any>(`/api/guidelines/compare-versions?doc_id=${docId}&v1=${v1}&v2=${v2}`),
  uploadGuidelineFile: (formData: FormData) =>
    apiFetch<any>("/api/guidelines/upload", {
      method: "POST",
      body: formData,
    }),

  // Facts
  getFacts: (status?: string) =>
    apiFetch<ApprovedFact[]>(`/api/facts/${status ? `?status_filter=${status}` : ""}`),
  createFact: (data: any) =>
    apiFetch<ApprovedFact>("/api/facts/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateFact: (id: number, data: any) =>
    apiFetch<ApprovedFact>(`/api/facts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Terminology
  getTerminology: () => apiFetch<Terminology[]>("/api/terminology/"),
  createTerminology: (data: any) =>
    apiFetch<Terminology>("/api/terminology/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteTerminology: (id: number) =>
    apiFetch<any>(`/api/terminology/${id}`, {
      method: "DELETE",
    }),

  // Brand Assets
  getAssets: () => apiFetch<BrandAsset[]>("/api/assets/"),
  createAsset: (data: any) =>
    apiFetch<BrandAsset>("/api/assets/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Audit Logs
  getAuditLogs: (actionFilter?: string) =>
    apiFetch<AuditLog[]>(`/api/audit/${actionFilter ? `?action_filter=${actionFilter}` : ""}`),

  // Users & Team
  getUsers: () => apiFetch<User[]>("/api/users/"),
  updateUserRole: (userId: number, role: string) =>
    apiFetch<any>(`/api/users/${userId}/role?new_role=${role}`, {
      method: "PUT",
    }),

  // Settings
  getWorkspaceSettings: () => apiFetch<any>("/api/settings/workspace"),
  getAIPrivacySettings: () => apiFetch<any>("/api/settings/ai-privacy"),
};
