/*
  Shared base for Memo profile-text actions (set name, set bio, set avatar URL).

  A profile-text action composes, validates, and broadcasts an OP_RETURN
  transaction carrying a short text field (a name, bio, or avatar URL) and
  reflects the result on an injected profile store. The three concrete actions
  differ only in their protocol prefix, byte limit, error codes, and the
  profile store method they write; this base supplies the shared broadcast
  method binding and a config factory so each subclass stays a thin data
  declaration.

  Subclasses supply a static config built by profileTextConfig:
    prefix         - hex prefix for the Memo action (e.g. 0x6d0a)
    noun           - human noun for the field ("avatar URL", "bio", "name")
    code           - short code used to build the error codes ("avatar_url")
    maxBytes       - the field's byte limit
    profileMethod  - the injected profile store method to write on success

  The wallet and profiles store are injected so this module stays testable and
  free of network/UI concerns; environmentally unsuitable I/O lives behind those
  small adapter boundaries.
*/

const MemoAction = require('./memo-action')

// Build the static config for a Memo profile-text action from a small spec.
function profileTextConfig ({ prefix, noun, code, maxBytes, profileMethod }) {
  const capitalized = noun.charAt(0).toUpperCase() + noun.slice(1)
  return {
    prefix,
    walletRequiredMsg: `Memo set ${noun} requires a wallet.`,
    lengthMessage: `${capitalized} is too long. Maximum is ${maxBytes} bytes.`,
    emptyMessage: `${capitalized} must not be empty.`,
    lengthCode: `${code}_length`,
    validationCode: `${code}_validation`,
    maxBytes,
    profileMethod,
    actionMethod: profileMethod
  }
}

class MemoProfileTextAction extends MemoAction {
  // Bind the broadcast method under the config's actionMethod so page
  // controllers can invoke it by that name (e.g. memoSetAvatarUrl.setAvatarUrl).
  constructor (deps = {}) {
    super(deps)
    const method = this.constructor.config.actionMethod
    this[method] = async (value) => this.broadcast(value)
  }
}

MemoProfileTextAction.profileTextConfig = profileTextConfig

module.exports = MemoProfileTextAction

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T16:57:59.182Z","module_hash":"101611ef1fa18260af869f9c65140a4ef35716649a5a0a64e838fe68d5114b4f","functions":[{"id":"func/profileTextConfig","name":"profileTextConfig","line":27,"end_line":40,"hash":"73d0c1953b628958acf23c16ae27f38c200bafc8568cb0daa8737ea2be2282c8"},{"id":"func/MemoProfileTextAction.constructor","name":"MemoProfileTextAction.constructor","line":45,"end_line":49,"hash":"75d5bb04a9d31690f94a3e2337cce03cbe62202bb4fd33b44949562288626605"}]}
// mutate4javascript-manifest-end
