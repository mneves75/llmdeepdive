"""Lesson 19.2: ingestion and a deterministic toy retriever.

Ingestion turns sources into ``MemoryRecord`` chunks that point back to their
source. Retrieval filters by access rule, expiry and supersession first and
ranks only what is left, so another tenant's record can never take a slot in
the results. Two scorers: BM25 (lexical, from Robertson and Zaragoza, 2009) and
a hashed bag-of-words vector that is a toy stand-in for an embedding model.
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from collections.abc import Iterable
from datetime import datetime
from typing import Literal

from agentlab.domain import Principal
from agentlab.memory.records import MemoryRecord, visible

# Words, with identifiers and numbers kept whole: "PO-1001", "12.50", "5,000".
_WORD = re.compile(r"[a-z0-9]+(?:[.,-][a-z0-9]+)*")


def tokens(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def purchase_records(purchases: list[dict], *, at: datetime) -> list[MemoryRecord]:
    """One system-of-record record per purchase order, readable by its own tenant."""
    return [
        MemoryRecord(
            memory_id=row["po_id"].lower(),
            tenant_id=row["tenant_id"],
            kind="semantic",
            origin="system_of_record",
            text=(f"{row['po_id']}: {row['supplier']}, {row['item']}, quantity {row['quantity']}, "
                  f"unit price {row['currency']} {row['unit_price']}, status {row['status']}."),
            created_at=at,
        )
        for row in purchases
    ]


def chunk_message(source_id: str, tenant_id: str, text: str, *, at: datetime, max_words: int = 60, overlap: int = 10) -> list[MemoryRecord]:
    """Split untrusted text into overlapping word windows that all name their source.

    The overlap keeps a sentence that straddles a boundary whole in at least
    one chunk when it is shorter than the overlap.
    """
    if not 0 <= overlap < max_words:
        raise ValueError("overlap must be smaller than max_words")
    words = text.split()
    starts = range(0, max(len(words) - overlap, 1), max_words - overlap)
    return [
        MemoryRecord(
            memory_id=f"{source_id}:{n}",
            tenant_id=tenant_id,
            kind="episodic",
            origin="external",
            text=" ".join(words[start:start + max_words]),
            created_at=at,
            derived_from=(source_id,),
        )
        for n, start in enumerate(starts)
    ]


def bm25_scores(query: str, docs: list[list[str]], k1: float = 1.5, b: float = 0.75) -> list[float]:
    """BM25 as in Robertson and Zaragoza (2009), equation 3.15: saturating term frequency times IDF.

    The paper's IDF (equation 3.3) is log((N - n + 0.5) / (n + 0.5)), which goes
    negative for a word in more than half the documents. This uses the common
    variant log(1 + ...) so a matching word never lowers a score. The paper
    reports 0.5 < b < 0.8 and 1.2 < k1 < 2 as reasonably good in many cases.
    """
    n_docs = len(docs)
    avdl = sum(map(len, docs)) / n_docs if n_docs else 0.0
    df = Counter(term for doc in docs for term in set(doc))
    terms = set(tokens(query))
    scores = []
    for doc in docs:
        tf = Counter(doc)
        norm = (1 - b) + b * len(doc) / avdl if avdl else 1.0
        score = 0.0
        for term in terms & tf.keys():
            idf = math.log(1 + (n_docs - df[term] + 0.5) / (df[term] + 0.5))
            score += tf[term] / (k1 * norm + tf[term]) * idf
        scores.append(score)
    return scores


def toy_vector(text: str, dims: int = 64) -> tuple[float, ...]:
    """A hashed bag of words, normalised to length 1. A toy, not an embedding model.

    It matches shared words only. It uses hashlib because Python salts
    ``hash()`` per process, which would scramble a stored index after a restart.
    """
    vector = [0.0] * dims
    for term in tokens(text):
        vector[int.from_bytes(hashlib.blake2b(term.encode(), digest_size=8).digest(), "big") % dims] += 1.0
    length = math.sqrt(sum(x * x for x in vector))
    return tuple(x / length for x in vector) if length else tuple(vector)


def _cosine(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=True))


def retrieve(records: Iterable[MemoryRecord], query: str, principal: Principal, *, now: datetime, k: int = 3,
             method: Literal["bm25", "toy_vector"] = "bm25") -> list[tuple[float, MemoryRecord]]:
    """Filter, then rank. Returns at most ``k`` (score, record) pairs with a score above zero."""
    candidates = [r for r in records if visible(r, principal) and (r.expires_at is None or r.expires_at > now)]
    replaced = {r.supersedes for r in candidates if r.supersedes}
    candidates = [r for r in candidates if r.memory_id not in replaced]
    if method == "bm25":
        # Statistics come from the visible set only, so other tenants' words do not shape this ranking.
        scores = bm25_scores(query, [tokens(r.text) for r in candidates])
    else:
        q = toy_vector(query)
        scores = [_cosine(q, toy_vector(r.text)) for r in candidates]
    ranked = sorted(zip(scores, candidates, strict=True), key=lambda pair: (-pair[0], pair[1].memory_id))
    return [(score, record) for score, record in ranked if score > 0][:k]
