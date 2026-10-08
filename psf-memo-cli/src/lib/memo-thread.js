/*
  Pure helpers for the memo-thread read command.

  The command reads a Memo post and its nested reply tree from psf-memo-db.
  This module owns the required -t txid validation and the human-readable tree
  summary, so the command itself is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { parseTxidFlag } from './txid-flag.js'

// Resolve the required post txid from the command-line flags.
export function parseThreadFlags (flags = {}) {
  return parseTxidFlag(flags)
}

// Render one post line, then its replies depth-first, indented under their
// parent. The service order (oldest first) is preserved as received.
function renderNode (node, depth, lines) {
  const indent = '  '.repeat(depth)
  lines.push(
    `${indent}${node.txid}: ${node.text} (replies ${node.replyCount}, likes ${node.likeCount})`
  )

  for (const reply of node.replies || []) {
    renderNode(reply, depth + 1, lines)
  }
}

// Render the human-readable thread summary starting at the root post.
export function formatThreadMessage (post = {}) {
  const lines = []
  renderNode(post, 0, lines)
  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:55:47.541Z","module_hash":"91eb90a9093e1de8f1656c7d9d7453f3cc432db1f385ae72cce64e03bd14c4b3","functions":[{"id":"func/parseThreadFlags","name":"parseThreadFlags","line":14,"end_line":16,"hash":"a9273824f798dc67f11f28ee077f125e7ea59c7f4df16495468179a241c95d3b"},{"id":"func/renderNode","name":"renderNode","line":20,"end_line":29,"hash":"b726098a7af66192bae6a55df42f6f7f00970e1e0f7ee43a4aa6cdda3a2409ea"},{"id":"func/formatThreadMessage","name":"formatThreadMessage","line":32,"end_line":36,"hash":"e09adfc324d9bd1ef2b39d3ba6c86577fea66b6e216ef9a75f5f00ccfa7631f1"}]}
// mutate4javascript-manifest-end
