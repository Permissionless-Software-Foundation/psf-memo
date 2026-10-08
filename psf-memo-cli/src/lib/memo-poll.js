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
