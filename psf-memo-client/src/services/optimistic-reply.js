
// Build the optimistic reply object used by the reply form for immediate
// thread rendering before the thread is refreshed from the network. This is a
// pure data-shaping function so the reply object shape is unit-testable and
// the React form stays a thin adapter.
function buildOptimisticReply ({ txid, addr, text, seen, blockHeight, displayName }) {
  return {
    txid,
    addr,
    text,
    seen,
    blockHeight,
    replyCount: 0,
    replies: [],
    profile: displayName ? { name: displayName } : undefined
  }
}

module.exports = { buildOptimisticReply }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T12:18:01.970Z","module_hash":"feaca4cb374f34e47635d42df6a7459a8dfb623ec2425f85a19de090ab4286e0","functions":[{"id":"func/buildOptimisticReply","name":"buildOptimisticReply","line":7,"end_line":18,"hash":"531eb7347a4652e240f704936b2651e7e04506d6f5c0e10d33b37964be5e400a"}]}
// mutate4javascript-manifest-end
