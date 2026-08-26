/*
  Helpers for loading display names and avatars for thread participants.
*/

export function collectPostAddrs (posts) {
  return [...new Set((posts || []).map((post) => post.addr).filter(Boolean))]
}

export function collectThreadAddrs (post) {
  const addrs = new Set()

  function walk (node) {
    if (!node?.addr) return
    addrs.add(node.addr)
    for (const reply of node.replies || []) {
      walk(reply)
    }
  }

  walk(post)
  return [...addrs]
}

export async function loadThreadProfiles (addrs, memoDb) {
  const profiles = {}

  await Promise.all(addrs.map(async (addr) => {
    const [nameRecord, profilePic] = await Promise.all([
      memoDb.getName(addr),
      memoDb.getProfilePic(addr)
    ])

    profiles[addr] = {
      name: nameRecord?.name || null,
      profilePicUrl: profilePic?.url || null
    }
  }))

  return profiles
}
