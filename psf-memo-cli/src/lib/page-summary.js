/*
  Shared rendering for paginated read-command summaries.

  Several read commands report a count line and the service pagination
  unchanged, so the shared fragments live here rather than being duplicated
  across the feed, notifications, and topics summaries.
*/

// Render the "Read N <noun>" count line, pluralizing the noun.
export function formatReadCount (count, noun) {
  return `Read ${count} ${noun}${count === 1 ? '' : 's'}`
}

// Render the service pagination line unchanged (limit, offset, total, hasMore).
export function formatPagination (pagination = {}) {
  return `pagination: limit ${pagination.limit}, offset ${pagination.offset}, total ${pagination.total}, hasMore ${pagination.hasMore}`
}

// Render a paged summary: the "Read N <noun>" count, one line per item rendered
// by `formatItem`, then the service pagination.
export function formatPageSummary (items, noun, formatItem, pagination = {}) {
  const lines = [formatReadCount(items.length, noun)]

  for (const item of items) {
    lines.push(formatItem(item))
  }

  lines.push(formatPagination(pagination))

  return lines.join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-07T20:54:13.023Z","module_hash":"cc155bc69013d6084df09552ff601e8aceaec23733d46c9b197ef35fcf60fa1c","functions":[{"id":"func/formatReadCount","name":"formatReadCount","line":10,"end_line":12,"hash":"cd5b06430e5b4c14b2d47b2c14ae3c2716b3b1ea6b6e1ad36705ffa7b6227a5f"},{"id":"func/formatPagination","name":"formatPagination","line":15,"end_line":17,"hash":"54f39da076071bc67705460bc03ccd8da7c76295328defed722cd3ba9a168d0a"},{"id":"func/formatPageSummary","name":"formatPageSummary","line":21,"end_line":31,"hash":"29aaae49209f1bf1c3d9a06805312ec86a8e64dd42b3daa5080aba093a4d760e"}]}
// mutate4javascript-manifest-end
