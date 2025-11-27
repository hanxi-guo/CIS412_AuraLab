"""Mock AI adapter for analysis results."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
import re
from typing import Any, Dict, List


def _find_sentences(text: str) -> List[str]:
    """Split text into sentences using simple punctuation rules."""
    # Split on sentence-ending punctuation followed by space or end of string
    pattern = r'(?<=[.!?])\s+|(?<=[.!?])$'
    sentences = re.split(pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def generate_feedback(snapshot: dict) -> Dict[str, Any]:
    """Return deterministic mock analysis data highlighting complete sentences."""
    caption: str = snapshot.get("caption", "") or ""
    
    if not caption.strip():
        return {
            "model": "mock-v1",
            "prompt_version": "1",
            "spans": [],
        }
    
    sentences = _find_sentences(caption)
    spans: List[Dict[str, Any]] = []
    
    for i, sentence in enumerate(sentences):
        if len(sentence) < 10:
            continue
            
        severity = "minor" if i % 2 == 0 else "major"
        
        if len(spans) >= 2:
            break
            
        spans.append({
            "severity": severity,
            "message": "Consider making this more engaging." if severity == "minor" 
                       else "This could be more impactful.",
            "text": sentence,
            "suggestions": [
                {
                    "text": f"Try rephrasing: {sentence[:50]}..." if len(sentence) > 50 else sentence,
                    "rationale": "A more concrete phrase increases engagement.",
                    "confidence": 0.7,
                    "style": "more engaging",
                }
            ],
        })
    
    return {
        "model": "mock-v1",
        "prompt_version": "1",
        "spans": spans,
    }
