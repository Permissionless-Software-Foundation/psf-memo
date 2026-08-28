/*
  Adapter for querying Memo polls from the polls, pollOptions, and pollVotes
  LevelDB stores.

  The indexer stores:
    - Polls keyed by txid with { addr, pollType, optionCount, question,
      seen, blockHeight }.
    - Poll options keyed by txid with { addr, pollTxid, option, seen,
      blockHeight }.
    - Poll votes keyed by txid with { addr, pollTxid, comment, seen,
      blockHeight }.

  This adapter exposes:
    - getPoll(txid)         - poll record plus options and votes
    - getPollOptions(txid)  - options for a poll
    - getPollVotes(txid)    - votes for a poll
*/

class PollQuery {
  constructor (localConfig = {}) {
    const { pollsDb, pollOptionsDb, pollVotesDb } = localConfig
    if (!pollsDb) {
      throw new Error('pollsDb required when instantiating PollQuery adapter.')
    }
    if (!pollOptionsDb) {
      throw new Error('pollOptionsDb required when instantiating PollQuery adapter.')
    }
    if (!pollVotesDb) {
      throw new Error('pollVotesDb required when instantiating PollQuery adapter.')
    }
    this.pollsDb = pollsDb
    this.pollOptionsDb = pollOptionsDb
    this.pollVotesDb = pollVotesDb

    this.getPoll = this.getPoll.bind(this)
    this.getPollOptions = this.getPollOptions.bind(this)
    this.getPollVotes = this.getPollVotes.bind(this)
  }

  async getPoll (txid) {
    try {
      const poll = await this.pollsDb.get(txid)
      const options = await this.getPollOptions(txid)
      const votes = await this.getPollVotes(txid)
      return { ...poll, txid, options, votes }
    } catch (err) {
      if (err.notFound || err.code === 'LEVEL_NOT_FOUND') {
        return null
      }
      throw err
    }
  }

  async getPollOptions (txid) {
    return this._collectByPollTxid(this.pollOptionsDb, txid)
  }

  async getPollVotes (txid) {
    return this._collectByPollTxid(this.pollVotesDb, txid)
  }

  // Collect every record in `db` that references the given poll txid, keeping
  // each stored record's `txid` key alongside its value.
  async _collectByPollTxid (db, txid) {
    const items = []
    for await (const [key, value] of db.iterator()) {
      if (value?.pollTxid === txid) {
        items.push({ ...value, txid: key })
      }
    }
    return items
  }
}

export default PollQuery
