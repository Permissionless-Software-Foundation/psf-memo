/*
  Use case: list top-level posts from profiles the viewer follows, newest first.

  Joins the follows index with the global postHeights index. Replies and the
  viewer's own posts are excluded. Results are paginated with limit/offset.
*/

import { parseLimit, parseOffset, parseRequiredString, assemblePostPage } from './lib/pagination.js'
import { ListUseCase } from './lib/use-case.js'

class ListFollowingFeed extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'ListFollowingFeed', adapterName: 'postQuery' })
    if (!this.adapters.followQuery) {
      throw new Error('followQuery adapter required for ListFollowingFeed use case.')
    }
  }

  async execute (inObj = {}) {
    const addr = parseRequiredString(inObj.addr, 'addr')
    const limit = parseLimit(inObj.limit)
    const offset = parseOffset(inObj.offset)

    const followingAddrs = await this.adapters.followQuery.listFollowing(addr)
    const { txids, total } = await this.adapters.postQuery.scanFollowingFeedTxidsAndCount(
      addr,
      followingAddrs,
      { limit, offset }
    )
    const [posts, replyCounts, likeCounts] = await Promise.all([
      this.adapters.postQuery.loadPostsByTxids(txids),
      this.adapters.postQuery.countRepliesForTxids(txids),
      this.adapters.postQuery.countLikesForTxids(txids)
    ])

    return assemblePostPage({ posts, replyCounts, likeCounts, total, limit, offset })
  }
}

export default ListFollowingFeed

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:02:18.559Z","module_hash":"df53fbf714d93da7638df954aba33dd2605b4ce42a8f09fe0ea11d32c3f65eb6","functions":[{"id":"func/ListFollowingFeed.constructor","name":"ListFollowingFeed.constructor","line":12,"end_line":17,"hash":"b62fd6f9f182ccdd9797918d8d662d1c753d24c019a0401a0011c76296112a6d"},{"id":"func/ListFollowingFeed.execute","name":"ListFollowingFeed.execute","line":19,"end_line":37,"hash":"c32d42cb050f69164bab44febe375ba73acfa2c8b39659c7e84c4bbc4146c17e"}]}
// mutate4javascript-manifest-end
