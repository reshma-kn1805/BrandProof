/**
 * BrandProof Frontend API Client
 * Seamlessly interfaces with FastAPI backend (/api/*)
 * Features automatic client-side demo fallback for GitHub Pages and offline evaluation.
 */

import {
  mockDemoUsers,
  mockClauses,
  mockFacts,
  mockTerminology,
  mockAssets,
  initialReview,
  mockDashboardMetrics,
  mockAuditLogs,
} from "./mockData";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

export type EngineMode = "connected" | "demo";
export let activeEngineMode: EngineMode = "connected";

export const getEngineMode = (): EngineMode => activeEngineMode;
export const setEngineMode = (mode: EngineMode) => {
  activeEngineMode = mode;
};

export async function checkBackendHealth(timeoutMs: number = 6000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return data.status === "healthy" || data.status === "degraded";
    }
    return false;
  } catch (_) {
    clearTimeout(timeoutId);
    return false;
  }
}

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
  verification_status:
    | "verified_clause"
    | "verified_fact"
    | "expired_fact_detected"
    | "pending_human_review"
    | "abstain";
  evidence_source?: string;
  decision_status: "pending" | "accepted" | "edited" | "rejected";
  reject_reason?: string;
  reject_note?: string;
  engine_source?: string;
  is_ai_assisted?: boolean;
  needs_human_look?: boolean;
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
  finding_id?: number;
  comment_type?: "general" | "finding" | "ask_manager";
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

export interface ImageDominantColor {
  hex: string;
  rgb: number[];
  percentage: number;
  closest_approved: {
    name: string;
    hex: string;
    delta_e: number;
  };
}

export interface ImageAnalysisData {
  format?: string;
  dimensions?: { width: number; height: number };
  alt_text?: string;
  alt_text_pass?: boolean;
  dominant_colors: ImageDominantColor[];
  contrast_ratio: number;
  contrast_pass: boolean;
  palette_pass: boolean;
  findings?: ReviewFinding[];
  disclaimer: string;
}

export interface ContentReview {
  id: number;
  title: string;
  original_content: string;
  current_content: string;
  source_filename?: string;
  source_file_type: string;
  status:
    | "draft"
    | "in_review"
    | "changes_requested"
    | "resubmitted"
    | "approved"
    | "rejected";
  author_id: number;
  author_name: string;
  reviewer_id?: number;
  reviewer_name?: string;
  overall_score: number;
  has_critical_violations: boolean;
  requires_human_attention: boolean;
  confidential_mode?: boolean;
  redaction_summary?: Record<string, any>;
  report_fingerprint?: string;
  image_filename?: string;
  image_url?: string;
  image_alt_text?: string;
  image_analysis?: ImageAnalysisData;
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
  prev_hash?: string;
  entry_hash?: string;
  created_at: string;
}

export interface AuditVerifyResult {
  valid: boolean;
  entries: number;
  head: string | null;
  first_broken_entry: number | null;
}

export interface RedactionPreviewResult {
  original_text: string;
  redacted_text: string;
  counts: Record<string, number>;
  tokens: Array<{ token: string; type: string; original: string }>;
}

export interface AICallLogEntry {
  id: number;
  provider: string;
  model: string;
  redaction_enabled: boolean;
  redaction_counts?: Record<string, number>;
  latency_ms: number;
  status: string;
  created_at: string;
}

export interface ReportVerifyResult {
  matched: boolean;
  review_id?: number;
  title?: string;
  status?: string;
  score?: number;
  fingerprint?: string;
  stored_fingerprint?: string;
  message?: string;
}

// --- Phase 6: Guideline Health & Intelligence Interfaces ---
export interface GuidelineHealthKPIs {
  total_clauses: number;
  unclear_clauses_count: number;
  conflicting_pairs_count: number;
  global_override_rate: number;
  total_decisions_recorded: number;
  has_demo_history: boolean;
  includes_demo_history: boolean;
}

export interface GuidelineHealthClause {
  clause_id: number;
  clause_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  total_triggered: number;
  total_decisions: number;
  accepted_count: number;
  edited_count: number;
  rejected_count: number;
  override_rate: number;
  reasons_breakdown: Record<string, number>;
  health_status: "unclear" | "healthy" | "insufficient_data";
  is_unclear: boolean;
}

export interface GuidelineHealthConflict {
  clause_a_number: string;
  clause_a_title: string;
  clause_b_number: string;
  clause_b_title: string;
  reviews_count: number;
  review_ids: number[];
  example_quotations: Array<{
    review_id: number;
    review_title: string;
    overlapping_text: string;
    clause_a_text: string;
    clause_b_text: string;
  }>;
}

export interface GuidelineHealthResponse {
  kpis: GuidelineHealthKPIs;
  clauses: GuidelineHealthClause[];
  conflicts: GuidelineHealthConflict[];
}

export interface ClauseBacktestResult {
  clause_number: string;
  original_title: string;
  proposed_title: string;
  reviews_analyzed: number;
  summary: {
    added: number;
    removed: number;
    unchanged: number;
    net_difference: number;
  };
  examples: {
    added: Array<{ review_id: number; review_title: string; newly_flagged_text: string; explanation: string }>;
    removed: Array<{ review_id: number; review_title: string; text_no_longer_flagged: string; explanation: string }>;
  };
  notice: string;
}

