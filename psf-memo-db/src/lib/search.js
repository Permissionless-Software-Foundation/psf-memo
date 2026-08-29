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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:18:40.416Z","module_hash":"de3b455b6e4376f7a860f74318a42fbe21734f8be5cbcd1a2c261d7c67d1910d","functions":[{"id":"func/normalizeQuery","name":"normalizeQuery","line":10,"end_line":12,"hash":"8257496a9daf753f6928fc7ae709f319231a86dbbd4058727346e6be8cd12896"},{"id":"func/sortByHeightDesc","name":"sortByHeightDesc","line":14,"end_line":19,"hash":"6c1f80c4b6362b75769a45106c24df2dabfd885dec67acd6d3226729905d7c43"}]}
// mutate4javascript-manifest-end
