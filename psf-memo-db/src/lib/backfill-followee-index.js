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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T17:30:00.947Z","module_hash":"5cd1b81bb834e1f6ecf5090b41188b4e11d4afcca1663e8327c0c0ceb0d13669","functions":[{"id":"func/followeeHeightKey","name":"followeeHeightKey","line":21,"end_line":24,"hash":"10d2c8d5b02bc6dcfd351dea804cf1bcd4d5665217a88e6c9409f2dce4389f6c"},{"id":"func/partsFromKey","name":"partsFromKey","line":29,"end_line":36,"hash":"dc48c7f65097b2d27f48a5ddd213c99b39ad25116335289b67579539f162b720"},{"id":"func/backfillFolloweeIndex","name":"backfillFolloweeIndex","line":38,"end_line":60,"hash":"b38782b219da6a05fb2257fbeed1417561a1de746586fdd4fce472680daf4514"}]}
// mutate4javascript-manifest-end
