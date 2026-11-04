import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, GuidelineDocument, GuidelineVersion, GuidelineClause, AuditLog
from backend.auth import get_current_user, require_roles
from backend.schemas import (
    GuidelineDocumentOut, GuidelineClauseOut, GuidelineClauseCreate,
    GuidelineClauseUpdate, GuidelineVersionOut
)
from backend.document_parser import DocumentParser

router = APIRouter(prefix="/api/guidelines", tags=["Brand Guidelines"])

@router.get("/", response_model=List[GuidelineDocumentOut])
def list_guidelines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = (
        db.query(GuidelineDocument)
        .filter(GuidelineDocument.organization_id == current_user.organization_id)
        .order_by(GuidelineDocument.created_at.desc())
        .all()
    )
    return docs

@router.get("/clauses", response_model=List[GuidelineClauseOut])
def list_active_clauses(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(GuidelineClause).filter(
        GuidelineClause.organization_id == current_user.organization_id,
        GuidelineClause.status == "active"
    )
    if category:
        query = query.filter(GuidelineClause.category == category)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (GuidelineClause.title.ilike(search_fmt)) |
            (GuidelineClause.clause_number.ilike(search_fmt)) |
            (GuidelineClause.description.ilike(search_fmt))
        )
    return query.order_by(GuidelineClause.clause_number.asc()).all()

@router.post("/upload")
async def upload_guideline_document(
    title: str = Form(...),
    category: str = Form("General"),
    version_number: str = Form("1.0"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    extracted_text, file_type = DocumentParser.extract_text_from_bytes(contents, file.filename)

    doc = GuidelineDocument(
        organization_id=current_user.organization_id,
        title=title,
        category=category,
        source_filename=file.filename,
        file_type=file_type,
        extracted_text=extracted_text
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    ver = GuidelineVersion(
        document_id=doc.id,
        version_number=version_number,
        changelog=f"Imported from {file.filename}",
        is_active=True
    )
    db.add(ver)
    db.commit()
    db.refresh(ver)

    # Basic clause extractor for structured text
    lines = extracted_text.splitlines()
    extracted_clauses = 0
    import re
    clause_regex = re.compile(r"^(?:Clause\s+)?(\d+\.\d+)\s*[:\-–]?\s*(.+)$", re.IGNORECASE)

    for i, line in enumerate(lines):
        line_clean = line.strip()
        match = clause_regex.match(line_clean)
        if match:
            c_num = match.group(1)
            c_title = match.group(2).strip()
            # grab subsequent lines as description until empty line
            desc_lines = []
            for next_line in lines[i+1:i+6]:
                if next_line.strip() and not clause_regex.match(next_line.strip()):
                    desc_lines.append(next_line.strip())
                else:
                    break
            desc = " ".join(desc_lines) if desc_lines else c_title

            new_c = GuidelineClause(
                version_id=ver.id,
                organization_id=current_user.organization_id,
                clause_number=c_num,
                title=c_title,
                description=desc,
                category=category,
                severity="warning",
                status="active"
            )
            db.add(new_c)
            extracted_clauses += 1

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPLOAD_GUIDELINE_DOCUMENT",
        target_type="GuidelineDocument",
        target_id=doc.id,
        details={"filename": file.filename, "extracted_clauses": extracted_clauses}
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Successfully processed {file.filename}.",
        "document_id": doc.id,
        "extracted_clauses": extracted_clauses,
        "extracted_preview": extracted_text[:400]
    }

@router.post("/clauses", response_model=GuidelineClauseOut)
def create_clause(
    payload: GuidelineClauseCreate,
    current_user: User = Depends(require_roles(["Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    doc = db.query(GuidelineDocument).filter(
        GuidelineDocument.organization_id == current_user.organization_id
    ).first()
    if not doc:
        doc = GuidelineDocument(
            organization_id=current_user.organization_id,
            title="Standard Brand Guidelines",
            category="General"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    ver = db.query(GuidelineVersion).filter(
        GuidelineVersion.document_id == doc.id,
        GuidelineVersion.is_active == True
    ).first()
    if not ver:
        ver = GuidelineVersion(document_id=doc.id, version_number="1.0", is_active=True)
        db.add(ver)
        db.commit()
        db.refresh(ver)

    clause = GuidelineClause(
        version_id=ver.id,
        organization_id=current_user.organization_id,
        clause_number=payload.clause_number,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        rules_json=payload.rules_json,
        status="active"
    )
    db.add(clause)
    db.commit()
    db.refresh(clause)
    return clause

@router.put("/clauses/{clause_id}", response_model=GuidelineClauseOut)
def update_clause(
    clause_id: int,
    payload: GuidelineClauseUpdate,
    current_user: User = Depends(require_roles(["Admin", "Manager"])),
    db: Session = Depends(get_db)
):
    clause = db.query(GuidelineClause).filter(
        GuidelineClause.id == clause_id,
        GuidelineClause.organization_id == current_user.organization_id
    ).first()
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    if payload.title is not None:
        clause.title = payload.title
    if payload.description is not None:
        clause.description = payload.description
    if payload.category is not None:
        clause.category = payload.category
    if payload.severity is not None:
        clause.severity = payload.severity
    if payload.status is not None:
        clause.status = payload.status
    if payload.rules_json is not None:
        clause.rules_json = payload.rules_json

    db.commit()
    db.refresh(clause)
    return clause

@router.get("/compare-versions")
def compare_versions(
    doc_id: int,
    v1: str,
    v2: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(GuidelineDocument).filter(
        GuidelineDocument.id == doc_id,
        GuidelineDocument.organization_id == current_user.organization_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    ver1 = db.query(GuidelineVersion).filter(
        GuidelineVersion.document_id == doc.id,
        GuidelineVersion.version_number == v1
    ).first()
    ver2 = db.query(GuidelineVersion).filter(
        GuidelineVersion.document_id == doc.id,
        GuidelineVersion.version_number == v2
    ).first()

    clauses_v1 = {c.clause_number: c.description for c in ver1.clauses} if ver1 else {}
    clauses_v2 = {c.clause_number: c.description for c in ver2.clauses} if ver2 else {}

    diffs = []
    all_keys = sorted(list(set(list(clauses_v1.keys()) + list(clauses_v2.keys()))))
    for k in all_keys:
        in_v1 = k in clauses_v1
        in_v2 = k in clauses_v2
        if in_v1 and not in_v2:
            diffs.append({"clause_number": k, "type": "removed", "v1": clauses_v1[k], "v2": None})
        elif not in_v1 and in_v2:
            diffs.append({"clause_number": k, "type": "added", "v1": None, "v2": clauses_v2[k]})
        elif clauses_v1[k] != clauses_v2[k]:
            diffs.append({"clause_number": k, "type": "modified", "v1": clauses_v1[k], "v2": clauses_v2[k]})
        else:
            diffs.append({"clause_number": k, "type": "unchanged", "v1": clauses_v1[k], "v2": clauses_v2[k]})

    return {
        "document_title": doc.title,
        "v1": v1,
        "v2": v2,
        "diffs": diffs
    }

