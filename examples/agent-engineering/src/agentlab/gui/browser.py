"""The Playwright side of track 18 (needs the ``browser`` dependency group).

This is the only module in ``agentlab.gui`` that imports Playwright; the core
suite never imports it. Every function takes a ``Page`` the caller owns, so a
test controls the browser, the context's device scale factor and cleanup.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from pathlib import Path

from playwright.sync_api import Locator, Page
from playwright.sync_api import TimeoutError as PlaywrightTimeout

from agentlab.gui.control import ActionBudget, BudgetExhausted, Outcome, Target
from agentlab.gui.coordinates import Frame, OffscreenTarget, image_to_viewport, png_size
from agentlab.gui.marks import Mark, parse_marks, pick_mark
from agentlab.gui.report import ReportRejected, check_download_url, safe_destination, validate_report
from agentlab.gui.session import CredentialVault, PageState, classify_page, origin_of
from agentlab.gui.trace import Trace


def observe(page: Page) -> str:
    """The page as a model reads it: roles, names, references and viewport boxes."""
    return page.aria_snapshot(mode="ai", boxes=True)


def resolve(page: Page, target: Target) -> Locator | None:
    """The one element with exactly this role and accessible name, or None when there are zero or several."""
    locator = page.get_by_role(target.role, name=target.name, exact=True)
    return locator if locator.count() == 1 else None


# 18.2: screenshots, marks and clicks by coordinates.


def screenshot_frame(page: Page) -> tuple[bytes, Frame]:
    """A device-scale screenshot and the geometry needed to act on it later."""
    image = page.screenshot()
    width, height = png_size(image)
    scroll_x, scroll_y = page.evaluate("[window.scrollX, window.scrollY]")
    viewport = page.viewport_size or {"width": width, "height": height}
    return image, Frame(width, height, viewport["width"], viewport["height"], scroll_x, scroll_y)


def draw_marks(page: Page, marks: list[Mark]) -> None:
    """Draw each mark's reference on the page, Set-of-Mark style, for a screenshot a vision model reads.

    The labels are hidden from the accessibility tree and let clicks through, so
    they change what the screenshot shows and nothing else.
    """
    page.evaluate(
        """marks => { for (const [ref, x, y] of marks) {
            const label = document.createElement('span'); label.textContent = ref; label.className = 'som-mark';
            label.setAttribute('aria-hidden', 'true');
            label.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:#ff0;color:#000;font:bold 12px monospace;pointer-events:none;z-index:9999`;
            document.body.append(label) } }""",
        [[mark.ref, mark.box[0], mark.box[1]] for mark in marks],
    )


def click_point(page: Page, frame: Frame, x: float, y: float, budget: ActionBudget, trace: Trace) -> Mark | None:
    """Click where a model pointed on a screenshot, after checking what is under that point now.

    Returns the mark that was clicked, or None without clicking when the point
    has scrolled out of view or does not sit on exactly one element. None means
    take a fresh screenshot and ask again.
    """
    scroll_x, scroll_y = page.evaluate("[window.scrollX, window.scrollY]")
    try:
        view_x, view_y = image_to_viewport(x, y, frame, scroll_x=scroll_x, scroll_y=scroll_y)
    except OffscreenTarget as error:
        trace.record("gui.reobserve", reason=str(error))
        return None
    mark = pick_mark(view_x, view_y, parse_marks(observe(page)))
    if mark is None:
        trace.record("gui.reobserve", reason=f"no single element at ({view_x:.0f}, {view_y:.0f})")
        return None
    budget.spend("click")
    page.mouse.click(view_x, view_y)
    trace.record("gui.click", target=f"{mark.role}:{mark.name}", at=[view_x, view_y])
    return mark


# 18.3: signing in without the model ever holding the password.


def sign_in(page: Page, vault: CredentialVault, portal_origin: str, budget: ActionBudget, trace: Trace) -> PageState:
    """Fill the login form from the vault and report the state of the page that follows.

    The vault refuses any origin it was not registered for, so a lookalike page
    raises PermissionError before a single field is filled.
    """
    credential = vault.release(page.url)
    budget.spend("sign_in")
    page.get_by_label("Username", exact=True).fill(credential.username)
    trace.record("gui.fill", target="textbox:Username", value=credential.username)
    page.get_by_label("Password", exact=True).fill(credential.password)
    trace.record("gui.fill", target="textbox:Password", value="[secret]")
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.wait_for_load_state()
    state = classify_page(page.url, observe(page), portal_origin)
    trace.record("gui.page", url=page.url, state=state)
    return state


# 18.4: a download is done when the file checks out, not when the banner says so.


def download_report(page: Page, press: Callable[[], object], *, period: str, folder: Path, trace: Trace,
                    timeout_ms: float = 5000) -> Outcome:
    """Run ``press`` (the click that starts an export) and accept the file only after every check in ``agentlab.gui.report``."""
    try:
        with page.expect_download(timeout=timeout_ms) as started:
            press()
    except PlaywrightTimeout:
        banner = page.get_by_role("status").first.inner_text()
        trace.record("gui.download", ok=False, banner=banner)
        return Outcome("failed", f"no download started within {timeout_ms:.0f} ms, although the page says {banner!r}")
    download = started.value
    failure = download.failure()
    if failure is not None:
        return Outcome("failed", f"the download failed: {failure}")
    destination: Path | None = None
    try:
        check_download_url(download.url, origin_of(page.url))
        destination = safe_destination(folder, download.suggested_filename)
        download.save_as(destination)
        rows = validate_report(destination, period=period)
    except ReportRejected as error:
        if destination is not None:
            destination.unlink(missing_ok=True)  # a rejected file must not look like a result later
        trace.record("gui.download", ok=False, reason=str(error))
        return Outcome("failed", str(error))
    trace.record("gui.download", ok=True, file=destination.name, rows=len(rows))
    return Outcome("done", f"{len(rows)} rows for {period} in {destination.name}", tuple(rows))


# 18.5: recover from what is expected, stop on what is not.


def fetch_report(page: Page, target: Target, *, period: str, folder: Path, portal_origin: str, budget: ActionBudget,
                 trace: Trace, timeout_ms: float = 5000) -> Outcome:
    """Observe, dismiss a known dialog, find exactly one target, download and verify, within the budget."""
    try:
        while True:
            budget.spend("observe")
            state = classify_page(page.url, observe(page), portal_origin)
            trace.record("gui.page", url=page.url, state=state)
            if state != "ready":
                return Outcome(state, f"stopped on {page.url}: {state}")
            dialog = page.get_by_role("dialog")
            if dialog.count():
                dismiss = dialog.get_by_role("button", name="Dismiss", exact=True)
                if dismiss.count() != 1:
                    return Outcome("needs_human", "a dialog without a known way to close it")
                budget.spend("dismiss")
                dismiss.click()
                trace.record("gui.dismiss", target="button:Dismiss")
                continue  # the page changed: observe again before acting
            button = resolve(page, target)
            if button is None:
                return Outcome("needs_human", f"no single {target.role} named {target.name!r}: the layout is not one this run knows")
            budget.spend("click")
            trace.record("gui.click", target=f"{target.role}:{target.name}")
            return download_report(page, lambda: button.click(timeout=timeout_ms), period=period, folder=folder, trace=trace, timeout_ms=timeout_ms)
    except BudgetExhausted as error:
        return Outcome("needs_human", str(error))


def stable_view_digest(page: Page) -> str:
    """SHA-256 of a screenshot with the ticking clock masked and animations stopped.

    Two digests are equal only when everything outside the mask rendered the
    same pixels, so a moved button or a new banner shows up and the clock does not.
    """
    image = page.screenshot(mask=[page.get_by_role("timer")], animations="disabled", caret="hide")
    return hashlib.sha256(image).hexdigest()
