/*
  Browser clipboard adapter.

  Writing to the clipboard is an environment capability, not view logic, so it
  lives behind this small module instead of inside the presentational view. The
  clipboard object is injectable so the write can be exercised without a
  browser; when no clipboard is available the call is a safe no-op (the Node
  acceptance render never invokes the click handler).
*/

// The browser clipboard, or null when the code runs outside a browser.
function defaultClipboard () {
  if (typeof navigator !== 'undefined' && navigator.clipboard) return navigator.clipboard
  return null
}

// Copy a value through a clipboard-like object. No-op without a usable
// clipboard.
function copyToClipboard (value, clipboard = defaultClipboard()) {
  if (clipboard && typeof clipboard.writeText === 'function') {
    clipboard.writeText(value)
  }
}

module.exports = { copyToClipboard, defaultClipboard }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T03:01:52.600Z","module_hash":"d4ef844196f07047b642bd0059367a3b3965ad4ca73215022a009f92b61e8c6d","functions":[{"id":"func/defaultClipboard","name":"defaultClipboard","line":12,"end_line":15,"hash":"e3211984d6afe723cc309e17648b7033660bb2c33f5a00e8ec39d17c43abd19e"},{"id":"func/copyToClipboard","name":"copyToClipboard","line":19,"end_line":23,"hash":"9cc3646ada2d53a3e317baaa20b9a0e247c81dbe5cd84aa544c5d288c12921d5"}]}
// mutate4javascript-manifest-end
