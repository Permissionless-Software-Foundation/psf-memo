/*
  Reply count view model.

  Derives the label, tooltip, accessible name, and interactive attributes for a
  post's reply-count indicator from its count and optional click handler. Kept
  out of the React view so the branching is unit-testable and the view stays a
  thin presentational wrapper.
*/

// The human label for a reply count.
function replyCountLabel (count) {
  return count === 1 ? '1 reply' : `${count} replies`
}

// Whether a keyboard event should activate a clickable reply count.
function isReplyCountActivationKey (event) {
  return event.key === 'Enter' || event.key === ' '
}

// The class list for a reply count, interactive or not.
function replyCountClassName (clickable) {
  return clickable
    ? 'post-reply-count post-reply-count-always-clickable'
    : 'post-reply-count post-reply-count-disabled'
}

// The native tooltip for a reply count.
function replyCountTitle (label, clickable) {
  return clickable ? `${label} — click to view` : label
}

// The accessible name for a reply count.
function replyCountAriaLabel (label, clickable) {
  return clickable ? `${label} — click to view thread` : label
}

// The keyboard handler for a reply count, or undefined when not clickable.
function makeReplyCountKeyDown (clickable, onClick) {
  if (!clickable) return undefined
  return (event) => {
    if (isReplyCountActivationKey(event)) {
      event.preventDefault()
      onClick()
    }
  }
}

// The interactive DOM attributes for a reply count. Non-interactive counts
// expose none of them so the element is inert to pointer and keyboard input.
function replyCountInteractiveProps (clickable, onClick, onKeyDown) {
  if (!clickable) {
    return { role: undefined, tabIndex: undefined, onClick: undefined, onKeyDown: undefined }
  }
  return { role: 'button', tabIndex: 0, onClick, onKeyDown }
}

// Build the full view model for a reply count.
function buildReplyCountViewModel ({ count = 0, onClick } = {}) {
  const label = replyCountLabel(count)
  const clickable = typeof onClick === 'function'
  const onKeyDown = makeReplyCountKeyDown(clickable, onClick)
  return {
    label,
    clickable,
    className: replyCountClassName(clickable),
    title: replyCountTitle(label, clickable),
    ariaLabel: replyCountAriaLabel(label, clickable),
    ...replyCountInteractiveProps(clickable, onClick, onKeyDown)
  }
}

module.exports = {
  replyCountLabel,
  isReplyCountActivationKey,
  replyCountClassName,
  replyCountTitle,
  replyCountAriaLabel,
  makeReplyCountKeyDown,
  replyCountInteractiveProps,
  buildReplyCountViewModel
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T19:56:26.385Z","module_hash":"e35f63629091deff8fe3e17697712c691a0e24cf6ed009db9452213e278dae30","functions":[{"id":"func/replyCountLabel","name":"replyCountLabel","line":11,"end_line":13,"hash":"de614348c303edca9de3fa553a58b842cfbe48208d97f7bddc7abb5f43f7a22c"},{"id":"func/isReplyCountActivationKey","name":"isReplyCountActivationKey","line":16,"end_line":18,"hash":"80b39f16b455215367868b38926dc5b6783a4b1cf2ca5b1404ee4d6e0a1f0ac5"},{"id":"func/replyCountClassName","name":"replyCountClassName","line":21,"end_line":25,"hash":"55da609a35f0ea5d52b0aeede886bb05222ee842567e93e5cbf7d7d97b91e463"},{"id":"func/replyCountTitle","name":"replyCountTitle","line":28,"end_line":30,"hash":"cc6571160a1632c3e6eaab05175fc750fa679d77504096a6a3ffaf8266aa02b0"},{"id":"func/replyCountAriaLabel","name":"replyCountAriaLabel","line":33,"end_line":35,"hash":"a3aaa4cf2678abf67fe3ee8c4693445bf1b24518945e5a9c6686355f1f5c0baa"},{"id":"func/makeReplyCountKeyDown","name":"makeReplyCountKeyDown","line":38,"end_line":46,"hash":"6f82191fc8e56445ea79a26dfb222c4fa945914741719d06e86a65f7465c9b85"},{"id":"func/replyCountInteractiveProps","name":"replyCountInteractiveProps","line":50,"end_line":55,"hash":"f92cdc69853334e30ece3d4d54bd5a34dbadbb6ffcb176b5210c514e478b76a7"},{"id":"func/buildReplyCountViewModel","name":"buildReplyCountViewModel","line":58,"end_line":70,"hash":"29d40d8d0a50e28bc35f1401ff01eae5799c4b1fc213b538e0a99565454b9108"}]}
// mutate4javascript-manifest-end
