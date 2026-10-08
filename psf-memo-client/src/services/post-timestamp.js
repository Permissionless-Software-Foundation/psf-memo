/*
  Post timestamp formatting.

  A Memo post carries a `seen` value that may be epoch seconds or epoch
  milliseconds depending on the API path. Format either as the same locale date
  and time string so the profile and account feeds show a consistent
  timestamp. Falsy values format to an empty string so a card can omit the
  timestamp. Kept as a small pure service so the JSX pages and the Node
  acceptance renderer share it.
*/

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

module.exports = { formatSeen }
