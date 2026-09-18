/*
  Adapter for querying Memo topics from the rooms LevelDB store.

  The indexer stores topic activity in the rooms store:
    - Topic posts are keyed `${room}:${txid}` with type 'post'.
    - Topic follows are keyed `${room}:${addr}` with type 'follow'.

  Topic listing is served from two indexes so it can order and paginate
  without iterating the rooms store:
    - topicSummaries: one record per room keyed by room, value
      { room, postCount, lastHeight, lastSeen, followerCount }.
    - topicRecency: one record per room keyed `${invertedHeight}:${room}`, value
      { room, blockHeight }. Follow-only rooms live at height 0. The height is
      inverted so an ascending scan yields newest-first.

  This adapter exposes:
    - listTopics()           - ordered, paginated distinct rooms with counts
    - getTopicPostTxids()    - paginated txids for a room sorted by block height
*/

import { loadMutedAddrs, isMutedPost } from './lib/muted-posts.js'

class TopicQuery {
  constructor (localConfig = {}) {
    const { roomsDb, postsDb, topicSummariesDb, topicRecencyDb, muteQuery } = localConfig
    if (!roomsDb) {
      throw new Error('roomsDb required when instantiating TopicQuery adapter.')
    }
    if (!postsDb) {
      throw new Error('postsDb required when instantiating TopicQuery adapter.')
    }
    if (!topicSummariesDb) {
      throw new Error('topicSummariesDb required when instantiating TopicQuery adapter.')
    }
    if (!topicRecencyDb) {
      throw new Error('topicRecencyDb required when instantiating TopicQuery adapter.')
    }
    this.roomsDb = roomsDb
    this.postsDb = postsDb
    this.topicSummariesDb = topicSummariesDb
    this.topicRecencyDb = topicRecencyDb
    this.muteQuery = muteQuery || null

    this.listTopics = this.listTopics.bind(this)
    this.getTopicPostTxids = this.getTopicPostTxids.bind(this)
    this.isFollowingRoom = this.isFollowingRoom.bind(this)
    this.listRoomFollowers = this.listRoomFollowers.bind(this)
    this.roomFromKey = this.roomFromKey.bind(this)
    this.txidFromKey = this.txidFromKey.bind(this)
    this.roomRange = this.roomRange.bind(this)
    this.followAddrFromValue = this.followAddrFromValue.bind(this)
  }

  roomFromKey (key, value) {
    if (value && typeof value.room === 'string') return value.room
    return String(key).split(':')[0]
  }

  txidFromKey (key) {
    const parts = String(key).split(':')
    return parts[parts.length - 1]
  }

  // Key range bounding every record for a room. The trailing \uffff sorts
  // after any address or txid segment, so the range is exclusive of other
  // rooms regardless of their name.
  roomRange (room) {
    return { gte: `${room}:`, lte: `${room}:\uffff` }
  }

  // The topicSummaries key is the room name; fall back to the key when the
  // stored value omits it.
  summaryRoom (key, value) {
    if (value && typeof value.room === 'string') return value.room
    return String(key)
  }

  // The topicRecency key is `${invertedHeight}:${room}`; the stored value
  // carries the room name, but fall back to the key for robustness.
  recencyRoom (key, value) {
    if (value && typeof value.room === 'string') return value.room
    const parts = String(key).split(':')
    return parts.slice(1).join(':')
  }

