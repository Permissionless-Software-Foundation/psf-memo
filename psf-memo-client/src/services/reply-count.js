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
