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
    const options = []
    for await (const [key, value] of this.pollOptionsDb.iterator()) {
      if (value?.pollTxid === txid) {
        options.push({ ...value, txid: key })
      }
    }
    return options
  }

  async getPollVotes (txid) {
    const votes = []
    for await (const [key, value] of this.pollVotesDb.iterator()) {
      if (value?.pollTxid === txid) {
        votes.push({ ...value, txid: key })
      }
    }
    return votes
  }
}

export default PollQuery
