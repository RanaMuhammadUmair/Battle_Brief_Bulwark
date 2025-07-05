"""
evaluation_module.py

Provides functionality to evaluate a model-generated summary against the original source text
using Mistral’s `mistral-small` LLM. Scores four facets—consistency, coverage, coherence, and fluency—
and computes an overall score. The evaluation is driven by a system+user prompt and retries until valid JSON is returned.
"""

import os
import json
import re
from typing import Dict

from mistralai import Mistral

# Maximum tokens allowed in the LLM’s evaluation response
MAX_EVAL_TOKENS = 256


def evaluate_with_mistral_small(source_text: str, summary_text: str) -> Dict[str, int]:
    """
    Judge *summary_text* against *source_text* using Mistral’s `mistral-small` model.
    Returns a mapping of facet names to score objects, each with:
      - "score": integer 1–10
      - "justification": ≤30-word rationale
    Also includes an "Overall" entry as the rounded average of the four facet scores.

    The function will retry the LLM call indefinitely until valid JSON is received.
    Raises:
        RuntimeError: if the Mistral client fails to initialize (missing/invalid API key).
    """
    # Initialize the Mistral client from environment variable
    client = Mistral(api_key=os.getenv("MISTRAL_API_KEY"))
    if not client:
        raise RuntimeError("Mistral client init failed – check your API key.")

    # System prompt defines the role, scoring rubric, and output format (compact JSON)
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
        '  "Consistency":{"score":4,"justification":"…"},\n'
        '  "Coverage":   {"score":9,"justification":"…"},\n'
        '  "Coherence":  {"score":6,"justification":"…"},\n'
        '  "Fluency":    {"score":5,"justification":"…"},\n'
        '  "Overall":    {"score":8,"justification":"…"}\n'
        "}\n"
        "Think step-by-step before emitting JSON."
    )

    # Combine the source and the candidate summary into the user prompt
    user_prompt = (
        "<SOURCE>\n" f"{source_text}\n" "</SOURCE>\n"
        "<SUMMARY>\n" f"{summary_text}\n" "</SUMMARY>"
    )

    attempts = 0
    while True:
        attempts += 1

        # Send the request to Mistral’s chat-completion endpoint
        resp = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_tokens=MAX_EVAL_TOKENS,
            stream=False,
        )

        # Extract and trim the raw text response
        raw = resp.choices[0].message.content.strip()
        # Remove potential Markdown code fences around the JSON
        raw_clean = re.sub(r'^```(?:json)?\s*', '', raw)
        raw_clean = re.sub(r'\s*```$', '', raw_clean).strip()

        # Attempt to parse the cleaned string as JSON; retry on failure
        try:
            scores = json.loads(raw_clean)
            break
        except json.JSONDecodeError:
            # Informational retry; loop will re-attempt until valid JSON
            print(f"Attempt {attempts}: invalid JSON, retrying...")

    # Return the parsed score mapping; unchanged structure from LLM output
    return {k: v for k, v in scores.items()}