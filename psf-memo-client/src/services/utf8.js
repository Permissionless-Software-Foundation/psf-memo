/*
  UTF-8 byte-length helper for browser and Node.

  The Node global `Buffer` is not available in the browser, so byte counting
  (used by the Memo set-name byte counter and length check) must not depend on
  it. TextEncoder is available in both environments and reports the UTF-8 byte
  length of a string.
*/

// Encode a string as UTF-8 bytes. TextEncoder is available in both the
// browser and Node.
function encodeUtf8 (str) {
  return new TextEncoder().encode(String(str))
}

// Return the number of UTF-8 bytes in a string.
function byteLength (str) {
  return encodeUtf8(str).length
}

module.exports = { encodeUtf8, byteLength }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T04:11:15.796Z","module_hash":"530eeae383fa202f8e50d83126a9bafaaa49b04268f297e9e91027a89cde71b4","functions":[{"id":"func/encodeUtf8","name":"encodeUtf8","line":12,"end_line":14,"hash":"8d56bdd5607b741578d5f51511391e0376cc410181401b2570fde0990b6bf976"},{"id":"func/byteLength","name":"byteLength","line":17,"end_line":19,"hash":"4d5266d6b3715a761b533e67477846156cfbd497460e5af448a8ea7a72bb580c"}]}
// mutate4javascript-manifest-end
