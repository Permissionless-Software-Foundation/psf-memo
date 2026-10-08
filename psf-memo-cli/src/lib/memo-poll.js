/*
  Pure helper for the memo-poll read command.

  The command reads a single poll (its question, options, and votes) from
  psf-memo-db. This module owns the human-readable summary; the command is a
  thin wiring layer over the shared reporter and the read-only Memo DB client.
*/

// Render the human-readable summary of a poll: its question, one line per
// option with its author, then one line per vote with its voter and comment.
export function formatPollMessage (poll = {}) {
  const lines = [`question: ${poll.question}`]

  for (const option of poll.options || []) {
    lines.push(`option ${option.option} from ${option.addr}`)
  }

  for (const vote of poll.votes || []) {
    lines.push(`vote from ${vote.addr}: ${vote.comment}`)
  }

  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:53:19.059Z","module_hash":"8c9e2aa842811393d0bfb10cbfe18e57c1c0ea9574e3b257e7597cabf4fe8918","functions":[{"id":"func/formatPollMessage","name":"formatPollMessage","line":11,"end_line":23,"hash":"ceca79bf47ff7ab0fbfeaa9012a5c5a51bb2f43c973d8f2b6f3fecc99e72905a"}]}
// mutate4javascript-manifest-end
