import {
  User,
  ContentReview,
  GuidelineClause,
  ApprovedFact,
  Terminology,
  BrandAsset,
  DashboardMetrics,
  AuditLog,
  ReviewFinding,
} from "./api";

export const mockDemoUsers: User[] = [
  {
    id: 1,
    email: "creator@nilafoods.com",
    full_name: "Arjun Mehta",
    role: "Creator",
    organization_id: 1,
    organization_name: "Nila Foods",
    is_active: true,
  },
  {
    id: 2,
    email: "reviewer@nilafoods.com",
    full_name: "Ananya Deshmukh",
    role: "Reviewer",
    organization_id: 1,
    organization_name: "Nila Foods",
    is_active: true,
  },
  {
    id: 3,
    email: "manager@nilafoods.com",
    full_name: "Vikram Patel",
    role: "Manager",
    organization_id: 1,
    organization_name: "Nila Foods",
    is_active: true,
  },
  {
    id: 4,
    email: "admin@nilafoods.com",
    full_name: "Priya Sharma",
    role: "Admin",
    organization_id: 1,
    organization_name: "Nila Foods",
    is_active: true,
  },
];

export const mockClauses: GuidelineClause[] = [
  {
    id: 1,
    clause_number: "2.1",
    title: "Brand Tone & Consumer Respect",
    description:
      "Brand communication must remain warm, grounded, authentic, and informative. High-pressure sales triggers, aggressive urgency (such as 'Buy now', 'Hurry', 'Act fast'), and artificial scarcity are strictly prohibited.",
    category: "Brand Voice",
    severity: "warning",
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 2,
    clause_number: "3.4",
    title: "Superlative & Ranking Claims",
    description:
      "Superlative claims (such as '#1', 'India's best', 'top-ranked') require current, independently verifiable third-party certification or retail audit data. If supporting evidence has expired or does not substantiate the claim, the statement must be rejected.",
    category: "Claims & Advertising",
    severity: "critical",
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 3,
    clause_number: "3.6",
    title: "Health & Therapeutic Claims",
    description:
      "Health guarantees or clinical therapeutic promises (e.g. 'Guaranteed to cut sugar cravings', 'cures fatigue') are strictly prohibited without licensed clinical certification. Product benefits must be framed around verifiable nutritional facts.",
    category: "Health & Nutrition",
    severity: "critical",
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 4,
    clause_number: "4.1",
    title: "Product Terminology & Naming",
    description:
      "The approved, registered trademarked product title is 'Nila Millet Mix'. Hyphenated forms such as 'Millet-Mix' or uncapitalized variants are brand compliance violations.",
    category: "Terminology",
    severity: "critical",
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 5,
    clause_number: "5.2",
    title: "Accessibility and Media Alt Text",
    description:
      "All published digital media, packaging mockups, and images must include clear, descriptive alternative text for screen readers and accessibility conformance.",
    category: "Accessibility",
    severity: "warning",
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
  },
];

export const mockFacts: ApprovedFact[] = [
  {
    id: 1,
    fact_code: "F-07",
    statement: "Top 3 in breakfast cereal category (Retail Audit 2024)",
    description:
      "NielsenIQ Retail Audit 2024 ranked Nila Foods in the top 3 urban breakfast cereal segment.",
    source_evidence: "NielsenIQ Retail Audit Report #NIQ-2024-CEREAL-Q3",
    responsible_owner: "Market Intelligence Lead",
    approval_status: "expired",
    effective_date: "2024-01-01T00:00:00Z",
    expiry_date: "2025-12-31T23:59:59Z",
    last_verified_date: "2025-01-10T00:00:00Z",
    is_expired: true,
    days_until_expiry: -309,
  },
  {
    id: 2,
    fact_code: "F-12",
    statement:
      "Made with 5 whole millets (Foxtail, Ragi, Bajra, Jowar, Little Millet)",
    description:
      "Certified formulation containing 100% whole grain millets sourced directly from organic farmer cooperatives.",
    source_evidence:
      "Laboratory Formulation Certificate & Organic Board Cert #ORG-MIL-2025-089",
    responsible_owner: "R&D Quality Director",
    approval_status: "approved",
    effective_date: "2025-01-01T00:00:00Z",
    expiry_date: "2027-12-31T23:59:59Z",
    last_verified_date: "2026-02-01T00:00:00Z",
    is_expired: false,
    days_until_expiry: 421,
  },
  {
    id: 3,
    fact_code: "F-15",
    statement: "Certified gluten-free facility (Audit ISO-22000)",
    description:
      "Manufacturing plant zero-cross-contamination certification for allergen and gluten control.",
    source_evidence: "SGS Audit Certificate #SGS-GF-2025-442",
    responsible_owner: "Plant Quality Manager",
    approval_status: "approved",
    effective_date: "2025-06-01T00:00:00Z",
    expiry_date: "2026-11-30T23:59:59Z",
    last_verified_date: "2026-01-15T00:00:00Z",
    is_expired: false,
    days_until_expiry: 25,
  },
];