  // Return a page of topics ordered by their most recent post, descending,
  // with rooms at the same height ordered by name ascending. Post count,
  // last-seen time, follower count, and the total come from topicSummaries;
  // ordering and pagination come from topicRecency, which is read only
  // through offset + limit records.
  async listTopics ({ limit = 100, offset = 0 } = {}) {
    const summaries = new Map()
    for await (const [key, value] of this.topicSummariesDb.iterator()) {
      summaries.set(this.summaryRoom(key, value), value)
    }
    const total = summaries.size

    const recencyRooms = []
    for await (const [key, value] of this.topicRecencyDb.iterator({ limit: offset + limit })) {
      recencyRooms.push(this.recencyRoom(key, value))
    }

    const pageRooms = recencyRooms.slice(offset, offset + limit)
    const topics = pageRooms.map((room) => {
      const summary = summaries.get(room)
      return {
        room,
        postCount: summary?.postCount ?? 0,
        lastSeen: summary?.lastSeen ?? 0,
        followerCount: summary?.followerCount ?? 0
      }
    })

    return {
      topics,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + topics.length < total
      }
    }
  }

  async getTopicPostTxids (room, { limit, offset, viewerAddr = null }) {
    const mutedAddrs = await loadMutedAddrs(this.muteQuery, viewerAddr)
    const entries = []

    for await (const [key, value] of this.roomsDb.iterator(this.roomRange(room))) {
      if (value?.type !== 'post') continue
      const txid = (value && typeof value.txid === 'string') ? value.txid : this.txidFromKey(key)
      if (await isMutedPost((t) => this.postsDb.get(t).catch(() => null), txid, mutedAddrs)) continue
      const blockHeight = value?.blockHeight ?? 0
      entries.push({ txid, blockHeight })
    }

    entries.sort((a, b) => b.blockHeight - a.blockHeight)

    const total = entries.length
    const txids = entries.slice(offset, offset + limit).map((entry) => entry.txid)

    return { txids, total }
  }

  // Return true when addr has an active follow record for room.
  async isFollowingRoom (addr, room) {
    const key = `${room}:${addr}`
    try {
      const record = await this.roomsDb.get(key)
      return record?.type === 'follow' && record?.unfollow !== true
    } catch (err) {
      if (err.notFound) return false
      throw err
    }
  }

  // Return the cash addresses that currently follow the room.
  async listRoomFollowers (room) {
    const followers = []
    for await (const [key, value] of this.roomsDb.iterator(this.roomRange(room))) {
      if (value?.type !== 'follow') continue
      if (value?.unfollow === true) continue
      const addr = this.followAddrFromValue(value, key)
      if (addr) followers.push(addr)
    }
    return followers
  }

  followAddrFromValue (value, key) {
    if (value && typeof value.addr === 'string') return value.addr
    const parts = String(key).split(':')
    return parts.length > 1 ? parts[parts.length - 1] : null
  }
}

export default TopicQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T13:18:16.700Z","module_hash":"dff0369d21f542be9d43c21fc7dd8a4784be62481d35de52296358e16ca57742","functions":[{"id":"func/TopicQuery.constructor","name":"TopicQuery.constructor","line":24,"end_line":52,"hash":"51f22d20b4d0bb817f3b005e12f1635a3669a77bd741c3f0b386bc71fa28c08e"},{"id":"func/TopicQuery.roomFromKey","name":"TopicQuery.roomFromKey","line":54,"end_line":57,"hash":"4175916ac2bb8f9f102c70750f336ed980db2a30a1f8f35645534303408aaece"},{"id":"func/TopicQuery.txidFromKey","name":"TopicQuery.txidFromKey","line":59,"end_line":62,"hash":"4f5f5c456f1e74a60acff54d1d5e2d982be53886c2a77c6eff3293133efa9c87"},{"id":"func/TopicQuery.roomRange","name":"TopicQuery.roomRange","line":67,"end_line":69,"hash":"ceb99a638ee22ce625c9962d90786bd779de8d946b501640db9b76276c8bd7ea"},{"id":"func/TopicQuery.summaryRoom","name":"TopicQuery.summaryRoom","line":73,"end_line":76,"hash":"8ca2c04ae70839ca8e2deebe6f0661883dacbf3a06731dd9c134f326bf921b7c"},{"id":"func/TopicQuery.recencyRoom","name":"TopicQuery.recencyRoom","line":80,"end_line":84,"hash":"677abdcb0687362d170da432571cb0912bc43d4bd6e7022e3d785714f8bd9402"},{"id":"func/TopicQuery.listTopics","name":"TopicQuery.listTopics","line":91,"end_line":123,"hash":"a1b90c50f24182301ac170be9611ef9f75847de3d12997b0fa7c407c739b28da"},{"id":"func/TopicQuery.getTopicPostTxids","name":"TopicQuery.getTopicPostTxids","line":125,"end_line":143,"hash":"c18e8ca08fa3695cc2d49bbc0a83eb5488831bf14ddfdb9c421afefd4b91d521"},{"id":"func/TopicQuery.isFollowingRoom","name":"TopicQuery.isFollowingRoom","line":146,"end_line":155,"hash":"a0cf48cc6f4842adf65830b41d536cd6a078c7adf6b837e57259491157e2e97d"},{"id":"func/TopicQuery.listRoomFollowers","name":"TopicQuery.listRoomFollowers","line":158,"end_line":167,"hash":"40dc014f433895e930bfec5de78d73ca2f75a023cecb174ddc57f7ec150dd300"},{"id":"func/TopicQuery.followAddrFromValue","name":"TopicQuery.followAddrFromValue","line":169,"end_line":173,"hash":"2ce68c35f539e1fd7694774059b4b2afd096014c99a87c7538f3cbb70e26c3c7"}]}
// mutate4javascript-manifest-end
