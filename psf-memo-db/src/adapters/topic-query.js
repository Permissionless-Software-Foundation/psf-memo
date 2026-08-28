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
    this.roomFromKey = this.roomFromKey.bind(this)
    this.txidFromKey = this.txidFromKey.bind(this)
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
}

export default TopicQuery

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T14:46:39.922Z","module_hash":"515aa0e8cfdc7d596b270d5c4b82e2f33efa7f074ea406b6850007402d69f2e2","functions":[{"id":"func/TopicQuery.constructor","name":"TopicQuery.constructor","line":14,"end_line":29,"hash":"1c1e10e3ee613b0cd141a941849ce28a99eac688142629c7781ded6e5e15c938"},{"id":"func/TopicQuery.roomFromKey","name":"TopicQuery.roomFromKey","line":31,"end_line":34,"hash":"4175916ac2bb8f9f102c70750f336ed980db2a30a1f8f35645534303408aaece"},{"id":"func/TopicQuery.txidFromKey","name":"TopicQuery.txidFromKey","line":36,"end_line":39,"hash":"4f5f5c456f1e74a60acff54d1d5e2d982be53886c2a77c6eff3293133efa9c87"},{"id":"func/TopicQuery.listTopics","name":"TopicQuery.listTopics","line":41,"end_line":57,"hash":"9c524ef62e22d7a434768dc431c360f9c81b0c2a321b162a614f7f7e1e011e08"},{"id":"func/TopicQuery.getTopicPostTxids","name":"TopicQuery.getTopicPostTxids","line":59,"end_line":77,"hash":"4e0fccf874560249152d04d13879c24fbae0271bf7835716789dfafcff7dbd04"}]}
// mutate4javascript-manifest-end
