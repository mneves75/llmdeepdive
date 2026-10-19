"""Lesson 18.2: turn a point on a screenshot into a point the browser can click.

Three spaces meet here. A model that sees a screenshot answers in *image
pixels*. Playwright's ``mouse.click`` takes *CSS pixels relative to the
viewport*. A screenshot taken with ``scale="device"`` (Playwright's default)
has one pixel per *device pixel*, so at device scale factor 2 it is twice the
viewport's size in each direction; a model provider may also shrink the image
before the model sees it. One ratio per axis, viewport size over image size,
covers both. Scrolling after the screenshot moves every target, so the frame
remembers the scroll position it was taken at.
"""

from __future__ import annotations

from dataclasses import dataclass


class OffscreenTarget(ValueError):
    """The point is outside the image, or no longer inside the viewport: observe again."""


@dataclass(frozen=True)
class Frame:
    """What one screenshot showed: its size, the viewport it came from, and the scroll at capture."""

    image_width: int  # pixels of the image the model saw
    image_height: int
    viewport_width: int  # CSS pixels
    viewport_height: int
    scroll_x: float = 0.0  # page scroll when the screenshot was taken, CSS pixels
    scroll_y: float = 0.0

    def ratio(self) -> float:
        """CSS pixels per image pixel. Unequal axes mean the image was cropped or padded, not resized."""
        across = self.viewport_width / self.image_width
        down = self.viewport_height / self.image_height
        if abs(across - down) > 0.01 * across:
            raise ValueError(f"image {self.image_width}x{self.image_height} is not a resize of viewport {self.viewport_width}x{self.viewport_height}")
        return across


def image_to_viewport(x: float, y: float, frame: Frame, *, scroll_x: float | None = None, scroll_y: float | None = None) -> tuple[float, float]:
    """Map an image pixel to viewport CSS pixels at the page's current scroll position."""
    if not (0 <= x <= frame.image_width and 0 <= y <= frame.image_height):
        raise OffscreenTarget(f"({x}, {y}) is outside the {frame.image_width}x{frame.image_height} image")
    ratio = frame.ratio()
    now_x = frame.scroll_x if scroll_x is None else scroll_x
    now_y = frame.scroll_y if scroll_y is None else scroll_y
    # Page point = where the frame started + offset inside it; the viewport starts at the current scroll.
    view_x = frame.scroll_x + x * ratio - now_x
    view_y = frame.scroll_y + y * ratio - now_y
    if not (0 <= view_x <= frame.viewport_width and 0 <= view_y <= frame.viewport_height):
        raise OffscreenTarget(f"the target is at ({view_x}, {view_y}), outside the viewport after scrolling")
    return (view_x, view_y)


def viewport_to_image(x: float, y: float, frame: Frame) -> tuple[float, float]:
    """The inverse at capture time: where a viewport point appears on the screenshot."""
    ratio = frame.ratio()
    return (x / ratio, y / ratio)


def png_size(data: bytes) -> tuple[int, int]:
    """Width and height from a PNG's header, so a frame records the image the model really got."""
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("not a PNG image")
    return (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))
