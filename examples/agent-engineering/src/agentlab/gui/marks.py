"""Lesson 18.2: Set-of-Mark style marks, read from the accessibility tree.

Set-of-Mark prompting (Yang et al., 2023) segments an image into regions and
draws a label on each, so a vision model can answer "mark 9" instead of
guessing pixels. Here the regions come from the browser instead of an image
segmenter: Playwright's ``aria_snapshot(mode="ai", boxes=True)`` lists each
element with a reference such as ``[ref=e9]`` and its viewport box in CSS
pixels. Only elements a person can act on become marks.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

INTERACTIVE = frozenset({"button", "link", "textbox", "checkbox", "radio", "combobox", "menuitem", "tab", "searchbox"})

# One snapshot line: "- button "Download March 2026 CSV" [ref=e9] [box=93,69,181,21]".
LINE = re.compile(r'^\s*- (?P<role>[a-z]+)(?: "(?P<name>(?:[^"\\]|\\.)*)")?.*?\[ref=(?P<ref>e\d+)\].*?\[box=(?P<box>[-\d.]+,[-\d.]+,[-\d.]+,[-\d.]+)\]')


@dataclass(frozen=True)
class Mark:
    ref: str
    role: str
    name: str
    box: tuple[float, float, float, float]  # x, y, width, height in viewport CSS pixels

    @property
    def center(self) -> tuple[float, float]:
        x, y, width, height = self.box
        return (x + width / 2, y + height / 2)

    def contains(self, x: float, y: float) -> bool:
        left, top, width, height = self.box
        return left <= x <= left + width and top <= y <= top + height


def parse_marks(snapshot: str) -> list[Mark]:
    """Every interactive element of an AI-mode snapshot taken with boxes, in document order."""
    marks = []
    for line in snapshot.splitlines():
        match = LINE.match(line)
        if match and match["role"] in INTERACTIVE:
            box = tuple(float(part) for part in match["box"].split(","))
            marks.append(Mark(match["ref"], match["role"], (match["name"] or "").replace('\\"', '"'), box))
    return marks


def pick_mark(x: float, y: float, marks: list[Mark]) -> Mark | None:
    """The one mark under a point, or None when no mark or several marks contain it.

    None means "observe again", never "click anyway": a point on two targets
    is a guess between them.
    """
    under = [mark for mark in marks if mark.contains(x, y)]
    return under[0] if len(under) == 1 else None
