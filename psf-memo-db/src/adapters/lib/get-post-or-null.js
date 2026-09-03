/*
  Shared helper to fetch a post by txid, returning null when not found.

  Both the post query and notifications query adapters need to look up a post
  by txid and treat a missing record as null. Centralizing the lookup keeps
  not-found behavior identical across adapters.
*/

export async function getPostOrNull (postsDb, txid) {
  try {
    return await postsDb.get(txid)
  } catch (err) {
    if (err.notFound || err.code === 'LEVEL_NOT_FOUND') return null
    throw err
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-03T21:02:50.881Z","module_hash":"dc90dc5717937cb47da000846b351e798c679e4b6149762f357b14a705db01b9","functions":[{"id":"func/getPostOrNull","name":"getPostOrNull","line":9,"end_line":16,"hash":"f633a6b98ca1a0e21b8c544e53a37744d4a2ebc6e5d2c9dba71a3fe951d77220"}]}
// mutate4javascript-manifest-end
