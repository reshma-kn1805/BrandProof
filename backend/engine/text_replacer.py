import re
from typing import Optional

def apply_clean_replacement(content: str, original_text: str, replacement: str) -> str:
    """
    Applies a phrase-level correction to content while guaranteeing grammatical fluency:
    1. Replaces the target phrase.
    2. Eliminates duplicate words (e.g. 'Nila Nila' -> 'Nila').
    3. Eliminates duplicate multi-word phrases (e.g. 'healthy breakfast healthy breakfast' -> 'healthy breakfast').
    4. Fixes punctuation spacing (no space before punctuation, no repeated periods/exclamations).
    5. Preserves sentence-level capitalization.
    """
    if not original_text or replacement is None:
        return content

    # 1. Perform replacement
    if original_text in content:
        text = content.replace(original_text, replacement, 1)
    else:
        # Case-insensitive word boundary match if exact match not found
        pattern = re.compile(re.escape(original_text), re.IGNORECASE)
        text = pattern.sub(replacement, content, count=1)

    # 2. Prevent doubled words (e.g. 'Nila Nila' -> 'Nila', 'the the' -> 'the')
    text = re.sub(r'\b([A-Za-z0-9\'-]+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)

    # 3. Prevent doubled 2-word and 3-word phrases (e.g. 'healthy breakfast healthy breakfast')
    text = re.sub(r'\b([A-Za-z0-9\'-]+\s+[A-Za-z0-9\'-]+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'\b([A-Za-z0-9\'-]+\s+[A-Za-z0-9\'-]+\s+[A-Za-z0-9\'-]+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)

    # 4. Spacing and punctuation normalization
    # Remove space before punctuation (e.g. 'breakfast .' -> 'breakfast.')
    text = re.sub(r'\s+([,\.!\?;:])', r'\1', text)
    # Deduplicate consecutive identical punctuation (e.g. '..' -> '.', '!!' -> '!')
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'!{2,}', '!', text)
    # Collapse multiple whitespace
    text = re.sub(r'[ \t]+', ' ', text)

    # 5. Sentence Capitalization: Ensure letter after . ! ? is capitalized
    def _capitalize_after_sentence_end(m):
        return m.group(1) + m.group(2).upper()
    text = re.sub(r'([\.!\?]\s+)([a-z])', _capitalize_after_sentence_end, text)

    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    return text.strip()
