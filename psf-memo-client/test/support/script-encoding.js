/*
  Test helper: encode a script the way Bitcoin does.

  An opcode number is one byte; a Buffer/string becomes a length-prefixed push.
  Enough to observe that the multi-push adapter produced the expected pushes.
  Shared by the memo-multipush unit and property tests.
*/

'use strict'

function encodeScript (script) {
  const parts = script.map((el) => {
    if (typeof el === 'number') return Buffer.from([el])
    const buf = Buffer.from(el)
    return Buffer.concat([Buffer.from([buf.length]), buf])
  })
  return Buffer.concat(parts)
}

module.exports = { encodeScript }
