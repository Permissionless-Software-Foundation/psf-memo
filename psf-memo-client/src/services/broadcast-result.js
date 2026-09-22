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
