"""Lesson 18.2: click by screenshot coordinates at two device scales, and re-observe instead of guessing."""

import unittest
from datetime import UTC, datetime

from playwright.sync_api import sync_playwright

from agentlab.gui.browser import click_point, draw_marks, observe, screenshot_frame
from agentlab.gui.control import ActionBudget
from agentlab.gui.coordinates import image_to_viewport, viewport_to_image
from agentlab.gui.marks import parse_marks, pick_mark
from agentlab.gui.portal import COOKIE, Portal
from agentlab.gui.trace import Trace
from agentlab.model import ModelReply, ScriptedModel


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


def clock():
    return datetime(2026, 3, 31, 9, 0, tzinfo=UTC)


def signed_in_page(test, scale, height=600):
    portal = Portal()
    url = portal.start()
    test.addCleanup(portal.close)
    context = BROWSER.new_context(device_scale_factor=scale, viewport={"width": 800, "height": height})
    test.addCleanup(context.close)
    context.add_cookies([{"name": COOKIE, "value": portal.issue_session(), "url": url}])
    page = context.new_page()
    page.goto(url + "/reports")
    return portal, page


def vision_model_pointing_at(page, frame, name):
    """Stands in for a vision model: it answers with the image pixel at the centre of the named button."""
    mark = next(m for m in parse_marks(observe(page)) if m.name == name)
    x, y = viewport_to_image(*mark.center, frame)
    return ScriptedModel([ModelReply(tool_call={"name": "click_point", "arguments": {"x": x, "y": y}})])


class ClickByCoordinates(unittest.TestCase):
    def test_the_point_lands_on_march_at_scale_1_and_2(self):
        for scale in (1, 2):
            with self.subTest(scale=scale):
                portal, page = signed_in_page(self, scale)
                image, frame = screenshot_frame(page)
                self.assertEqual(frame.image_width, 800 * scale)  # a device-scale screenshot
                answer = vision_model_pointing_at(page, frame, "Download March 2026 CSV").complete([])
                trace = Trace(run_id="r1", secrets=(), clock=clock)
                with page.expect_download():
                    mark = click_point(page, frame, answer.tool_call["arguments"]["x"], answer.tool_call["arguments"]["y"], ActionBudget(3), trace)
                self.assertEqual(mark.name, "Download March 2026 CSV")
                self.assertEqual(portal.exports_served, ["2026-03"])

    def test_reading_device_pixels_as_css_pixels_misses_at_scale_2(self):
        _, page = signed_in_page(self, 2)
        _, frame = screenshot_frame(page)
        march = next(m for m in parse_marks(observe(page)) if m.name == "Download March 2026 CSV")
        x, y = viewport_to_image(*march.center, frame)
        self.assertNotEqual(pick_mark(x, y, parse_marks(observe(page))), march)  # the naive click hits something else or nothing
        self.assertEqual(pick_mark(*image_to_viewport(x, y, frame), parse_marks(observe(page))), march)

    def test_a_scroll_after_the_screenshot_is_accounted_for(self):
        portal, page = signed_in_page(self, 2, height=320)
        _, frame = screenshot_frame(page)
        answer = vision_model_pointing_at(page, frame, "Download March 2026 CSV").complete([])
        x, y = answer.tool_call["arguments"]["x"], answer.tool_call["arguments"]["y"]
        page.mouse.wheel(0, 60)
        page.wait_for_function("window.scrollY == 60")
        # Ignoring the scroll would put the click one row lower, on April's button.
        self.assertEqual(pick_mark(*image_to_viewport(x, y, frame), parse_marks(observe(page))).name, "Download April 2026 CSV")
        trace = Trace(run_id="r1", secrets=(), clock=clock)
        with page.expect_download():
            mark = click_point(page, frame, x, y, ActionBudget(3), trace)
        self.assertEqual(mark.name, "Download March 2026 CSV")
        self.assertEqual(portal.exports_served, ["2026-03"])

    def test_a_point_between_two_buttons_is_not_clicked(self):
        portal, page = signed_in_page(self, 2)
        _, frame = screenshot_frame(page)
        marks = parse_marks(observe(page))
        march, april = (next(m for m in marks if m.name == f"Download {month} 2026 CSV") for month in ("March", "April"))
        gap_y = (march.box[1] + march.box[3] + april.box[1]) / 2  # between the bottom of March and the top of April
        x, y = viewport_to_image(march.center[0], gap_y, frame)
        trace = Trace(run_id="r1", secrets=(), clock=clock)
        budget = ActionBudget(3)
        self.assertIsNone(click_point(page, frame, x, y, budget, trace))
        self.assertEqual((budget.spent, portal.exports_served), ([], []))
        self.assertEqual(trace.events[-1].kind, "gui.reobserve")


class Marks(unittest.TestCase):
    def test_drawn_marks_change_the_screenshot_but_not_the_tree_or_the_clicks(self):
        portal, page = signed_in_page(self, 1)
        before = observe(page)
        marks = parse_marks(before)
        draw_marks(page, marks)
        self.assertEqual(page.locator(".som-mark").count(), len(marks))
        self.assertEqual(parse_marks(observe(page)), marks)
        with page.expect_download():
            page.mouse.click(marks[0].box[0] + 2, marks[0].box[1] + 2)  # right under a label
        self.assertEqual(portal.exports_served, ["2026-03"])


if __name__ == "__main__":
    unittest.main()