export const mockTerminology: Terminology[] = [
  {
    id: 1,
    preferred_term: "Nila Millet Mix",
    prohibited_term: "Millet-Mix",
    incorrect_variations: ["Millet-Mix", "millet mix", "MilletMix", "Nila Millet-Mix"],
    approved_alternatives: ["Nila Millet Mix", "the millet mix formulation"],
    case_sensitive: false,
    notes:
      "Hyphenated 'Millet-Mix' dilutes trademark protection. Always use full title 'Nila Millet Mix'.",
  },
];

export const mockAssets: BrandAsset[] = [
  {
    id: 1,
    title: "Nila Foods Official Hex-Shield Logo",
    asset_type: "Logo Vector",
    file_url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=600",
    alt_text: "Nila Foods dark teal verification seal logo with precision checkmark and hex border",
    guidelines_notes: "Approved for header, hero, and packaging seals.",
    status: "conforming",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: 2,
    title: "Nila Millet Mix 500g Packaging Render",
    asset_type: "Product Mockup",
    file_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
    alt_text: "",
    guidelines_notes:
      "Warning: Alt text missing. Screen-reader accessibility audit requires remediation before publication.",
    status: "alt_text_missing",
    created_at: "2025-02-01T12:00:00Z",
  },
];

export const initialReview: ContentReview = {
  id: 101,
  title: "Q1 Multi-Channel Launch Copy (Test Draft)",
  original_content:
    "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.",
  current_content:
    "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.",
  source_file_type: "text",
  status: "in_review",
  author_id: 1,
  author_name: "Arjun Mehta",
  reviewer_id: 2,
  reviewer_name: "Ananya Deshmukh",
  overall_score: 25,
  has_critical_violations: true,
  requires_human_attention: true,
  review_notes:
    "Automated pipeline detected 3 critical violations (Clause 4.1, Clause 3.4 with expired Fact F-07, Clause 3.6) and 1 tone warning (Clause 2.1).",
  created_at: "2026-11-05T10:15:00Z",
  updated_at: "2026-11-05T10:15:00Z",
  findings: [
    {
      id: 1,
      review_id: 101,
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
      created_at: "2026-11-05T10:15:00Z",
    },
    {
      id: 2,
      review_id: 101,
      clause_id: 2,
      clause_number: "3.4",
      fact_id: 1,
      fact_code: "F-07",
      title: "Unverified Superlative Claim 'India's #1' (Expired Fact F-07)",
      original_text: "India's #1",
      severity: "critical",
      explanation:
        "Clause 3.4 strictly prohibits ranking superlatives without active proof. Referenced audit Fact F-07 expired on Dec 31, 2025.",
      suggested_correction: "one of India's leading wholesome breakfasts",
      confidence: 0.98,
      verification_status: "expired_fact_detected",
      evidence_source: "Clause 3.4 & Approved Fact F-07 (Expired)",
      decision_status: "pending",
      created_at: "2026-11-05T10:15:00Z",
    },
    {
      id: 3,
      review_id: 101,
      clause_id: 3,
      clause_number: "3.6",
      title: "Prohibited Health Guarantee 'Guaranteed to cut sugar cravings'",
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
      created_at: "2026-11-05T10:15:00Z",
    },
    {
      id: 4,
      review_id: 101,
      clause_id: 1,
      clause_number: "2.1",
      title: "High-Pressure Urgency 'Buy now.'",
      original_text: "Buy now.",
      severity: "warning",
      explanation:
        "Clause 2.1 requires brand communication to remain respectful and informative. Aggressive sales triggers are prohibited.",
      suggested_correction: "Explore our wholesome breakfast range today.",
      confidence: 0.92,
      verification_status: "verified_clause",
      evidence_source: "Clause 2.1 Brand Voice & Tone",
      decision_status: "pending",
      created_at: "2026-11-05T10:15:00Z",
    },
  ],
  revisions: [
    {
      id: 1,
      revision_number: 1,
      content:
        "Nila Millet-Mix is India's #1 healthy breakfast! Guaranteed to cut sugar cravings. Buy now.",
      diff_summary: "Initial draft submission",
      change_type: "initial_submission",
      created_at: "2026-11-05T10:15:00Z",
      created_by_name: "Arjun Mehta",
    },
  ],
  comments: [
    {
      id: 1,
      user_id: 2,
      user_name: "Ananya Deshmukh",
      user_role: "Reviewer",
      message:
        "Please accept the automated suggestions. Specifically, replace the expired F-07 ranking claim and remove the medical guarantee before sign-off.",
      created_at: "2026-11-05T10:20:00Z",
    },
  ],
  approvals: [],
};

