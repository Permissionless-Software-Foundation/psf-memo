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

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
