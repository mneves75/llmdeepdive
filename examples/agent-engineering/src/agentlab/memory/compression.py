"""Lesson 19.3: a context budget, a 50-turn synthetic conversation and three compressors.

Compression is judged by what it loses, not only by what it saves: ``score``
checks a fixed set of commitments and negations against the compressed turns
and reports each as kept, lost or flipped (the words survive but the "not" did
not, which turns a prohibition into an instruction).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

from agentlab.memory.retrieval import tokens


def approx_tokens(text: str) -> int:
    """About four characters per token, rounded up.

    shortcut: an approximation, not any model's tokenizer; real counts differ
    by tokenizer and language (lesson 1.4). Count with the model's own
    tokenizer before trusting a budget that is close to the limit.
    """
    return math.ceil(len(text) / 4)


@dataclass(frozen=True)
class ContextBudget:
    input_limit: int
    fixed: int
    used: int
    over: int
    headroom: int
    history_limit: int
    verdict: Literal["fits", "over", "fixed_over"]


def context_budget(*, window: int, reserve_output: int, instructions: int, tools: int, chunks: int, chunk_tokens: int, history: int) -> ContextBudget:
    """The 19.3 calculator's arithmetic (``contextBudget`` in src/lib/lab-math.ts), in Python."""
    input_limit = max(0, window - reserve_output)
    fixed = instructions + tools + chunks * chunk_tokens
    used = fixed + history
    over = max(0, used - input_limit)
    verdict = "fixed_over" if fixed > input_limit else "over" if over else "fits"
    return ContextBudget(input_limit, fixed, used, over, max(0, input_limit - used), max(0, input_limit - fixed), verdict)


@dataclass(frozen=True)
class Turn:
    index: int
    role: Literal["user", "assistant"]
    text: str
    # Set by the controller when the user states a commitment or a prohibition.
    fact: str | None = None

    def render(self) -> str:
        return f"{self.role}: {self.text}"


@dataclass(frozen=True)
class Fact:
    fact_id: str
    statement: str
    terms: tuple[str, ...]
    negation: str | None = None


FACTS: tuple[Fact, ...] = (
    Fact("pay-po-1001", "We will pay PO-1001 within 30 days of delivery.", ("pay", "po-1001", "30", "days")),
    Fact("cap-5000", "The approval limit for this run is USD 5,000.", ("approval", "limit", "5,000")),
    Fact("no-gamma", "Never order shelving from Supplier Gamma again.", ("order", "shelving", "gamma"), "never"),
    Fact("separate-invoices", "Do not combine PO-1002 and PO-1004 on one invoice.", ("combine", "po-1002", "po-1004"), "not"),
    Fact("hold-po-1003", "Do not pay PO-1003 until the gloves arrive.", ("pay", "po-1003", "gloves"), "not"),
    Fact("partial-delivery", "Ask the warehouse lead before accepting a partial delivery.", ("warehouse", "lead", "partial")),
)
_FACT_TURNS = {2: 0, 8: 1, 14: 2, 20: 3, 32: 4, 44: 5}

_USER_FILLER = (
    "Can you check whether the courier has picked up the box from the loading bay yet?",
    "What did the supplier portal say about the tracking number this morning?",
    "Remind me which forms the receiving team needs for the quarterly audit.",
    "Is the meeting with the facilities team still on Thursday afternoon?",
    "Please list the open tickets from last week so I can close the old ones.",
)
_ASSISTANT_FILLER = (
    "The courier scan shows the box left the loading bay at 10:40 and is in transit.",
    "The portal lists the tracking number as active with an estimated arrival on Friday.",
    "The receiving team needs the delivery note, the packing list and a signed checklist.",
    "Yes, the facilities meeting is on Thursday at 15:00 in room 4.",
    "There are three open tickets: a label reprint, a missing packing list and a portal login reset.",
)


def conversation() -> list[Turn]:
    """Fifty alternating turns; six user turns state the scored facts, the rest is routine chatter."""
    turns = []
    for i in range(50):
        if i in _FACT_TURNS:
            fact = FACTS[_FACT_TURNS[i]]
            turns.append(Turn(i, "user", fact.statement, fact.fact_id))
        elif i - 1 in _FACT_TURNS:
            turns.append(Turn(i, "assistant", "Noted."))
        elif i % 2 == 0:
            turns.append(Turn(i, "user", _USER_FILLER[(i // 2) % len(_USER_FILLER)]))
        else:
            turns.append(Turn(i, "assistant", _ASSISTANT_FILLER[(i // 2) % len(_ASSISTANT_FILLER)]))
    return turns


def total_tokens(turns: list[Turn]) -> int:
    return sum(approx_tokens(t.render()) for t in turns)


def recent_window(turns: list[Turn], budget: int) -> list[Turn]:
    """Keep the newest turns that fit. Cheap, and blind to what an old turn promised."""
    kept: list[Turn] = []
    used = 0
    for turn in reversed(turns):
        cost = approx_tokens(turn.render())
        if used + cost > budget:
            break
        kept.append(turn)
        used += cost
    return kept[::-1]


# This stopword list contains the words that carry negation, so dropping it can invert meaning.
_STOPWORDS = frozenset(
    "a an and are as at be before by can do does for from has have i in is it me my no not never of on or our please "
    "so still that the this to until was we what which whether will with yet you".split()
)


def drop_stopwords(turns: list[Turn], budget: int) -> list[Turn]:
    """Delete stopwords from every turn, then keep the newest that fit. Saves tokens; can invert meaning."""
    shortened = [Turn(t.index, t.role, " ".join(w for w in t.text.split() if w.lower().strip(".,?!:") not in _STOPWORDS) or "…", t.fact) for t in turns]
    return recent_window(shortened, budget)


def pin_ledger(turns: list[Turn], budget: int) -> list[Turn]:
    """Keep every flagged commitment verbatim, then fill what is left with the newest turns.

    The ledger is kept whole or the call fails: silently cutting a
    commitment to fit would be the failure this function exists to prevent.
    """
    ledger = [t for t in turns if t.fact]
    remaining = budget - total_tokens(ledger)
    if remaining < 0:
        raise ValueError(f"the commitments alone need {total_tokens(ledger)} tokens; the budget is {budget}")
    recent = recent_window([t for t in turns if not t.fact], remaining)
    return sorted(ledger + recent, key=lambda t: t.index)


@dataclass(frozen=True)
class CompressionReport:
    kept: tuple[str, ...]
    lost: tuple[str, ...]
    flipped: tuple[str, ...]


def score(turns: list[Turn], facts: tuple[Fact, ...]) -> CompressionReport:
    """Check each fact against each turn: all its terms in one turn, and its negation word if it has one."""
    kept, lost, flipped = [], [], []
    lines = [set(tokens(t.text)) for t in turns]
    for fact in facts:
        matches = [words for words in lines if set(fact.terms) <= words]
        if any(fact.negation is None or fact.negation in words for words in matches):
            kept.append(fact.fact_id)
        elif matches:
            flipped.append(fact.fact_id)
        else:
            lost.append(fact.fact_id)
    return CompressionReport(tuple(kept), tuple(lost), tuple(flipped))
