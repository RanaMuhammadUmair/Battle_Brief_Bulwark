import os
import json
import re
from typing import Dict
from mistralai import Mistral

# cap tokens for judge responses
MAX_EVAL_TOKENS = 256

def evaluate_with_mistral_small(source_text: str, summary_text: str) -> Dict[str, int]:
    """
    Judge *summary_text* against *source_text* using Mistral’s `mistral-small` model.
    Returns a dict with facet scores 1–5 plus an overall score.
    """
    client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
    if not client:
        raise RuntimeError("Mistral client init failed – check your API key.")

    system_prompt = (
        "You are “NATO-Judge-v1”, an impartial military-intelligence reviewer. "
        "Evaluate the QUALITY of the SUMMARY relative to the SOURCE along four "
        "criteria:\n"
        "  1. CONSISTENCY\n"
        "  2. COVERAGE\n"
        "  3. COHERENCE\n"
        "  4. FLUENCY\n\n"
        "For each give a ≤30-word justification and an integer score 1–10. "
        "Compute OVERALL as the rounded average. "
        "Respond ONLY in compact JSON, e.g.:\n"
        "{\n"
        ' "Consistency":{"score":4,"justification":"…"},\n'
        ' "Coverage":   {"score":9"justification":"…"},\n'
        ' "Coherence":  {"score":6,"justification":"…"},\n'
        ' "Fluency":    {"score":5,"justification":"…"},\n'
        ' "Overall":    {"score":8,"justification":"…"}\n'
        "}\n"
        "Think step-by-step before emitting JSON."
    )

    user_prompt = (
        "<SOURCE>\n" f"{source_text}\n" "</SOURCE>\n"
        "<SUMMARY>\n" f"{summary_text}\n" "</SUMMARY>"
    )

    try:
        resp = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role":"system","content":system_prompt},
                {"role":"user","content":user_prompt},
            ],
            temperature=0.0,
            max_tokens=MAX_EVAL_TOKENS,
            stream=False,
        )
        raw = resp.choices[0].message.content.strip()
        print(f"Raw Mistral response: {raw}")

        # strip any markdown fences around the JSON
        # removes leading ```json or ``` and trailing ```
        raw_clean = re.sub(r'^```(?:json)?\s*', '', raw)
        raw_clean = re.sub(r'\s*```$', '', raw_clean).strip()

        scores = json.loads(raw_clean)    
        
        return {k: v for k, v in scores.items()}

    except json.JSONDecodeError as e:
        raise RuntimeError(f"Judge output was not valid JSON even after stripping fences:\n{raw_clean}") from e

    except Exception as e:
        raise RuntimeError(f"Mistral evaluation failed: {e}")