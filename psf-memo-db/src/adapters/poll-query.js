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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T22:47:05.014Z","module_hash":"b7e55eb605d5943b533f61016cc9445be11991e805f81a5db64c5898a14caf44","functions":[{"id":"func/PollQuery.constructor","name":"PollQuery.constructor","line":20,"end_line":38,"hash":"32deeef8172fe11e250c70a4f34778045962dfcb62e9ac262288e904e6e3aa62"},{"id":"func/PollQuery.getPoll","name":"PollQuery.getPoll","line":40,"end_line":52,"hash":"80e44cb0a948458726dcc1da0f06ddbd20118981e3d00de14791f480202b941e"},{"id":"func/PollQuery.getPollOptions","name":"PollQuery.getPollOptions","line":54,"end_line":56,"hash":"f391dd3bc4e82a41d3fc0e0c7d6a2ae2f85225ee37b0c07816e20d8ad0250db1"},{"id":"func/PollQuery.getPollVotes","name":"PollQuery.getPollVotes","line":58,"end_line":60,"hash":"c18ab12a96c161e3f516fb8c7b631227e953a67cae8943962b0431526eddf2a9"},{"id":"func/PollQuery._collectByPollTxid","name":"PollQuery._collectByPollTxid","line":64,"end_line":72,"hash":"62be14afb630b72ddbd4c7d554f3e89d8aeffbf22ff7cc06509de13d5c94e4c0"}]}
// mutate4javascript-manifest-end
