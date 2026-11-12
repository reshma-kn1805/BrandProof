import re
from typing import List, Dict, Any
from backend.engine.text_replacer import apply_clean_replacement
from backend.engine.deterministic_engine import DeterministicEngine

def pre_check_suggestions(
    findings: List[Dict[str, Any]],
    content: str,
    evidence_ctx: Dict[str, Any],
    engine: DeterministicEngine
) -> List[Dict[str, Any]]:
    """
    Stage 5.5: Pre-Check Suggested Corrections.
    Before any suggested correction is shown:
    1. Apply it to a copy of the content.
    2. Re-run the rule engine on the candidate text.
    3. If it introduces a new violation, or introduces a number, ranking, or health claim
       not backed by an approved current fact:
       -> Mark the finding "Needs a human look" with NO rewrite.
    """
    active_facts = [f for f in evidence_ctx.get("facts", []) if not f.get("is_expired")]
    active_fact_statements = " ".join([f.get("statement", "").lower() for f in active_facts])

    # Base clause set in original content
    orig_clause_set = {str(f.get("clause_number")) for f in findings if f.get("clause_number")}

    for f in findings:
        corr = f.get("suggested_correction")
        orig_text = f.get("original_text")
        if not corr or not orig_text:
            continue

        withhold_rewrite = False
        withhold_reason = ""

        # 1. Apply to a copy of the text
        candidate_text = apply_clean_replacement(content, orig_text, corr)

        # 2. Re-run deterministic scan
        candidate_issues = engine.scan(candidate_text)
        candidate_clause_set = {str(ci.get("clause_number")) for ci in candidate_issues if ci.get("clause_number")}

        # Check for newly introduced clause violations
        newly_introduced = candidate_clause_set - orig_clause_set
        if newly_introduced:
            withhold_rewrite = True
            withhold_reason = f"Introduces violation of Clause {', '.join(newly_introduced)}."

        # 3. Check for unbacked ranking / superlative claims in correction
        if not withhold_rewrite:
            superlative_match = re.search(r'\b(#1|top\s+\d+|best|leader|first\s+in)\b', corr, re.IGNORECASE)
            if superlative_match:
                # Must be supported by an active fact
                matched_term = superlative_match.group(0).lower()
                if matched_term not in active_fact_statements:
                    withhold_rewrite = True
                    withhold_reason = f"Introduces ranking claim '{matched_term}' not backed by active facts."

        # 4. Check for unbacked health / medical guarantees in correction
        if not withhold_rewrite:
            health_match = re.search(r'\b(guaranteed|cures?|prevents?|clinically\s+proven|100%\s+health)\b', corr, re.IGNORECASE)
            if health_match:
                matched_term = health_match.group(0).lower()
                if matched_term not in active_fact_statements:
                    withhold_rewrite = True
                    withhold_reason = f"Introduces health guarantee '{matched_term}' not backed by regulatory approvals."

        # 5. Check for unbacked numbers in correction
        if not withhold_rewrite:
            numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', corr)
            for num in numbers:
                # Check if number appears in any active fact statement
                if num not in active_fact_statements:
                    withhold_rewrite = True
                    withhold_reason = f"Introduces unverified numerical claim '{num}' not backed by active facts."
                    break

        # Apply withholding if pre-check failed
        if withhold_rewrite:
            f["suggested_correction"] = None
            f["needs_human_look"] = True
            if "Needs a human look" not in f.get("title", ""):
                f["title"] = f"{f['title']} (Needs a human look)"
            f["explanation"] = f"{f.get('explanation', '')}\n\n[Pre-Check Guard]: Needs a human look. Automated rewrite withheld because the suggested text {withhold_reason}"

    return findings

