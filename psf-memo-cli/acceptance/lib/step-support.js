/*
  Shared helpers for the psf-memo-cli Gherkin step handlers.
*/

// Substitute <param> step values from the current example row.
export function resolveParam (value, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(value).trim())
  if (match) {
    const param = match[1]
    if (!(param in example)) {
      throw new Error(`Missing example value for "${param}"`)
    }
    return example[param]
  }
  return String(value).trim()
}

// Assert a value equals the expected value, with a consistent failure message.
// `quote` wraps both rendered values in double quotes for text assertions.
export function assertEqual (actual, expected, label, { quote = false } = {}) {
  const show = (value) => (quote ? `"${value}"` : `${value}`)
  if (actual !== expected) {
    throw new Error(`Expected ${label} ${show(expected)}, got ${show(actual)}`)
  }
}
