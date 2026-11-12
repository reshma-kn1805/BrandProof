import io
import json
import hashlib
import datetime
from typing import Tuple, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.models import ContentReview, AuditLog, AICallLog
from backend.audit_chain import verify_audit_chain

def compute_report_fingerprint(review_data: Dict[str, Any], audit_head: str) -> str:
    canonical_data = json.dumps(review_data, sort_keys=True, separators=(',', ':'), default=str)
    payload = f"{canonical_data}|{audit_head or 'NO_AUDIT_HEAD'}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def generate_pdf_report(review: ContentReview, db) -> Tuple[bytes, str]:
    # 1. Fetch audit chain head
    chain_info = verify_audit_chain(db, organization_id=review.organization_id)
    audit_head = chain_info.get("head") or "GENESIS_HEAD"

    # 2. Prepare structured report data for fingerprinting
    report_dict = {
        "review_id": review.id,
        "title": review.title,
        "status": review.status,
        "overall_score": review.overall_score,
        "original_content": review.original_content,
        "current_content": review.current_content,
        "has_critical_violations": review.has_critical_violations,
        "confidential_mode": review.confidential_mode,
        "redaction_summary": review.redaction_summary or {},
        "findings_count": len(review.findings or []),
        "comments_count": len(review.comments or []),
        "approvals_count": len(review.approvals or []),
    }
    fingerprint = compute_report_fingerprint(report_dict, audit_head)

    # 3. Build PDF with ReportLab
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'DocHeader',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    subhead_style = ParagraphStyle(
        'SubHeader',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    mono_style = ParagraphStyle(
        'MonoText',
        parent=styles['Code'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F8FAFC')
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#047857'),
        fontName='Helvetica-Bold'
    )

    elements = []

    # Title Banner
    elements.append(Paragraph("BRANDPROOF AUDIT & COMPLIANCE REPORT", header_style))
    elements.append(Paragraph(
        f"Evidence-First Governance Report &bull; Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        subhead_style
    ))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    # Review Overview Table
    overview_data = [
        [Paragraph("<b>Review Title:</b>", body_style), Paragraph(review.title or "Untitled", body_style),
         Paragraph("<b>Review ID:</b>", body_style), Paragraph(str(review.id), body_style)],
        [Paragraph("<b>Status:</b>", body_style), Paragraph(review.status.upper(), badge_style),
         Paragraph("<b>Compliance Score:</b>", body_style), Paragraph(f"<b>{review.overall_score:.1f} / 100</b>", body_style)],
        [Paragraph("<b>Author ID:</b>", body_style), Paragraph(str(review.author_id), body_style),
         Paragraph("<b>Source File:</b>", body_style), Paragraph(review.source_filename or "Direct Input (text)", body_style)],
        [Paragraph("<b>Confidential Mode:</b>", body_style), Paragraph("ENABLED" if review.confidential_mode else "DISABLED", body_style),
         Paragraph("<b>Critical Violations:</b>", body_style), Paragraph("YES" if review.has_critical_violations else "NO", body_style)],
    ]
    t_overview = Table(overview_data, colWidths=[110, 155, 110, 155])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_overview)
    elements.append(Spacer(1, 10))

    # Cryptographic Fingerprint Card
    fp_data = [
        [Paragraph("<b>CRYPTOGRAPHIC VERIFICATION FINGERPRINT</b>", badge_style)],
        [Paragraph(f"<b>Report Fingerprint (SHA-256):</b> <font face='Courier'>{fingerprint}</font>", mono_style)],
        [Paragraph(f"<b>Audit Chain Head Hash:</b> <font face='Courier'>{audit_head}</font>", mono_style)],
        [Paragraph("<i>This document's integrity is cryptographically linked to the tamper-evident audit ledger. Verify online at /verify-report</i>", body_style)]
    ]
    t_fp = Table(fp_data, colWidths=[530])
    t_fp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ECFDF5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#A7F3D0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_fp)
    elements.append(Spacer(1, 12))

    # Content: Before & After
    elements.append(Paragraph("1. Content Evolution (Before & After)", section_title))
    content_table_data = [
        [Paragraph("<b>Original Submitted Text</b>", body_style), Paragraph("<b>Current / Approved Text</b>", body_style)],
        [Paragraph(review.original_content.replace("\n", "<br/>"), mono_style),
         Paragraph(review.current_content.replace("\n", "<br/>"), mono_style)]
    ]
    t_content = Table(content_table_data, colWidths=[260, 270])
    t_content.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_content)
    elements.append(Spacer(1, 12))

    # Findings & Evidence
    elements.append(Paragraph(f"2. Findings & Evidence Citations ({len(review.findings or [])})", section_title))
    if not review.findings:
        elements.append(Paragraph("<i>No compliance findings recorded. Clean scan.</i>", body_style))
    else:
        finding_rows = [
            [Paragraph("<b>#</b>", body_style),
             Paragraph("<b>Flagged Span / Issue</b>", body_style),
             Paragraph("<b>Severity</b>", body_style),
             Paragraph("<b>Cited Clause / Fact</b>", body_style),
             Paragraph("<b>Status / Decision</b>", body_style)]
        ]
        for f in review.findings:
            clause_info = f"Clause {f.clause.clause_number}" if f.clause else ""
            fact_info = f"Fact {f.fact.fact_code}" if f.fact else ""
            citation = ", ".join(filter(None, [clause_info, fact_info])) or "General"
            
            status_text = f"<b>{f.decision_status.upper()}</b>"
            if f.reject_reason:
                status_text += f"<br/><font color='#b91c1c'>Reason: {f.reject_reason}</font>"
            
            finding_rows.append([
                Paragraph(str(f.id), body_style),
                Paragraph(f"<b>\"{f.original_text}\"</b><br/>{f.explanation}", body_style),
                Paragraph(f.severity.upper(), body_style),
                Paragraph(f"{citation}<br/><font color='#475569'>Verif: {f.verification_status}</font>", body_style),
                Paragraph(status_text, body_style)
            ])
        t_findings = Table(finding_rows, colWidths=[25, 205, 60, 130, 110])
        t_findings.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_findings)
    elements.append(Spacer(1, 12))

    # Decisions and Approvals
    elements.append(Paragraph("3. Approval Decisions & Governance", section_title))
    if not review.approvals:
        elements.append(Paragraph("<i>No formal approval decisions recorded yet.</i>", body_style))
    else:
        app_rows = [
            [Paragraph("<b>Decision</b>", body_style),
             Paragraph("<b>Deciding User ID</b>", body_style),
             Paragraph("<b>Timestamp</b>", body_style),
             Paragraph("<b>Notes</b>", body_style)]
        ]
        for a in review.approvals:
            dec_time = a.decided_at.strftime('%Y-%m-%d %H:%M:%S UTC') if a.decided_at else "N/A"
            app_rows.append([
                Paragraph(f"<b>{a.decision.upper()}</b>", badge_style),
                Paragraph(f"User #{a.user_id}", body_style),
                Paragraph(dec_time, body_style),
                Paragraph(a.notes or "-", body_style)
            ])
        t_app = Table(app_rows, colWidths=[100, 100, 140, 190])
        t_app.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_app)
    elements.append(Spacer(1, 12))

    # Confidential Mode & AI Disclosure
    elements.append(Paragraph("4. Confidential Mode & AI Services Disclosure", section_title))
    ai_calls = db.query(AICallLog).filter(AICallLog.review_id == review.id).all() if db else []
    
    redaction_counts = review.redaction_summary or {}
    redact_desc = (
        f"Redacted Elements: Email: {redaction_counts.get('email', 0)}, "
        f"Phone: {redaction_counts.get('phone', 0)}, "
        f"Currency: {redaction_counts.get('currency', 0)}, "
        f"Digits: {redaction_counts.get('digits', 0)}, "
        f"Confidential Terms: {redaction_counts.get('terms', 0)}, "
        f"Total Redactions: {redaction_counts.get('total', 0)}"
    ) if review.confidential_mode else "Confidential mode was not requested for this review."

    disclosure_rows = [
        [Paragraph("<b>Confidential Mode:</b>", body_style),
         Paragraph("<b>Active (PII & sensitive entities redacted prior to model calls)</b>" if review.confidential_mode else "Inactive", body_style)],
        [Paragraph("<b>Redaction Summary:</b>", body_style),
         Paragraph(redact_desc, body_style)],
        [Paragraph("<b>External AI Calls:</b>", body_style),
         Paragraph(f"{len(ai_calls)} calls recorded for this review (raw content never persisted in AI call log)." if ai_calls else "Zero external AI calls. Evaluated entirely via deterministic offline rule engine.", body_style)]
    ]
    t_disc = Table(disclosure_rows, colWidths=[130, 400])
    t_disc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_disc)
    elements.append(Spacer(1, 12))

    # Comments & Activity Feed
    elements.append(Paragraph(f"5. Comments & Activity Thread ({len(review.comments or [])})", section_title))
    if not review.comments:
        elements.append(Paragraph("<i>No comments recorded.</i>", body_style))
    else:
        comm_rows = [
            [Paragraph("<b>Time</b>", body_style),
             Paragraph("<b>Type / User</b>", body_style),
             Paragraph("<b>Message</b>", body_style)]
        ]
        for c in review.comments:
            c_time = c.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if c.created_at else "N/A"
            user_label = f"User #{c.user_id} ({c.comment_type})"
            comm_rows.append([
                Paragraph(c_time, body_style),
                Paragraph(user_label, body_style),
                Paragraph(c.message, body_style)
            ])
        t_comm = Table(comm_rows, colWidths=[120, 130, 280])
        t_comm.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_comm)

    # Build the PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes, fingerprint
