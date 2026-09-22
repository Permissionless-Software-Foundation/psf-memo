/*
  Pure accessors for a broadcast-result record.

  A page controller records a broadcast result after a Memo follow, mute, or
  similar action: { ok: true, action, txid } on success or
  { ok: false, action, message } on failure. These helpers read that shape
  without knowing which action produced it, so the page controllers present the
  same result-modal contract and the record shape lives in one place.
*/

// The success message for a result, chosen by its action name, or '' when the
// result is missing or failed. `fallbackMessage` is the message for the
// action(s) the caller does not list in `messagesByAction`.
function broadcastSuccessMessage (result, messagesByAction = {}, fallbackMessage = '') {
  if (!result || !result.ok) return ''
  return messagesByAction[result.action] || fallbackMessage
}

// The failure message for a result, or '' when the result is missing or
// succeeded.
function broadcastErrorMessage (result) {
  if (!result || result.ok) return ''
  return result.message || ''
}

module.exports = { broadcastSuccessMessage, broadcastErrorMessage }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-22T15:57:03.485Z","module_hash":"ae092754a66e8dde48a21a24cd9b64780b1cbc0119dc49853f0355d8c8530dd3","functions":[{"id":"func/broadcastSuccessMessage","name":"broadcastSuccessMessage","line":14,"end_line":17,"hash":"191af541dd0628cb7fc7e0cc6c585a3bf8c218406c8d653640da3da88f17814a"},{"id":"func/broadcastErrorMessage","name":"broadcastErrorMessage","line":21,"end_line":24,"hash":"33ea3635876f3059705c33a77af0acbe6d77eb0f6c4f0adc1cff0c3922829a10"}]}
// mutate4javascript-manifest-end
