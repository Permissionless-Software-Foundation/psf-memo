/*
  Pure helpers for the memo-thread read command.

  The command reads a Memo post and its nested reply tree from psf-memo-db.
  This module owns the required -t txid validation and the human-readable tree
  summary, so the command itself is a thin wiring layer over the shared
  reporter and the read-only Memo DB client.
*/

// Local libraries
import { UsageError } from './reporter.js'

// Resolve the required post txid from the command-line flags.
export function parseThreadFlags (flags = {}) {
  const txid = flags.txid

  if (!txid || txid === '') {
    throw new UsageError('You must specify a post txid with the -t flag.')
  }

  return { txid }
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
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
