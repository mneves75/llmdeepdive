"""Lesson 18.2: screenshot pixels, viewport coordinates and Set-of-Mark style marks."""

import unittest

from agentlab.gui.coordinates import Frame, OffscreenTarget, image_to_viewport, png_size, viewport_to_image
from agentlab.gui.marks import Mark, parse_marks, pick_mark

# Captured from Playwright 1.63.0: page.aria_snapshot(mode="ai", boxes=True) on a small page.
SNAPSHOT = """- main [ref=e2] [box=8,8,1264,177]:
  - heading "Reports" [level=1] [ref=e3] [box=8,8,1264,37]
  - table [ref=e4] [box=8,66,268,27]:
    - rowgroup [ref=e5] [box=10,68,264,23]:
      - row [ref=e6] [box=10,68,264,23]:
        - cell "March 2026" [ref=e7] [box=10,68,80,23]
        - cell [ref=e8] [box=92,68,183,23]:
          - button "Download March 2026 CSV" [ref=e9] [box=93,69,181,21]
  - generic [ref=e10] [box=8,94,222,18]:
    - text: Username
    - textbox "Username" [ref=e11] [box=77,93,153,21]
  - dialog "Notice" [ref=e12] [box=8,130,1264,55]:
    - paragraph [ref=e13] [box=8,130,1264,18]: Maintenance
    - button "Dismiss" [ref=e14] [box=8,164,63,21]
"""


class ImageToViewport(unittest.TestCase):
    def test_scale_1_maps_pixels_one_to_one(self):
        frame = Frame(image_width=1280, image_height=720, viewport_width=1280, viewport_height=720)
        self.assertEqual(image_to_viewport(183.0, 79.0, frame), (183.0, 79.0))

    def test_device_scale_2_halves_every_pixel(self):
        # A device-scale screenshot of a 1280x720 viewport at device scale factor 2 is 2560x1440.
        frame = Frame(image_width=2560, image_height=1440, viewport_width=1280, viewport_height=720)
        self.assertEqual(image_to_viewport(366.0, 158.0, frame), (183.0, 79.0))

    def test_a_downscaled_image_scales_back_to_the_viewport(self):
        # The same screenshot shrunk to 1456x819 before a model saw it.
        frame = Frame(image_width=1456, image_height=819, viewport_width=1280, viewport_height=720)
        x, y = image_to_viewport(728.0, 409.5, frame)
        self.assertAlmostEqual(x, 640.0)
        self.assertAlmostEqual(y, 360.0, places=0)

    def test_scrolling_after_the_screenshot_moves_the_target(self):
        frame = Frame(image_width=1280, image_height=720, viewport_width=1280, viewport_height=720, scroll_y=0)
        self.assertEqual(image_to_viewport(183.0, 479.0, frame, scroll_y=300), (183.0, 179.0))

    def test_a_target_scrolled_out_of_view_is_refused(self):
        frame = Frame(image_width=1280, image_height=720, viewport_width=1280, viewport_height=720)
        with self.assertRaises(OffscreenTarget):
            image_to_viewport(183.0, 79.0, frame, scroll_y=300)

    def test_a_point_outside_the_image_is_refused(self):
        frame = Frame(image_width=1280, image_height=720, viewport_width=1280, viewport_height=720)
        with self.assertRaises(OffscreenTarget):
            image_to_viewport(1300.0, 79.0, frame)

    def test_a_cropped_or_padded_image_is_refused(self):
        # Different scale on each axis means the image is not a plain resize of the viewport.
        frame = Frame(image_width=1280, image_height=1280, viewport_width=1280, viewport_height=720)
        with self.assertRaises(ValueError):
            image_to_viewport(10.0, 10.0, frame)

    def test_round_trip_at_both_scales(self):
        for scale in (1, 2):
            frame = Frame(image_width=1280 * scale, image_height=720 * scale, viewport_width=1280, viewport_height=720)
            self.assertEqual(image_to_viewport(*viewport_to_image(183.5, 79.5, frame), frame), (183.5, 79.5))


class PngSize(unittest.TestCase):
    def test_the_header_gives_the_image_size(self):
        header = b"\x89PNG\r\n\x1a\n" + (13).to_bytes(4, "big") + b"IHDR" + (2560).to_bytes(4, "big") + (1440).to_bytes(4, "big")
        self.assertEqual(png_size(header + b"\x08\x06\x00\x00\x00"), (2560, 1440))

    def test_other_bytes_are_refused(self):
        with self.assertRaises(ValueError):
            png_size(b"GIF89a" + bytes(30))


class SetOfMark(unittest.TestCase):
    def test_only_interactive_elements_become_marks(self):
        marks = parse_marks(SNAPSHOT)
        self.assertEqual([(m.ref, m.role, m.name) for m in marks], [
            ("e9", "button", "Download March 2026 CSV"),
            ("e11", "textbox", "Username"),
            ("e14", "button", "Dismiss"),
        ])
        self.assertEqual(marks[0].box, (93.0, 69.0, 181.0, 21.0))
        self.assertEqual(marks[0].center, (183.5, 79.5))

    def test_a_point_inside_one_mark_picks_it(self):
        self.assertEqual(pick_mark(183.0, 79.0, parse_marks(SNAPSHOT)).ref, "e9")

    def test_a_point_on_no_mark_picks_nothing(self):
        self.assertIsNone(pick_mark(600.0, 600.0, parse_marks(SNAPSHOT)))

    def test_a_point_inside_two_overlapping_marks_is_ambiguous(self):
        marks = [Mark("e1", "button", "Download March 2026 CSV", (100, 100, 200, 30)),
                 Mark("e2", "button", "Dismiss", (250, 90, 100, 40))]
        self.assertIsNone(pick_mark(275.0, 110.0, marks))
        self.assertEqual(pick_mark(150.0, 110.0, marks).ref, "e1")  # control: outside the overlap


if __name__ == "__main__":
    unittest.main()
