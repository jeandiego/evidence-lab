#!/usr/bin/env python3
"""Classify the audited synchronization points locally with Laya."""

from __future__ import annotations

import hashlib
import json
import os
import platform
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import laya
import torch


LAB_ROOT = Path(__file__).resolve().parent.parent
REPORTS = LAB_ROOT / "reports"
PRIVATE_REPORTS = LAB_ROOT / ".private-reports"
BASELINE_PATH = PRIVATE_REPORTS / "state-ownership-classification.json"
OUTPUT_PATH = PRIVATE_REPORTS / "state-ownership-laya-classification.json"
COMPARISON_PATH = REPORTS / "state-ownership-laya-comparison.json"
SOURCE_ROOT = Path(os.environ.get("STATE_OWNERSHIP_SOURCE_ROOT", "__source_repository_not_configured__"))

LABELS = ("avoidable", "simplifiable", "legitimate", "inconclusive")
QUESTIONS = {
    "classification": {
        "type": "choice",
        "instructions": (
            "Classify this single client-state synchronization operation by state ownership. "
            "Judge the operation, not the state library. Prefer inconclusive when the evidence is insufficient."
        ),
        "criteria": {
            "avoidable": (
                "Server-owned data is duplicated in a mutable client store and the manual synchronization point "
                "could be removed by retaining the canonical remote snapshot in a server-state cache."
            ),
            "simplifiable": (
                "Some client reconciliation, projection, optimistic behavior, persistence, or workflow state remains "
                "necessary, but the synchronization can be reduced or centralized."
            ),
            "legitimate": (
                "The client is the canonical owner: this is UI, transient interaction, navigation, analytics, or "
                "workflow state without a canonical remote representation."
            ),
            "inconclusive": "The available code does not establish ownership or whether synchronization can be removed.",
        },
    },
    "canonical_owner": {
        "type": "choice",
        "instructions": "Who appears to be the canonical owner of the value affected by this operation?",
        "criteria": {
            "server": "A backend response, query, mutation, or persisted remote entity is authoritative.",
            "client": "The browser interaction or client workflow is authoritative.",
            "mixed": "Remote domain data and genuine client-owned state are intentionally combined.",
            "unclear": "The evidence is insufficient to identify one owner.",
        },
    },
}


def read_context(relative_path: str, line: int, radius: int = 7) -> dict[str, Any]:
    target = (SOURCE_ROOT / relative_path).resolve()
    if SOURCE_ROOT.resolve() not in target.parents or not target.is_file():
        return {"path": relative_path, "line": line, "available": False}
    lines = target.read_text(encoding="utf-8").splitlines()
    start = max(1, line - radius)
    end = min(len(lines), line + radius)
    numbered = "\n".join(f"{index}: {lines[index - 1]}" for index in range(start, end + 1))
    return {"path": relative_path, "line": line, "range": [start, end], "code": numbered, "available": True}


def choice_and_confidence(answer: dict[str, Any]) -> tuple[str, float | None]:
    choice = answer.get("choice")
    # Laya exposes both a calibrated decision confidence and the probability of
    # the selected answer. For label comparison, report the latter explicitly.
    confidence = answer.get("answer_confidence")
    if confidence is None:
        confidence = answer.get("confidence")
    if confidence is None:
        probabilities = answer.get("probabilities") or answer.get("distribution")
        if isinstance(probabilities, dict) and choice in probabilities:
            confidence = probabilities[choice]
    return str(choice), float(confidence) if confidence is not None else None


