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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T20:29:47.554Z","module_hash":"b203efb0ad34ccdfd57450c14f280dedf4447feaf8c56213c625bdd2cbbae074","functions":[{"id":"func/formatSeen","name":"formatSeen","line":12,"end_line":16,"hash":"47d4d15d1e7030a586c04b0f161a88e1ae5cce0ef3581c35c4ab200c24748355"}]}
// mutate4javascript-manifest-end
