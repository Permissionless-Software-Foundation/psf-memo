/*
  UTF-8 byte-length helper for browser and Node.

  The Node global `Buffer` is not available in the browser, so byte counting
  (used by the Memo set-name byte counter and length check) must not depend on
  it. TextEncoder is available in both environments and reports the UTF-8 byte
  length of a string.
*/

// Return the number of UTF-8 bytes in a string.
function byteLength (str) {
  return new TextEncoder().encode(String(str)).length
}

module.exports = { byteLength }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:17:55.885Z","module_hash":"7f91541c49f2b6f421e8d4158bfe808b35a5449534cb26c567162fce6fec64bf","functions":[{"id":"func/byteLength","name":"byteLength","line":11,"end_line":13,"hash":"973c9dadcd1d8bbd53587252443880db13c8be3639fa74ce3c69a08ea358c8e2"}]}
// mutate4javascript-manifest-end
