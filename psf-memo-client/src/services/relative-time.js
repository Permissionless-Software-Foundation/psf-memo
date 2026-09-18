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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T13:14:01.486Z","module_hash":"6634036bb8540c472635da18b1a0932b5eb83a7454bb48ba25f6b323fdd1d69d","functions":[{"id":"func/relativeTime","name":"relativeTime","line":16,"end_line":29,"hash":"ee4cb814f0fb308d2a7d2c8cccaf2369b0fc84462569f0db0668f647ad2b4980"}]}
// mutate4javascript-manifest-end
