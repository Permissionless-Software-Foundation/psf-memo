/*
  Adapter for querying Memo topics from the rooms LevelDB store.

  The indexer stores topic activity in the rooms store:
    - Topic posts are keyed `${room}:${txid}` with type 'post'.
    - Topic follows are keyed `${room}:${addr}` with type 'follow'.

  This adapter exposes:
    - listTopics()           - distinct rooms with post counts
    - getTopicPostTxids()    - paginated txids for a room sorted by block height
*/

class TopicQuery {
  constructor (localConfig = {}) {
    const { roomsDb, postsDb } = localConfig
    if (!roomsDb) {
      throw new Error('roomsDb required when instantiating TopicQuery adapter.')
    }
    if (!postsDb) {
      throw new Error('postsDb required when instantiating TopicQuery adapter.')
    }
    this.roomsDb = roomsDb
    this.postsDb = postsDb

    this.listTopics = this.listTopics.bind(this)
    this.getTopicPostTxids = this.getTopicPostTxids.bind(this)
    this.isFollowingRoom = this.isFollowingRoom.bind(this)
    this.listRoomFollowers = this.listRoomFollowers.bind(this)
    this.roomFromKey = this.roomFromKey.bind(this)
    this.txidFromKey = this.txidFromKey.bind(this)
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

  async listTopics () {
    const counts = new Map()

    for await (const [key, value] of this.roomsDb.iterator()) {
      const room = this.roomFromKey(key, value)
      if (!counts.has(room)) {
        counts.set(room, 0)
      }
      if (value?.type === 'post') {
        counts.set(room, counts.get(room) + 1)
      }
    }

    return Array.from(counts.entries())
      .map(([room, postCount]) => ({ room, postCount }))
      .sort((a, b) => a.room.localeCompare(b.room))
  }

  async getTopicPostTxids (room, { limit, offset }) {
    const start = `${room}:`
    const end = `${room}:\uffff`
    const entries = []

    for await (const [key, value] of this.roomsDb.iterator({ gte: start, lte: end })) {
      if (value?.type !== 'post') continue
      const txid = (value && typeof value.txid === 'string') ? value.txid : this.txidFromKey(key)
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
    const start = `${room}:`
    const end = `${room}:\uffff`
    const followers = []
    for await (const [key, value] of this.roomsDb.iterator({ gte: start, lte: end })) {
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
// {"version":1,"tested_at":"2026-08-28T19:16:59.454Z","module_hash":"7b5597f76aed02abe591e652087cb1c560dd17a1154a62299f50f60303aa6e87","functions":[{"id":"func/TopicQuery.constructor","name":"TopicQuery.constructor","line":14,"end_line":32,"hash":"08f209a40b4ffc2962e5f399e78936005f3286ec37123a043850b12e0c20833b"},{"id":"func/TopicQuery.roomFromKey","name":"TopicQuery.roomFromKey","line":34,"end_line":37,"hash":"4175916ac2bb8f9f102c70750f336ed980db2a30a1f8f35645534303408aaece"},{"id":"func/TopicQuery.txidFromKey","name":"TopicQuery.txidFromKey","line":39,"end_line":42,"hash":"4f5f5c456f1e74a60acff54d1d5e2d982be53886c2a77c6eff3293133efa9c87"},{"id":"func/TopicQuery.listTopics","name":"TopicQuery.listTopics","line":44,"end_line":60,"hash":"9c524ef62e22d7a434768dc431c360f9c81b0c2a321b162a614f7f7e1e011e08"},{"id":"func/TopicQuery.getTopicPostTxids","name":"TopicQuery.getTopicPostTxids","line":62,"end_line":80,"hash":"4e0fccf874560249152d04d13879c24fbae0271bf7835716789dfafcff7dbd04"},{"id":"func/TopicQuery.isFollowingRoom","name":"TopicQuery.isFollowingRoom","line":83,"end_line":92,"hash":"a0cf48cc6f4842adf65830b41d536cd6a078c7adf6b837e57259491157e2e97d"},{"id":"func/TopicQuery.listRoomFollowers","name":"TopicQuery.listRoomFollowers","line":95,"end_line":106,"hash":"351d71881e8b0953366056f223a6f06326e8ecd946277abc372ae5771c0b0f08"},{"id":"func/TopicQuery.followAddrFromValue","name":"TopicQuery.followAddrFromValue","line":108,"end_line":112,"hash":"2ce68c35f539e1fd7694774059b4b2afd096014c99a87c7538f3cbb70e26c3c7"}]}
// mutate4javascript-manifest-end
