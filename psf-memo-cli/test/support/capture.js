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

// Run `fn` while routing console.log through `sink`, then restore the original
// console.log even when `fn` throws. The wallet library logs its construction
// banner with console.log, so this makes that output observable on a captured
// sink instead of the real process stdout.
export async function withConsoleLog (sink, fn) {
  const original = console.log
  console.log = (...args) => sink.write(`${args.join(' ')}\n`)
  try {
    return await fn()
  } finally {
    console.log = original
  }
}

// Run `fn` while replacing console.log/console.error with a recording sink,
// then restore them and return everything printed.
export async function captureConsole (fn) {
  const chunks = []
  const original = { log: console.log, error: console.error }
  console.log = (...args) => chunks.push(args.join(' '))
  console.error = (...args) => chunks.push(args.join(' '))
  try {
    await fn()
  } finally {
    console.log = original.log
    console.error = original.error
  }
  return chunks.join('\n')
}