export interface ClausePublishResult {
  success: boolean;
  new_version_id: number;
  version_number: string;
  changelog: string;
  clause_id?: number;
  clause_number: string;
  document_id: number;
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
    localStorage.removeItem("brandproof_active_user");
  }
};

// Client-side in-memory mock store
class MockDataStore {
  currentUser: User = mockDemoUsers[0]; // Default: Arjun Mehta (Creator)
  reviews: ContentReview[] = [JSON.parse(JSON.stringify(initialReview))];
  clauses: GuidelineClause[] = [...mockClauses];
  facts: ApprovedFact[] = [...mockFacts];
  terminology: Terminology[] = [...mockTerminology];
  assets: BrandAsset[] = [...mockAssets];
  users: User[] = [...mockDemoUsers];
  auditLogs: AuditLog[] = [...mockAuditLogs];

  constructor() {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("brandproof_active_user");
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch (_) {}
      }
    }
  }

  setCurrentUser(user: User) {
    this.currentUser = user;
    if (typeof window !== "undefined") {
      localStorage.setItem("brandproof_active_user", JSON.stringify(user));
    }
  }

  runVerification(
    content: string,
    title: string,
    imageData?: string,
    imageFilename?: string,
    imageAltText?: string
  ): ContentReview {
    const findings: ReviewFinding[] = [];
    let score = 100;
    let hasCritical = false;

    // Check Clause 4.1: Prohibited "Millet-Mix"
    if (content.toLowerCase().includes("millet-mix")) {
      findings.push({
        id: Date.now() + 1,
        review_id: this.reviews.length + 1,
        clause_id: 4,
        clause_number: "4.1",
        title: "Prohibited Product Naming 'Millet-Mix'",
        original_text: "Millet-Mix",
        severity: "critical",
        explanation:
          "Clause 4.1 requires the trademarked term 'Nila Millet Mix'. The hyphenated variant 'Millet-Mix' is prohibited.",
        suggested_correction: "Nila Millet Mix",
        confidence: 1.0,
        verification_status: "verified_clause",
        evidence_source: "Clause 4.1 & Terminology Registry",
        decision_status: "pending",
        created_at: new Date().toISOString(),
      });
      score -= 22;
      hasCritical = true;
    }

    // Check Clause 3.4 & Fact F-07 (Expired): "#1" or "India's #1"
    if (
      content.includes("#1") ||
      content.toLowerCase().includes("india's #1") ||
      content.toLowerCase().includes("best")
    ) {
      findings.push({
        id: Date.now() + 2,
        review_id: this.reviews.length + 1,
        clause_id: 2,
        clause_number: "3.4",
        fact_id: 1,
        fact_code: "F-07",
        title: "Unverified Superlative Claim (Expired Fact F-07)",
        original_text: content.includes("India's #1")
          ? "India's #1"
          : content.includes("#1")
          ? "#1"
          : "best",
        severity: "critical",
        explanation:
          "Clause 3.4 strictly prohibits ranking superlatives without active proof. Referenced audit Fact F-07 expired on Dec 31, 2025.",
        suggested_correction: "one of India's leading wholesome breakfasts",
        confidence: 0.98,
        verification_status: "expired_fact_detected",
        evidence_source: "Clause 3.4 & Approved Fact F-07 (Expired)",
        decision_status: "pending",
        created_at: new Date().toISOString(),
      });
      score -= 22;
      hasCritical = true;
    }

    // Check Clause 3.6: Medical guarantee "Guaranteed to"
    if (
      content.toLowerCase().includes("guaranteed") ||
      content.toLowerCase().includes("cures")
    ) {
      findings.push({
        id: Date.now() + 3,
        review_id: this.reviews.length + 1,
        clause_id: 3,
        clause_number: "3.6",
        title: "Prohibited Health Guarantee",
        original_text: "Guaranteed to cut sugar cravings",
        severity: "critical",
        explanation:
          "Clause 3.6 bans medical promises and therapeutic guarantees. Frame around verifiable nutritional fiber benefits.",
        suggested_correction:
          "Formulated with high dietary fiber to help support steady daily energy",
        confidence: 0.95,
        verification_status: "verified_clause",
        evidence_source: "Clause 3.6 Health & Therapeutic Claims",
        decision_status: "pending",
        created_at: new Date().toISOString(),
      });
      score -= 22;
      hasCritical = true;
    }

    // Check Clause 2.1: Urgency "Buy now" or "Hurry"
    if (
      content.toLowerCase().includes("buy now") ||
      content.toLowerCase().includes("hurry") ||
      content.toLowerCase().includes("act fast")
    ) {
      findings.push({
        id: Date.now() + 4,
        review_id: this.reviews.length + 1,
        clause_id: 1,
        clause_number: "2.1",
        title: "High-Pressure Urgency Sales Trigger",
        original_text: "Buy now.",
        severity: "warning",
        explanation:
          "Clause 2.1 requires brand communication to remain respectful and informative. Aggressive sales triggers are prohibited.",
        suggested_correction: "Explore our wholesome breakfast range today.",
        confidence: 0.92,
        verification_status: "verified_clause",
        evidence_source: "Clause 2.1 Brand Voice & Tone",
        decision_status: "pending",
        created_at: new Date().toISOString(),
      });
      score -= 12;
    }

    // Stage 4.5: Image Accessibility Checks
    let imageAnalysis: ImageAnalysisData | undefined = undefined;
    if (imageData) {
      const cleanAlt = (imageAltText || "").trim();
      let altFinding: ReviewFinding | null = null;
      if (!cleanAlt) {
        altFinding = {
          id: Date.now() + 10,
          review_id: this.reviews.length + 1,
          clause_number: "5.2",
          title: "Missing Media Alternative Text",
          original_text: "Image attached without alternative text",
          severity: "warning",
          explanation: "Clause 5.2 requires clear, descriptive alternative text for screen readers and accessibility conformance on all media assets.",
          suggested_correction: "Add descriptive alt text describing the image content (minimum 5 characters).",
          confidence: 1.0,
          verification_status: "verified_clause",
          evidence_source: "Clause 5.2 Accessibility and Media Alt Text",
          decision_status: "pending",
          engine_source: "image_analysis",
          created_at: new Date().toISOString(),
        };
      } else if (cleanAlt.length < 5) {
        altFinding = {
          id: Date.now() + 10,
          review_id: this.reviews.length + 1,
          clause_number: "5.2",
          title: "Alternative Text Too Short",
          original_text: cleanAlt,
          severity: "warning",
          explanation: `Clause 5.2 requires meaningful alt text. '${cleanAlt}' is shorter than the 5-character minimum threshold.`,
          suggested_correction: "Provide a descriptive sentence summarizing the image content.",
          confidence: 1.0,
          verification_status: "verified_clause",
          evidence_source: "Clause 5.2 Accessibility and Media Alt Text",
          decision_status: "pending",
          engine_source: "image_analysis",
          created_at: new Date().toISOString(),
        };
      } else if (cleanAlt.toLowerCase().startsWith("image of") || cleanAlt.toLowerCase().startsWith("picture of")) {
        altFinding = {
          id: Date.now() + 10,
          review_id: this.reviews.length + 1,
          clause_number: "5.2",
          title: "Redundant Alternative Text Prefix",
          original_text: cleanAlt,
          severity: "warning",
          explanation: "Clause 5.2 discourages redundant introductory phrases. Screen readers automatically announce images to users.",
          suggested_correction: cleanAlt.replace(/^(image of|picture of)\s*/i, ""),
          confidence: 1.0,
          verification_status: "verified_clause",
          evidence_source: "Clause 5.2 Accessibility and Media Alt Text",
          decision_status: "pending",
          engine_source: "image_analysis",
          created_at: new Date().toISOString(),
        };
      }

      if (altFinding) {
        findings.push(altFinding);
        score -= 12;
      }

      const isNonCompliant = !imageAltText || cleanAlt.length < 5 || imageData.includes("magenta") || !imageFilename?.includes("compliant");
      const contrastRatio = isNonCompliant ? 1.8 : 8.5;
      const contrastPass = contrastRatio >= 4.5;
      const palettePass = !isNonCompliant;

      if (!contrastPass) {
        findings.push({
          id: Date.now() + 11,
          review_id: this.reviews.length + 1,
          clause_number: "5.3",
          title: "Insufficient WCAG Visual Contrast",
          original_text: `Contrast ratio ${contrastRatio.toFixed(1)}:1 below 4.5:1 threshold`,
          severity: "warning",
          explanation: `Clause 5.3 requires a minimum WCAG 2.2 contrast ratio of 4.5:1 for graphical legibility. Measured dominant ratio is ${contrastRatio.toFixed(1)}:1.`,
          suggested_correction: "Adjust foreground/background luminance to achieve at least 4.5:1 contrast ratio.",
          confidence: 1.0,
          verification_status: "verified_clause",
          evidence_source: "Clause 5.3 Visual Contrast & Legibility",
          decision_status: "pending",
          engine_source: "image_analysis",
          created_at: new Date().toISOString(),
        });
        score -= 12;
      }

      if (!palettePass) {
        findings.push({
          id: Date.now() + 12,
          review_id: this.reviews.length + 1,
          clause_number: "5.4",
          title: "Unapproved Brand Color Detected",
          original_text: "Off-palette color #FF00FF detected, closest approved: #2E7D4F",
          severity: "warning",
          explanation: "Clause 5.4 restricts dominant brand graphics to Nila Foods' approved palette (Nila Green, Millet Gold, Cream, Charcoal). Detected off-palette color #FF00FF.",
          suggested_correction: "Replace with nearest approved brand color Nila Green (#2E7D4F).",
          confidence: 1.0,
          verification_status: "verified_clause",
          evidence_source: "Clause 5.4 Approved Brand Color Palette",
          decision_status: "pending",
          engine_source: "image_analysis",
          created_at: new Date().toISOString(),
        });
        score -= 12;
      }

      imageAnalysis = {
        format: "PNG",
        dimensions: { width: 400, height: 300 },
        alt_text: cleanAlt,
        alt_text_pass: altFinding === null,
        dominant_colors: isNonCompliant ? [
          { hex: "#FF00FF", rgb: [255, 0, 255], percentage: 70.0, closest_approved: { name: "Nila Green", hex: "#2E7D4F", delta_e: 82.4 } },
          { hex: "#990099", rgb: [153, 0, 153], percentage: 30.0, closest_approved: { name: "Charcoal", hex: "#2B2B2B", delta_e: 64.1 } }
        ] : [
          { hex: "#2E7D4F", rgb: [46, 125, 79], percentage: 65.0, closest_approved: { name: "Nila Green", hex: "#2E7D4F", delta_e: 0.0 } },
          { hex: "#FFF8EC", rgb: [255, 248, 236], percentage: 35.0, closest_approved: { name: "Cream", hex: "#FFF8EC", delta_e: 0.0 } }
        ],
        contrast_ratio: contrastRatio,
        contrast_pass: contrastPass,
        palette_pass: palettePass,
        disclaimer: "Image checks evaluate palette proximity and WCAG contrast. They do not perform optical character recognition. Contrast is estimated from dominant colors unless text/background colors are explicitly picked."
      };
    }

    const review: ContentReview = {
      id: Date.now(),
      title,
      original_content: content,
      current_content: content,
      source_file_type: imageData ? "image" : "text",
      image_filename: imageFilename,
      image_url: imageData,
      image_alt_text: imageAltText,
      image_analysis: imageAnalysis,
      status: findings.length > 0 ? "in_review" : "approved",
      author_id: this.currentUser.id,
      author_name: this.currentUser.full_name,
      reviewer_id: 2,
      reviewer_name: "Ananya Deshmukh",
      overall_score: Math.max(0, score),
      has_critical_violations: hasCritical,
      requires_human_attention: findings.length > 0,
      review_notes:
        findings.length > 0
          ? `Pipeline flagged ${findings.length} findings requiring resolution.`
          : "100% compliant. All clauses and registered facts validated.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      findings,
      revisions: [
        {
          id: 1,
          revision_number: 1,
          content,
          diff_summary: "Initial submission",
          change_type: "initial_submission",
          created_at: new Date().toISOString(),
          created_by_name: this.currentUser.full_name,
        },
      ],
      comments: [],
      approvals: [],
    };

    this.reviews.unshift(review);
    return review;
  }
}

