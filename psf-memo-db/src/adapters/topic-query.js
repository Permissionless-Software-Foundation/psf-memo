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
