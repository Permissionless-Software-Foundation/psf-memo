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

// Substitute <param> placeholders embedded anywhere in a template, such as a
// URL with an example-supplied txid or an expected error message with the
// example-supplied wallet error. A template with no placeholders is returned
// unchanged.
export function resolveTemplate (template, example) {
  return String(template).replace(/<([A-Za-z0-9_]+)>/g, (match, name) => {
    if (!(name in example)) {
      throw new Error(`Missing example value for "${name}"`)
    }
    return example[name]
  })
}

// Assert a value equals the expected value, with a consistent failure message.
// `quote` wraps both rendered values in double quotes for text assertions.
export function assertEqual (actual, expected, label, { quote = false } = {}) {
  const show = (value) => (quote ? `"${value}"` : `${value}`)
  if (actual !== expected) {
    throw new Error(`Expected ${label} ${show(expected)}, got ${show(actual)}`)
  }
}