export const mockDashboardMetrics: DashboardMetrics = {
  total_reviews: 14,
  reviews_in_progress: 3,
  approved_submissions: 9,
  submissions_requiring_attention: 2,
  compliance_average: 84.5,
  total_clauses: 5,
  total_approved_facts: 3,
  expired_facts_count: 1,
  recent_activity: [
    {
      id: 1,
      action: "Review Finding Flagged",
      user: "System Verifier",
      time: "10 mins ago",
      details: "Clause 3.4 violation: Fact F-07 expired.",
    },
    {
      id: 2,
      action: "Submission Approved",
      user: "Vikram Patel",
      time: "1 hour ago",
      details: "Approved 'Foxtail Millet Nutrition Label 2026'.",
    },
    {
      id: 3,
      action: "Guideline Audited",
      user: "Priya Sharma",
      time: "3 hours ago",
      details: "Clause 4.1 updated with registered trademark notes.",
    },
  ],
  frequently_triggered_clauses: [
    { clause: "Clause 4.1 (Product Naming)", count: 18, severity: "critical" },
    { clause: "Clause 3.4 (Superlative Claims)", count: 14, severity: "critical" },
    { clause: "Clause 2.1 (Tone & Urgency)", count: 9, severity: "warning" },
    { clause: "Clause 3.6 (Health Guarantees)", count: 6, severity: "critical" },
    { clause: "Clause 5.2 (Media Alt Text)", count: 4, severity: "warning" },
  ],
  pending_approvals: [
    {
      id: 101,
      title: "Q1 Multi-Channel Launch Copy (Test Draft)",
      author: "Arjun Mehta",
      score: 25,
      submitted: "Today, 10:15 AM",
    },
  ],
  status_distribution: {
    Approved: 9,
    InReview: 3,
    Rejected: 2,
  },
};

export const mockAuditLogs: AuditLog[] = [
  {
    id: 1,
    user_name: "Arjun Mehta",
    user_email: "creator@nilafoods.com",
    action: "CONTENT_SUBMISSION",
    target_type: "review",
    target_id: 101,
    details: { title: "Q1 Multi-Channel Launch Copy" },
    ip_address: "127.0.0.1",
    created_at: "2026-11-05T10:15:00Z",
  },
  {
    id: 2,
    user_name: "Automated Verifier",
    user_email: "verifier@brandproof.internal",
    action: "PIPELINE_VERIFICATION",
    target_type: "review",
    target_id: 101,
    details: {
      flags_count: 4,
      critical_count: 3,
      expired_fact_detected: true,
      score: 25,
    },
    ip_address: "127.0.0.1",
    created_at: "2026-11-05T10:15:05Z",
  },
  {
    id: 3,
    user_name: "Ananya Deshmukh",
    user_email: "reviewer@nilafoods.com",
    action: "REVIEW_COMMENT_ADDED",
    target_type: "review",
    target_id: 101,
    details: { note: "Requested revision on expired claims" },
    ip_address: "127.0.0.1",
    created_at: "2026-11-05T10:20:00Z",
  },
];
