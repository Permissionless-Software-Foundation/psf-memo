/*
  Shared pure helpers for the search feature.

  normalizeQuery normalizes a user query for case-insensitive substring
  matching. sortByHeightDesc orders posts/profiles by block height descending,
  breaking ties by seen timestamp. Both are shared by the search use case and
  the search adapter so the behavior stays identical across callers.
*/

export function normalizeQuery (query) {
  return String(query ?? '').trim().toLowerCase()
}

export function sortByHeightDesc (a, b) {
  if (b.blockHeight !== a.blockHeight) {
    return b.blockHeight - a.blockHeight
  }
  return (b.seen || 0) - (a.seen || 0)
}
