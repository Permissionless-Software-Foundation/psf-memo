/*
  Format the time since a topic's most recent post as a short label.

  Inputs are epoch milliseconds: `lastSeen` is the room's most recent post
  time (0 when the room has no posts) and `now` is the current time. The
  labels match the topics page contract:
    - no posts           -> "No posts"
    - less than an hour  -> "Less than an hour ago"
    - under 24 hours     -> "N hours ago" (singular "1 hour ago")
    - 24 hours or more   -> "N days ago" (singular "1 day ago")
*/

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function relativeTime (lastSeen, now = Date.now()) {
  if (!lastSeen) return 'No posts'

  const elapsed = now - lastSeen
  if (elapsed < HOUR_MS) return 'Less than an hour ago'

  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  const days = Math.floor(elapsed / DAY_MS)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

module.exports = { relativeTime }
