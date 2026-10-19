"""Lesson 18.1: a semantic target survives a harmless redesign; a structural selector does not."""

import unittest

from playwright.sync_api import sync_playwright

from agentlab.gui.browser import observe, resolve
from agentlab.gui.control import Target, propose_target
from agentlab.gui.portal import COOKIE, Portal
from agentlab.model import ModelReply, ScriptedModel

TASK = "Download the March 2026 report."
MARCH = {"role": "button", "name": "Download March 2026 CSV"}


def setUpModule():
    global PLAYWRIGHT, BROWSER
    PLAYWRIGHT = sync_playwright().start()
    BROWSER = PLAYWRIGHT.chromium.launch()


def tearDownModule():
    BROWSER.close()
    PLAYWRIGHT.stop()


def signed_in_page(test, layout):
    portal = Portal(layout=layout)
    url = portal.start()
    test.addCleanup(portal.close)
    context = BROWSER.new_context()
    test.addCleanup(context.close)
    context.add_cookies([{"name": COOKIE, "value": portal.issue_session(), "url": url}])
    page = context.new_page()
    page.goto(url + "/reports")
    return portal, page


class SemanticTargets(unittest.TestCase):
    def test_the_models_target_resolves_to_march_on_both_layouts(self):
        for layout in ("a", "b"):
            with self.subTest(layout=layout):
                portal, page = signed_in_page(self, layout)
                model = ScriptedModel([ModelReply(tool_call={"name": "click", "arguments": MARCH})])
                target = propose_target(model, TASK, observe(page))
                button = resolve(page, target)
                self.assertIsNotNone(button)
                with page.expect_download() as started:
                    button.click()
                self.assertEqual(started.value.suggested_filename, "report-2026-03.csv")
                self.assertEqual(portal.exports_served, ["2026-03"])

    def test_the_snapshot_shows_the_same_role_and_name_on_both_layouts(self):
        for layout in ("a", "b"):
            with self.subTest(layout=layout):
                _, page = signed_in_page(self, layout)
                self.assertIn('button "Download March 2026 CSV"', observe(page))

    def test_an_unknown_layout_resolves_nothing(self):
        _, page = signed_in_page(self, "c")
        self.assertIsNone(resolve(page, Target(**MARCH)))

    def test_a_name_that_matches_several_elements_resolves_nothing(self):
        _, page = signed_in_page(self, "c")
        self.assertIsNone(resolve(page, Target(role="button", name="Export")))  # five of them


class StructuralSelectors(unittest.TestCase):
    def test_a_css_path_breaks_on_the_redesign(self):
        path = "#report-table tbody tr:nth-child(1) button"
        _, before = signed_in_page(self, "a")
        _, after = signed_in_page(self, "b")
        self.assertEqual(before.locator(path).inner_text(), "Download March 2026 CSV")
        self.assertEqual(after.locator(path).count(), 0)

    def test_the_first_button_is_a_different_report_after_the_redesign(self):
        # Worse than breaking: a positional choice still finds a button, the wrong one.
        _, before = signed_in_page(self, "a")
        _, after = signed_in_page(self, "b")
        self.assertEqual(before.locator("button[data-period]").first.get_attribute("data-period"), "2026-03")
        self.assertEqual(after.locator("button[data-period]").first.get_attribute("data-period"), "2026-07")


if __name__ == "__main__":
    unittest.main()
