/*
  Unit tests for the Memo poll-vote behavior.

  A poll-vote transaction carries the Memo poll-vote protocol prefix (0x6d14)
  followed by the poll's 32-byte txid and a comment. The comment is limited
  to 184 bytes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoPollVote = require('../../src/services/memo-poll-vote')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'
const POLL_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function makeWallet (address = MY_ADDRESS) {
  return {
    walletInfo: { cashAddress: address },
    broadcasts: [],
    async getUtxos () {
      return []
    },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

function decodePayload (raw) {
  const buf = Buffer.from(raw)
  const pollTxid = Buffer.from(buf.slice(0, 32)).reverse().toString('hex')
  const comment = buf.slice(32).toString('utf8')
  return { pollTxid, comment }
}

test('vote broadcasts with the poll-vote prefix and payload', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })

  await memoPollVote.vote('yes')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoPollVote.MEMO_POLL_VOTE_PREFIX)
  const decoded = decodePayload(wallet.broadcasts[0].msg)
  assert.equal(decoded.pollTxid, POLL_TXID)
  assert.equal(decoded.comment, 'yes')
})

test('vote reflects the new vote on the injected poll store', async () => {
  const wallet = makeWallet()
  const added = []
  const polls = {
    addVote (vote) {
      added.push(vote)
    }
  }
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID, polls })

  await memoPollVote.vote('I choose this one')

  assert.equal(added.length, 1)
  assert.equal(added[0].comment, 'I choose this one')
  assert.equal(added[0].pollTxid, POLL_TXID)
  assert.equal(added[0].address, wallet.walletInfo.cashAddress)
})

test('vote rejects an empty comment', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })

  await assert.rejects(
    () => memoPollVote.vote(''),
    { code: 'poll_vote_validation', message: /must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('vote rejects a comment that exceeds the byte limit', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })
  const comment = 'a'.repeat(185)

  await assert.rejects(
    () => memoPollVote.vote(comment),
    { code: 'poll_vote_length', message: /too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('vote accepts a comment at the byte limit', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet, pollTxid: POLL_TXID })
  const comment = 'a'.repeat(MemoPollVote.MAX_COMMENT_BYTES)

  await memoPollVote.vote(comment)

  assert.equal(wallet.broadcasts.length, 1)
})

test('vote requires a wallet', async () => {
  const memoPollVote = new MemoPollVote({ pollTxid: POLL_TXID })

  await assert.rejects(
    () => memoPollVote.vote('yes'),
    /requires a wallet/
  )
})

test('vote requires a poll txid', async () => {
  const wallet = makeWallet()
  const memoPollVote = new MemoPollVote({ wallet })

  await assert.rejects(
    () => memoPollVote.vote('yes'),
    { code: 'poll_vote_validation', message: /Poll txid is required/ }
  )
})
