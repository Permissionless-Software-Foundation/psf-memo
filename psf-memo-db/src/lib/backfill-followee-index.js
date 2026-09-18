/*
  Library to build the followeeHeights notification read index from an
  existing follows store.

  followeeHeights is keyed `${followeePkHash}:${padded blockHeight}:${followerAddr}`
  with value `{ followerAddr, followeePkHash, unfollow, txid, seen, blockHeight }`.
  The read side range-scans one followee's entries to find its newest follow per
  follower, so the index must carry every follow and unfollow event at its block
  height.

  The backfill writes one entry per follows record at that record's latest block
  height. It rebuilds from the follows store only, is idempotent, and leaves the
  follows store unchanged.

  The LevelDB handles are injected so the logic stays testable and free of
  file-system concerns; the CLI wrapper in util/follow opens the real stores.
*/

const HEIGHT_PAD = 12

export function followeeHeightKey (followeePkHash, blockHeight, followerAddr) {
  const padded = String(blockHeight ?? 0).padStart(HEIGHT_PAD, '0')
  return `${followeePkHash}:${padded}:${followerAddr}`
}

// Recover the follower and followee from a follows key of the form
// `${followerAddr}:${followeePkHash}`. Cash addresses contain a colon, so the
// followee hash is the segment after the final colon.
function partsFromKey (key) {
  const str = String(key)
  const idx = str.lastIndexOf(':')
  return {
    followerAddr: str.slice(0, idx),
    followeePkHash: str.slice(idx + 1)
  }
}

export async function backfillFolloweeIndex ({ followsDb, followeeHeightsDb }) {
  let follows = 0

  for await (const [key, record] of followsDb.iterator()) {
    const fallback = partsFromKey(key)
    const followerAddr = record?.followerAddr || fallback.followerAddr
    const followeePkHash = record?.followeePkHash || fallback.followeePkHash
    if (!followerAddr || !followeePkHash) continue

    const blockHeight = record?.blockHeight ?? 0
    await followeeHeightsDb.put(followeeHeightKey(followeePkHash, blockHeight, followerAddr), {
      followerAddr,
      followeePkHash,
      unfollow: record?.unfollow ?? false,
      txid: record?.txid,
      seen: record?.seen,
      blockHeight
    })
    follows++
  }

  return { follows }
}
