import { reportNonFatalError } from "@crikket/shared/lib/errors"
import { domToBlob } from "modern-screenshot"

const DOM_CAPTURE_TIMEOUT_MS = 15_000
// Safari and Firefox decode cloned images lazily; a delay between canvas draws
// keeps them from rendering blank where an image had not finished decoding.
const DOM_CAPTURE_DRAW_IMAGE_INTERVAL_MS = 100
// WebKit caps canvas area far below the browser default (unlimited). A full-page
// capture on iOS at a high pixel ratio silently produces a blank canvas above
// that cap, so bound both the edge size and the scale.
const DOM_CAPTURE_MAX_CANVAS_SIZE = 8192
const DOM_CAPTURE_MAX_SCALE = 2
// 1x1 transparent GIF — modern-screenshot's own default for images that fail to
// load. Reused so a reported failure still renders identically to the default.
const TRANSPARENT_PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
const TRANSPARENT_COLOR_PATTERN = /(?:transparent|rgba?\([^)]*,\s*0\s*\))/i

// Fallback for browsers without `getDisplayMedia` (all iOS browsers, which are
// WebKit-only). Rasterizes the live DOM rather than a real display frame, so it
// reproduces the DOM, not a pixel-accurate capture: cross-origin media and some
// CSS effects render approximately.
//
// Resolves with a PNG blob. Rejects if the document root is unavailable or the
// underlying render times out. Assets that fail to load do not reject; they are
// reported and left blank so the rest of the capture still succeeds.
export async function captureDomScreenshot(): Promise<Blob> {
  const target = document.documentElement
  if (!target) {
    throw new Error("No document is available for screenshot capture.")
  }

  return await domToBlob(target, {
    type: "image/png",
    backgroundColor: resolveBackgroundColor(target),
    scale: Math.min(window.devicePixelRatio || 1, DOM_CAPTURE_MAX_SCALE),
    maximumCanvasSize: DOM_CAPTURE_MAX_CANVAS_SIZE,
    drawImageInterval: DOM_CAPTURE_DRAW_IMAGE_INTERVAL_MS,
    timeout: DOM_CAPTURE_TIMEOUT_MS,
    fetch: {
      placeholderImage: (cloned) => {
        reportNonFatalError(
          "capture-dom-screenshot:asset-load",
          new Error(
            `Failed to embed image while capturing screenshot: ${cloned.getAttribute("src") ?? "unknown"}`
          ),
          { once: true }
        )
        return TRANSPARENT_PLACEHOLDER_IMAGE
      },
    },
  })
}

// A transparent page background renders as black/checkerboard in the PNG, which
// misrepresents the page. `getComputedStyle(body).backgroundColor` reports
// `rgba(0, 0, 0, 0)` for the common case where the real color sits on the root
// element, so fall through to the root before defaulting to white.
function resolveBackgroundColor(root: HTMLElement): string {
  const candidates = [document.body, root]
  for (const element of candidates) {
    if (!element) {
      continue
    }

    const color = getComputedStyle(element).backgroundColor
    if (color && !TRANSPARENT_COLOR_PATTERN.test(color)) {
      return color
    }
  }

  return "#ffffff"
}