const mockStore = new MockDataStore();

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 20000
): Promise<T> {
  // If in demo mode, route directly to the client mock store
  if (activeEngineMode === "demo") {
    return handleMockRequest<T>(endpoint, options);
  }

  // Real backend mode
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("brandproof:session_expired", {
            detail: "Your session expired",
          })
        );
      }
      throw new Error("Your session expired");
    }

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const errData = await res.json();
        if (errData?.error?.message) {
          errorMsg = errData.error.message;
        } else if (errData?.detail) {
          errorMsg =
            typeof errData.detail === "string"
              ? errData.detail
              : JSON.stringify(errData.detail);
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and retry.");
    }
    throw err;
  }
}

function handleMockRequest<T>(endpoint: string, options: RequestInit): T {
  const method = options.method || "GET";

  // Auth
  if (endpoint === "/api/auth/me") {
    return mockStore.currentUser as unknown as T;
  }
  if (endpoint === "/api/auth/demo-users") {
    return { users: mockDemoUsers } as unknown as T;
  }
  if (endpoint === "/api/auth/login") {
    let email = "creator@nilafoods.com";
    if (options.body && typeof options.body === "string") {
      try {
        const parsed = JSON.parse(options.body);
        email = parsed.email || email;
      } catch (_) {}
    }
    const matched =
      mockDemoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
      mockDemoUsers[0];
    mockStore.setCurrentUser(matched);
    setToken(`demo-token-${matched.id}`);
    return {
      access_token: `demo-token-${matched.id}`,
      user: matched,
    } as unknown as T;
  }

  // Dashboard
  if (endpoint === "/api/analytics/dashboard") {
    return mockDashboardMetrics as unknown as T;
  }

  // Reviews
  if (endpoint.startsWith("/api/reviews/submit")) {
    let data: any = {
      title: "Content Review",
      content:
        "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.",
    };
    if (options.body && typeof options.body === "string") {
      try {
        data = JSON.parse(options.body);
      } catch (_) {}
    }
    const review = mockStore.runVerification(
      data.content,
      data.title,
      data.image_data,
      data.image_filename,
      data.image_alt_text
    );
    return review as unknown as T;
  }

  if (endpoint.startsWith("/api/reviews/upload")) {
    const review = mockStore.runVerification(
      "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.",
      "Uploaded Marketing Draft"
    );
    return review as unknown as T;
  }

  if (endpoint.includes("/findings/") && endpoint.endsWith("/action")) {
    // Action on finding
    const match = endpoint.match(/\/api\/reviews\/(\d+)\/findings\/(\d+)\/action/);
    const reviewId = match ? parseInt(match[1]) : 101;
    const findingId = match ? parseInt(match[2]) : 1;
    const review =
      mockStore.reviews.find((r) => r.id === reviewId) || mockStore.reviews[0];

    let action = "accept";
    let editedText = "";
    let rejectReason = "";
    let rejectNote = "";
    if (options.body && typeof options.body === "string") {
      try {
        const bodyObj = JSON.parse(options.body);
        action = bodyObj.action;
        editedText = bodyObj.edited_text;
        rejectReason = bodyObj.reject_reason;
        rejectNote = bodyObj.reject_note;
      } catch (_) {}
    }

    if (review) {
      const finding = review.findings.find((f) => f.id === findingId);
      if (finding) {
        finding.decision_status = action === "accept" ? "accepted" : action === "edit" ? "edited" : "rejected";
        if (action === "edit" && editedText) {
          finding.edited_correction = editedText;
        }
        if (action === "reject") {
          finding.reject_reason = rejectReason || "False positive";
          finding.reject_note = rejectNote;
        }

        // Apply replacement to review current_content
        const replacement =
          action === "edit" && editedText
            ? editedText
            : action === "accept" && finding.suggested_correction
            ? finding.suggested_correction
            : "";

        if (replacement && finding.original_text) {
          review.current_content = review.current_content.replace(
            finding.original_text,
            replacement
          );
        }

        // Check if all findings are resolved
        const pendingCount = review.findings.filter(
          (f) => f.decision_status === "pending"
        ).length;

        if (pendingCount === 0) {
          review.overall_score = 100;
          review.has_critical_violations = false;
          review.requires_human_attention = false;
        } else {
          review.overall_score = Math.min(
            100,
            review.overall_score + (finding.severity === "critical" ? 22 : 12)
          );
        }

        mockStore.auditLogs.unshift({
          id: Date.now(),
          user_name: mockStore.currentUser.full_name,
          user_email: mockStore.currentUser.email,
          action: `FINDING_${action.toUpperCase()}`,
          target_type: "ReviewFinding",
          target_id: finding.id,
          details: { action, original_text: finding.original_text, replacement },
          ip_address: "127.0.0.1",
          created_at: new Date().toISOString(),
        });

        review.revisions.push({
          id: review.revisions.length + 1,
          revision_number: review.revisions.length + 1,
          content: review.current_content,
          diff_summary: `${action.toUpperCase()} on finding: '${finding.original_text}' -> '${replacement}'`,
          change_type: "finding_remediation",
          created_at: new Date().toISOString(),
          created_by_name: mockStore.currentUser.full_name,
        });
      }
      return review as unknown as T;
    }
  }

  if (endpoint.includes("/comments")) {
    const match = endpoint.match(/\/api\/reviews\/(\d+)\/comments/);
    const reviewId = match ? parseInt(match[1]) : 101;
    const review =
      mockStore.reviews.find((r) => r.id === reviewId) || mockStore.reviews[0];
    let message = "";
    let findingId: number | undefined;
    let commentType: "general" | "finding" | "ask_manager" = "general";
    if (options.body && typeof options.body === "string") {
      try {
        const bodyObj = JSON.parse(options.body);
        message = bodyObj.message;
        findingId = bodyObj.finding_id;
        commentType = bodyObj.comment_type || "general";
      } catch (_) {}
    }
    const newComment: ReviewComment = {
      id: Date.now(),
      user_id: mockStore.currentUser.id,
      finding_id: findingId,
      comment_type: commentType,
      user_name: mockStore.currentUser.full_name,
      user_role: mockStore.currentUser.role,
      message: message || "Comment added.",
      created_at: new Date().toISOString(),
    };
    if (review) {
      review.comments.push(newComment);
      if (commentType === "ask_manager") {
        review.requires_human_attention = true;
      }
    }
    return newComment as unknown as T;
  }

  if (endpoint.includes("/decision")) {
    const match = endpoint.match(/\/api\/reviews\/(\d+)\/decision/);
    const reviewId = match ? parseInt(match[1]) : 101;
    const review =
      mockStore.reviews.find((r) => r.id === reviewId) || mockStore.reviews[0];
    let decision = "approved";
    let notes = "";
    if (options.body && typeof options.body === "string") {
      try {
        const bodyObj = JSON.parse(options.body);
        decision = bodyObj.decision;
        notes = bodyObj.notes;
      } catch (_) {}
    }
    if (review) {
      review.status = decision as any;
      review.approvals.push({
        id: Date.now(),
        user_id: mockStore.currentUser.id,
        user_name: mockStore.currentUser.full_name,
        decision,
        notes,
        decided_at: new Date().toISOString(),
      });
      mockStore.auditLogs.unshift({
        id: Date.now(),
        user_name: mockStore.currentUser.full_name,
        user_email: mockStore.currentUser.email,
        action: `REVIEW_${decision.toUpperCase()}`,
        target_type: "ContentReview",
        target_id: review.id,
        details: { decision, notes },
        ip_address: "127.0.0.1",
        created_at: new Date().toISOString(),
      });
    }
    return review as unknown as T;
  }

  if (endpoint.startsWith("/api/reviews/") && !endpoint.includes("?")) {
    const id = parseInt(endpoint.replace("/api/reviews/", ""));
    const review =
      mockStore.reviews.find((r) => r.id === id) || mockStore.reviews[0];
    return review as unknown as T;
  }

  if (endpoint.startsWith("/api/reviews")) {
    return mockStore.reviews as unknown as T;
  }

  // Guidelines
  if (endpoint === "/api/guidelines/") {
    return [
      {
        id: 1,
        title: "Nila Foods Brand & Marketing Compliance Guidelines",
        category: "Marketing & Communication",
        source_filename: "Nila_Brand_Guidelines_v2.docx",
        active_version: "2.0",
        clauses_count: mockStore.clauses.length,
      },
    ] as unknown as T;
  }

  if (endpoint.startsWith("/api/guidelines/clauses")) {
    return mockStore.clauses as unknown as T;
  }

  if (endpoint.startsWith("/api/guidelines/health")) {
    const includeDemo = !endpoint.includes("include_demo_history=false");
    return {
      kpis: {
        total_clauses: 5,
        unclear_clauses_count: 1,
        conflicting_pairs_count: 1,
        global_override_rate: 62.5,
        total_decisions_recorded: 12,
        has_demo_history: true,
        includes_demo_history: includeDemo,
      },
      clauses: [
        {
          clause_id: 4,
          clause_number: "3.6",
          title: "Unsubstantiated Guarantee",
          description: "Never make absolute claims or unprovable promises such as '100% cure', 'guaranteed results', or 'miracle'.",
          category: "Tone & Claims",
          severity: "warning",
          total_triggered: 8,
          total_decisions: 8,
          accepted_count: 2,
          edited_count: 2,
          rejected_count: 4,
          override_rate: 75.0,
          reasons_breakdown: {
            "Contextually permitted": 3,
            "Approved exception": 1,
            "Manually edited correction": 2
          },
          health_status: "unclear",
          is_unclear: true,
        },
        {
          clause_id: 2,
          clause_number: "3.4",
          title: "Superlative Claims",
          description: "Do not use 'India\\'s #1', 'Best in class', or similar rankings without independent audit source.",
          category: "Claims",
          severity: "warning",
          total_triggered: 5,
          total_decisions: 4,
          accepted_count: 3,
          edited_count: 1,
          rejected_count: 0,
          override_rate: 25.0,
          reasons_breakdown: { "Manually edited correction": 1 },
          health_status: "healthy",
          is_unclear: false,
        },
        {
          clause_id: 1,
          clause_number: "2.1",
          title: "Brand Name Formatting",
          description: "Use 'Nila Millet Mix', never 'Nila Millet-Mix' or lowercase.",
          category: "Terminology",
          severity: "critical",
          total_triggered: 6,
          total_decisions: 5,
          accepted_count: 5,
          edited_count: 0,
          rejected_count: 0,
          override_rate: 0.0,
          reasons_breakdown: {},
          health_status: "healthy",
          is_unclear: false,
        }
      ],
      conflicts: [
        {
          clause_a_number: "3.4",
          clause_a_title: "Superlative Claims",
          clause_b_number: "3.6",
          clause_b_title: "Unsubstantiated Guarantee",
          reviews_count: 4,
          review_ids: [101, 102, 103, 104],
          example_quotations: [
            {
              review_id: 101,
              review_title: "Market Dominance Campaign",
              overlapping_text: "India's #1 guaranteed health mix",
              clause_a_text: "India's #1 guaranteed",
              clause_b_text: "guaranteed health mix"
            }
          ]
        }
      ]
    } as unknown as T;
  }

  if (endpoint.includes("/backtest")) {
    let bodyObj: any = {};
    if (options.body && typeof options.body === "string") {
      try { bodyObj = JSON.parse(options.body); } catch (_) {}
    }
    return {
      clause_number: "3.6",
      original_title: "Unsubstantiated Guarantee",
      proposed_title: bodyObj.proposed_title || "Substantiated Outcome Claims",
      reviews_analyzed: 12,
      summary: {
        added: 1,
        removed: 5,
        unchanged: 1,
        net_difference: -4
      },
      examples: {
        added: [
          {
            review_id: 103,
            review_title: "Social Media Snippet",
            newly_flagged_text: "clinical research",
            explanation: "Flagged by proposed rule: 'clinical research'"
          }
        ],
        removed: [
          {
            review_id: 101,
            review_title: "Organic Morning",
            text_no_longer_flagged: "guaranteed to",
            explanation: "Permitted under revised criteria."
          }
        ]
      },
      notice: "Backtesting covers deterministic rule-based checks only against historical content drafts."
    } as unknown as T;
  }

  if (endpoint.includes("/publish-revision")) {
    let bodyObj: any = {};
    if (options.body && typeof options.body === "string") {
      try { bodyObj = JSON.parse(options.body); } catch (_) {}
    }
    return {
      success: true,
      new_version_id: 3,
      version_number: "3.0",
      changelog: bodyObj.changelog || "Revised clause criteria via Guideline Health Intelligence",
      clause_id: 4,
      clause_number: "3.6",
      document_id: 1
    } as unknown as T;
  }

  if (endpoint.startsWith("/api/guidelines/seed-demo-history")) {
    return { status: "ok", seeded_reviews: 12 } as unknown as T;
  }

  if (endpoint.startsWith("/api/guidelines/compare-versions")) {
    return {
      document_title: "Nila Foods Brand & Marketing Compliance Guidelines",
      v1: "1.0",
      v2: "2.0",
      diffs: [
        {
          clause_number: "2.1",
          type: "unchanged",
          v1: "Brand communication must remain warm, grounded, authentic, and informative. High-pressure sales triggers, aggressive urgency (such as 'Buy now', 'Hurry', 'Act fast'), and artificial scarcity are strictly prohibited.",
          v2: "Brand communication must remain warm, grounded, authentic, and informative. High-pressure sales triggers, aggressive urgency (such as 'Buy now', 'Hurry', 'Act fast'), and artificial scarcity are strictly prohibited.",
        },
        {
          clause_number: "3.4",
          type: "modified",
          v1: "Superlative claims (such as '#1', 'India\\'s best') require supporting retail audit or certification evidence.",
          v2: "Superlative claims (such as '#1', 'India\\'s best', 'top-ranked') require current, independently verifiable third-party certification or retail audit data. If supporting evidence has expired or does not substantiate the claim, the statement must be rejected.",
        },
        {
          clause_number: "3.6",
          type: "added",
          v1: null,
          v2: "Health guarantees or clinical therapeutic promises (e.g. 'Guaranteed to cut sugar cravings', 'cures fatigue') are strictly prohibited without licensed clinical certification. Product benefits must be framed around verifiable nutritional facts.",
        },
        {
          clause_number: "4.1",
          type: "added",
          v1: null,
          v2: "The approved, registered trademarked product title is 'Nila Millet Mix'. Hyphenated forms such as 'Millet-Mix' or uncapitalized variants are brand compliance violations.",
        },
        {
          clause_number: "5.2",
          type: "unchanged",
          v1: "All published digital media, packaging mockups, and images must include clear, descriptive alternative text for screen readers and accessibility conformance.",
          v2: "All published digital media, packaging mockups, and images must include clear, descriptive alternative text for screen readers and accessibility conformance.",
        },
      ],
    } as unknown as T;
  }

  // Facts
  if (endpoint.startsWith("/api/facts")) {
    return mockStore.facts as unknown as T;
  }

  // Terminology
  if (endpoint.startsWith("/api/terminology")) {
    return mockStore.terminology as unknown as T;
  }

  // Brand Assets
  if (endpoint.startsWith("/api/assets")) {
    return mockStore.assets as unknown as T;
  }

  // Audit Logs & Chain Verification
  if (endpoint === "/api/audit/verify") {
    return {
      valid: true,
      entries: mockStore.auditLogs.length,
      head: "a8fbc73109a12c48e8e7c2035129ef90b7931c801e0ad8f203875ec01923ab91",
      first_broken_entry: null,
    } as unknown as T;
  }

  if (endpoint === "/api/audit/ai-calls") {
    return [] as unknown as T;
  }

  if (endpoint.startsWith("/api/audit")) {
    return mockStore.auditLogs as unknown as T;
  }

  // Redaction Preview
  if (endpoint.startsWith("/api/reviews/redaction-preview")) {
    let text = "";
    if (options.body && typeof options.body === "string") {
      try {
        const parsed = JSON.parse(options.body);
        text = parsed.text || "";
      } catch (_) {}
    }
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g) || [];
    const phoneMatch = text.match(/(?:\+91[\s.-]?)?[6-9]\d{9}\b/g) || [];
    return {
      original_text: text,
      redacted_text: text
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, "[REDACTED_EMAIL_1]")
        .replace(/(?:\+91[\s.-]?)?[6-9]\d{9}\b/g, "[REDACTED_PHONE_1]"),
      counts: {
        email: emailMatch.length,
        phone: phoneMatch.length,
        currency: 0,
        digits: 0,
        bracketed: 0,
        terms: 0,
        total: emailMatch.length + phoneMatch.length,
      },
      tokens: [
        ...emailMatch.map((m) => ({ token: "[REDACTED_EMAIL_1]", type: "email", original: m })),
        ...phoneMatch.map((m) => ({ token: "[REDACTED_PHONE_1]", type: "phone", original: m })),
      ],
    } as unknown as T;
  }

  // Report Verification
  if (endpoint.includes("/verify-report") || endpoint === "/api/reports/verify") {
    const review = mockStore.reviews[0];
    return {
      matched: true,
      review_id: review?.id || 101,
      title: review?.title || "Product Launch Marketing Campaign",
      status: review?.status || "approved",
      score: review?.overall_score || 100,
      fingerprint: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      stored_fingerprint: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      message: "Cryptographic integrity verified. Record exactly matches database and tamper-evident audit ledger.",
    } as unknown as T;
  }

  // Users & Team
  if (endpoint.startsWith("/api/users")) {
    return mockStore.users as unknown as T;
  }

  // Settings
  if (endpoint === "/api/settings/workspace") {
    return {
      organization_name: "Nila Foods",
      slug: "nila-foods",
      tenant_isolation_mode: "Strict Tenant Scoping (Multi-Tenant Relational)",
      compliance_strictness: "High (No citation, no flag)",
      database_type: "SQLite (Production-ready PostgreSQL supported)",
    } as unknown as T;
  }

  if (endpoint === "/api/settings/ai-privacy") {
    return {
      zero_retention_guaranteed: true,
      training_on_customer_data: false,
      verification_engine: "Two-Tier: Deterministic Rule Engine + Verifier",
      fallback_offline_ready: true,
    } as unknown as T;
  }

  return {} as T;
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
    apiFetch<ContentReview[]>(
      `/api/reviews/${status ? `?status_filter=${status}` : ""}`
    ),
  getReview: (id: number) => apiFetch<ContentReview>(`/api/reviews/${id}`),
  submitReview: (data: {
    title: string;
    content: string;
    file_name?: string;
    file_type?: string;
    confidential_mode?: boolean;
    image_filename?: string;
    image_data?: string;
    image_alt_text?: string;
  }) =>
    apiFetch<ContentReview>("/api/reviews/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRedactionPreview: (text: string) =>
    apiFetch<RedactionPreviewResult>("/api/reviews/redaction-preview", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  getReportPdfUrl: (reviewId: number) =>
    `${API_BASE}/api/reviews/${reviewId}/report.pdf`,
  verifyReport: (query: string) =>
    apiFetch<ReportVerifyResult>("/api/reports/verify", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  uploadReviewFile: (formData: FormData) =>
    apiFetch<ContentReview>("/api/reviews/upload", {
      method: "POST",
      body: formData,
    }),
  handleFindingAction: (
    reviewId: number,
    findingId: number,
    action: "accept" | "edit" | "reject",
    options?: {
      editedText?: string;
      rejectReason?: string;
      rejectNote?: string;
    }
  ) =>
    apiFetch<ContentReview>(
      `/api/reviews/${reviewId}/findings/${findingId}/action`,
      {
        method: "POST",
        body: JSON.stringify({
          action,
          edited_text: options?.editedText,
          reject_reason: options?.rejectReason,
          reject_note: options?.rejectNote,
        }),
      }
    ),
  addComment: (
    reviewId: number,
    message: string,
    findingId?: number,
    commentType?: "general" | "finding" | "ask_manager"
  ) =>
    apiFetch<ReviewComment>(`/api/reviews/${reviewId}/comments`, {
      method: "POST",
      body: JSON.stringify({
        message,
        finding_id: findingId,
        comment_type: commentType || "general",
      }),
    }),
  assignReviewer: (reviewId: number, reviewerId: number) =>
    apiFetch<any>(
      `/api/reviews/${reviewId}/assign-reviewer?reviewer_id=${reviewerId}`,
      {
        method: "POST",
      }
    ),
  decideReview: (
    reviewId: number,
    decision: "approved" | "rejected" | "changes_requested",
    notes?: string
  ) =>
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
    return apiFetch<GuidelineClause[]>(
      `/api/guidelines/clauses?${params.toString()}`
    );
  },
  updateClause: (id: number, data: Partial<GuidelineClause>) =>
    apiFetch<GuidelineClause>(`/api/guidelines/clauses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  compareVersions: (docId: number, v1: string, v2: string) =>
    apiFetch<any>(
      `/api/guidelines/compare-versions?doc_id=${docId}&v1=${v1}&v2=${v2}`
    ),
  uploadGuidelineFile: (formData: FormData) =>
    apiFetch<any>("/api/guidelines/upload", {
      method: "POST",
      body: formData,
    }),
  getGuidelineHealth: (includeDemoHistory: boolean = true) =>
    apiFetch<GuidelineHealthResponse>(
      `/api/guidelines/health?include_demo_history=${includeDemoHistory}`
    ),
  backtestClause: (clauseId: number, data: any) =>
    apiFetch<ClauseBacktestResult>(
      `/api/guidelines/clauses/${clauseId}/backtest`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  publishRevisedClause: (clauseId: number, data: any) =>
    apiFetch<ClausePublishResult>(
      `/api/guidelines/clauses/${clauseId}/publish-revision`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  seedDemoHistory: () =>
    apiFetch<any>("/api/guidelines/seed-demo-history", { method: "POST" }),

  // Facts
  getFacts: (status?: string) =>
    apiFetch<ApprovedFact[]>(
      `/api/facts/${status ? `?status_filter=${status}` : ""}`
    ),
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
    apiFetch<AuditLog[]>(
      `/api/audit/${actionFilter ? `?action_filter=${actionFilter}` : ""}`
    ),
  verifyAuditChain: () =>
    apiFetch<AuditVerifyResult>("/api/audit/verify"),
  getAICalls: () =>
    apiFetch<AICallLogEntry[]>("/api/audit/ai-calls"),

  // Users & Team
  getUsers: () => apiFetch<User[]>("/api/users/"),
  updateUserRole: (userId: number, role: string) =>
    apiFetch<any>(`/api/users/${userId}/role?new_role=${role}`, {
      method: "PUT",
    }),

  // Settings
  getWorkspaceSettings: () => apiFetch<any>("/api/settings/workspace"),
  updateWorkspaceSettings: (data: any) =>
    apiFetch<any>("/api/settings/workspace", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getAIPrivacySettings: () => apiFetch<any>("/api/settings/ai-privacy"),
};