def main() -> None:
    if not SOURCE_ROOT.is_dir():
        raise RuntimeError("Set STATE_OWNERSHIP_SOURCE_ROOT to the local source repository")
    PRIVATE_REPORTS.mkdir(parents=True, exist_ok=True)
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    operations = baseline["results"]

    started = time.perf_counter()
    agent = laya.load("convaiinnovations/laya", subfolder="multilingual", device="cpu")
    if hasattr(agent, "cfg"):
        agent.cfg["max_len"] = 8192
        agent.cfg["head_max_len"] = 512
    load_seconds = round(time.perf_counter() - started, 3)

    results: list[dict[str, Any]] = []
    for index, operation in enumerate(operations, start=1):
        contexts = [read_context(item["path"], int(item["line"])) for item in operation["evidence"]]
        state = {
            "entity": operation["entity"],
            "operation": operation["operation"],
            "duplicatedRepresentations": operation["duplicatedRepresentations"],
            "evidence": contexts,
        }
        state_json = json.dumps(state, ensure_ascii=False)
        prediction_started = time.perf_counter()
        prediction = agent.predict(state, QUESTIONS)
        latency_ms = round((time.perf_counter() - prediction_started) * 1000, 2)

        classification, confidence = choice_and_confidence(prediction["answers"]["classification"])
        owner, owner_confidence = choice_and_confidence(prediction["answers"]["canonical_owner"])
        if classification not in LABELS:
            raise ValueError(f"Unexpected classification {classification!r} for {operation['id']}")

        results.append(
            {
                "id": operation["id"],
                "entity": operation["entity"],
                "operation": operation["operation"],
                "evidence": operation["evidence"],
                "inputSha256": hashlib.sha256(state_json.encode()).hexdigest(),
                "laya": {
                    "classification": classification,
                    "confidence": confidence,
                    "canonicalOwner": owner,
                    "canonicalOwnerConfidence": owner_confidence,
                    "latencyMs": latency_ms,
                    "rawAnswers": prediction["answers"],
                },
            }
        )
        print(f"[{index:02}/{len(operations)}] {operation['id']}: {classification} ({confidence})", flush=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    counts = Counter(item["laya"]["classification"] for item in results)
    laya_report = {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "repositoryAlias": baseline["repositoryAlias"],
        "method": {
            "engine": "Laya local inference",
            "packageVersion": getattr(laya, "__version__", "unknown"),
            "checkpoint": "convaiinnovations/laya/multilingual",
            "device": "cpu",
            "python": platform.python_version(),
            "torch": torch.__version__,
            "mpsAvailable": torch.backends.mps.is_available(),
            "labels": list(LABELS),
            "answerLeakageControl": (
                "The Laya input excluded previous classifications, confidence values, rationales, counterarguments, "
                "judge decisions, and adjudication. It included deterministic metadata and local source excerpts."
            ),
            "loadSeconds": load_seconds,
        },
        "metrics": {"operations": len(results), "counts": {label: counts[label] for label in LABELS}},
        "results": results,
        "limitations": [
            "Zero-shot classification; the checkpoint was not fine-tuned or calibrated for state-ownership audits.",
            "Candidate discovery came from the existing audit, so this run evaluates classification rather than recall.",
            "Laya is non-generative and supplies labels/probabilities, not independent code-review rationales.",
            "The official PyTorch runtime did not expose Apple MPS in this environment, so inference used CPU.",
        ],
    }

    baseline_by_id = {item["id"]: item for item in operations}
    matrix: dict[str, dict[str, int]] = {label: {other: 0 for other in LABELS} for label in LABELS}
    agreements = 0
    comparison_results = []
    for item in results:
        baseline_item = baseline_by_id[item["id"]]
        expected = baseline_item["finalClassification"]
        actual = item["laya"]["classification"]
        matrix[expected][actual] += 1
        agrees = expected == actual
        agreements += int(agrees)
        comparison_results.append(
            {
                "id": item["id"],
                "baseline": expected,
                "laya": actual,
                "layaConfidence": item["laya"]["confidence"],
                "agrees": agrees,
            }
        )

    comparison = {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "comparison": "Conservative GPT classifier+judge adjudication versus local zero-shot Laya",
        "metrics": {
            "operations": len(results),
            "agreements": agreements,
            "disagreements": len(results) - agreements,
            "agreementRate": round(agreements / len(results), 4),
            "baselineCounts": baseline["metrics"]["finalCounts"],
            "layaCounts": {label: counts[label] for label in LABELS},
            "confusionMatrixRowsBaselineColumnsLaya": matrix,
        },
        "results": comparison_results,
        "decisionNote": (
            "Agreement is not accuracy because the baseline is an adjudicated reference, not ground truth. "
            "Review disagreements before choosing either method."
        ),
    }

    agreement_items = [item for item in comparison_results if item["agrees"]]
    disagreement_items = [item for item in comparison_results if not item["agrees"]]
    average_confidence = lambda items: round(
        sum(float(item["layaConfidence"] or 0) for item in items) / len(items), 4
    )
    comparison["metrics"]["averageLayaConfidenceOnAgreements"] = average_confidence(agreement_items)
    comparison["metrics"]["averageLayaConfidenceOnDisagreements"] = average_confidence(disagreement_items)
    comparison["metrics"]["highConfidenceDisagreementsAt070"] = [
        item for item in disagreement_items if float(item["layaConfidence"] or 0) >= 0.7
    ]

    OUTPUT_PATH.write_text(json.dumps(laya_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    COMPARISON_PATH.write_text(json.dumps(comparison, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(comparison["metrics"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Laya classification failed: {exc}", file=sys.stderr)
        raise
