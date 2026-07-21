import { reportNonFatalError } from "@crikket/shared/lib/errors"
import {
  assertBrowserTabSurface,
  canvasToBlob,
  prepareCaptureVideo,
  releaseCaptureVideo,
  requestDisplayStream,
} from "./display-capture"

async function loadDomScreenshot(): Promise<Blob> {
  // The fallback ships as a separate chunk; a failed load (stale deploy, CSP,
  // dropped network) surfaces as an opaque module error, so translate only the
  // import failure — a failure inside the capture keeps its own message.
  let captureDomScreenshot: typeof import("./capture-dom-screenshot").captureDomScreenshot
  try {
    ;({ captureDomScreenshot } = await import("./capture-dom-screenshot"))
  } catch (error) {
    reportNonFatalError("capture-screenshot:load-dom-fallback", error)
    throw new Error(
      "Screenshot capture is temporarily unavailable. Please reload the page and try again."
    )
  }

  return captureDomScreenshot()
}

export async function captureScreenshot(): Promise<Blob> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return loadDomScreenshot()
  }

  const stream = await requestDisplayStream(false)
  assertBrowserTabSurface(stream)
  const video = document.createElement("video")

  try {
    const track = stream.getVideoTracks()[0]
    if (!track) {
      throw new Error("No video track available for screenshot capture.")
    }

    await prepareCaptureVideo(video, stream)

    const width = video.videoWidth
    const height = video.videoHeight
    if (!(width > 0 && height > 0)) {
      throw new Error("Captured screen dimensions were invalid.")
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Failed to initialize screenshot canvas.")
    }

    context.drawImage(video, 0, 0, width, height)
    return canvasToBlob(canvas, "image/png")
  } finally {
    releaseCaptureVideo(video)
    for (const currentTrack of stream.getTracks()) {
      currentTrack.stop()
    }
  }
}
