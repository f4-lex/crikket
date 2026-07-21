import { afterEach, describe, expect, it, mock } from "bun:test"

const displayScreenshot = new Blob(["display"], { type: "image/png" })
const domScreenshot = new Blob(["dom"], { type: "image/png" })

let requestDisplayStreamCalls = 0
let captureDomScreenshotCalls = 0

mock.module("../src/media/display-capture", () => ({
  requestDisplayStream: () => {
    requestDisplayStreamCalls += 1
    return Promise.resolve({
      getVideoTracks: () => [
        { getSettings: () => ({ displaySurface: "browser" }) },
      ],
      getTracks: () => [{ stop: () => undefined }],
    })
  },
  assertBrowserTabSurface: () => undefined,
  prepareCaptureVideo: () => Promise.resolve(),
  releaseCaptureVideo: () => undefined,
  canvasToBlob: () => Promise.resolve(displayScreenshot),
}))

mock.module("../src/media/capture-dom-screenshot", () => ({
  captureDomScreenshot: () => {
    captureDomScreenshotCalls += 1
    return Promise.resolve(domScreenshot)
  },
}))

function setDisplayMediaSupport(supported: boolean): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: supported
      ? { mediaDevices: { getDisplayMedia: () => undefined } }
      : {},
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({
        videoWidth: 1280,
        videoHeight: 720,
        getContext: () => ({ drawImage: () => undefined }),
      }),
    },
  })
}

async function loadCaptureScreenshot() {
  return (await import("../src/media/capture-screenshot")).captureScreenshot
}

afterEach(() => {
  requestDisplayStreamCalls = 0
  captureDomScreenshotCalls = 0
})

describe("captureScreenshot display-media detection", () => {
  it("uses the DOM fallback when getDisplayMedia is unavailable", async () => {
    setDisplayMediaSupport(false)
    const captureScreenshot = await loadCaptureScreenshot()

    const blob = await captureScreenshot()

    expect(blob).toBe(domScreenshot)
    expect(captureDomScreenshotCalls).toBe(1)
    expect(requestDisplayStreamCalls).toBe(0)
  })

  it("uses display capture when getDisplayMedia is available", async () => {
    setDisplayMediaSupport(true)
    const captureScreenshot = await loadCaptureScreenshot()

    const blob = await captureScreenshot()

    expect(blob).toBe(displayScreenshot)
    expect(requestDisplayStreamCalls).toBe(1)
    expect(captureDomScreenshotCalls).toBe(0)
  })
})
