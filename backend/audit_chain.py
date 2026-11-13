import json
import hashlib
import datetime
from typing import Dict, Any, Optional, Tuple
from sqlalchemy import select, event
from sqlalchemy.orm import Session
from backend.models import AuditLog

def canonical_entry_dict(log: AuditLog) -> Dict[str, Any]:
    created_str = log.created_at.isoformat() if isinstance(log.created_at, datetime.datetime) else str(log.created_at)
    return {
        "id": log.id,
        "organization_id": log.organization_id,
        "user_id": log.user_id,
        "action": log.action,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "details": log.details or {},
        "ip_address": log.ip_address,
        "created_at": created_str,
    }

def compute_entry_hash(entry_data: Dict[str, Any], prev_hash: Optional[str]) -> str:
    canonical_json = json.dumps(entry_data, sort_keys=True, separators=(',', ':'), default=str)
    payload = f"{canonical_json}|{prev_hash or 'GENESIS'}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def record_audit_log(
    db: Session,
    organization_id: int,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
    ip_address: str = "127.0.0.1"
) -> AuditLog:
    # Must append inside transaction per organization so the chain cannot fork
    last_entry = db.query(AuditLog).filter(
        AuditLog.organization_id == organization_id
    ).order_by(AuditLog.id.desc()).first()
    prev_hash = last_entry.entry_hash if last_entry else None

    log_entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
        ip_address=ip_address,
        created_at=datetime.datetime.utcnow(),
        prev_hash=prev_hash
    )
    db.add(log_entry)
    db.flush() # assign log_entry.id

    entry_data = canonical_entry_dict(log_entry)
    entry_hash = compute_entry_hash(entry_data, prev_hash)
    log_entry.entry_hash = entry_hash
    db.flush()
    return log_entry

def backfill_audit_chain(db: Session) -> int:
    unhashed_count = db.query(AuditLog).filter(AuditLog.entry_hash.is_(None)).count()
    if unhashed_count == 0:
        return 0

    # Backfill per organization so each tenant maintains an isolated cryptographic hash chain
    org_ids = [r[0] for r in db.query(AuditLog.organization_id).distinct().all()]
    updated = 0
    for org_id in org_ids:
        org_logs = db.query(AuditLog).filter(AuditLog.organization_id == org_id).order_by(AuditLog.id.asc()).all()
        prev_hash = None
        for log in org_logs:
            expected_entry_data = canonical_entry_dict(log)
            computed_hash = compute_entry_hash(expected_entry_data, prev_hash)
            if log.prev_hash != prev_hash or log.entry_hash != computed_hash:
                log.prev_hash = prev_hash
                log.entry_hash = computed_hash
                updated += 1
            prev_hash = log.entry_hash
    db.commit()
    return updated

def verify_audit_chain(db: Session, organization_id: Optional[int] = None) -> Dict[str, Any]:
    if organization_id is not None:
        logs = db.query(AuditLog).filter(AuditLog.organization_id == organization_id).order_by(AuditLog.id.asc()).all()
        if not logs:
            return {
                "valid": True,
                "entries": 0,
                "head": None,
                "first_broken_entry": None
            }

        prev_hash = None
        for log in logs:
            if log.prev_hash != prev_hash:
                return {
                    "valid": False,
                    "entries": len(logs),
                    "head": prev_hash,
                    "first_broken_entry": log.id
                }
            
            entry_data = canonical_entry_dict(log)
            expected_hash = compute_entry_hash(entry_data, prev_hash)
            if log.entry_hash != expected_hash:
                return {
                    "valid": False,
                    "entries": len(logs),
                    "head": prev_hash,
                    "first_broken_entry": log.id
                }
            prev_hash = log.entry_hash

        return {
            "valid": True,
            "entries": len(logs),
            "head": prev_hash,
            "first_broken_entry": None
        }
    else:
        # Verify across all organizations
        org_ids = [r[0] for r in db.query(AuditLog.organization_id).distinct().all()]
        total_entries = 0
        last_head = None
        for org_id in org_ids:
            res = verify_audit_chain(db, organization_id=org_id)
            if not res["valid"]:
                return res
            total_entries += res["entries"]
            last_head = res["head"]
        return {
            "valid": True,
            "entries": total_entries,
            "head": last_head,
            "first_broken_entry": None
        }
