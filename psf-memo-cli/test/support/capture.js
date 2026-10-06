/*
  A write-only stream stand-in shared by the psf-memo-cli test suites.

  Both the unit/property suites and the acceptance step handlers need to
  capture reporter output without touching the real process streams, so they
  share this helper rather than each defining their own sink.
*/

// Return a sink that accumulates every chunk written to it.
export function captureStream () {
  const chunks = []
  return {
    stream: { write: (chunk) => { chunks.push(chunk) } },
    text: () => chunks.join('')
  }
}
