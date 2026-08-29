/*
  Unit tests for the Memo create-poll behavior.

  A create-poll transaction carries the Memo create-poll protocol prefix
  (0x6d10) followed by a poll_type byte, an option_count byte, and the
  question text. The question is limited to 209 bytes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoPollCreate = require('../../src/services/memo-poll-create')

const MY_ADDRESS = 'bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d'

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
  return {
    pollType: buf[0],
    optionCount: buf[1],
    question: buf.slice(2).toString('utf8')
  }
}

test('create broadcasts with the create-poll prefix and payload', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await memoPollCreate.create('which is better?', 2)

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoPollCreate.MEMO_CREATE_POLL_PREFIX)
  const decoded = decodePayload(wallet.broadcasts[0].msg)
  assert.equal(decoded.question, 'which is better?')
  assert.equal(decoded.optionCount, 2)
  assert.equal(decoded.pollType, 1)
})

test('create accepts an option count of one', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await memoPollCreate.create('one option?', 1)

  assert.equal(wallet.broadcasts.length, 1)
})

test('create rejects an option count of zero', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await assert.rejects(
    () => memoPollCreate.create('zero options?', 0),
    { code: 'poll_create_validation', message: /positive number/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('create rejects a non-numeric option count', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await assert.rejects(
    () => memoPollCreate.create('weird count?', 'abc'),
    { code: 'poll_create_validation', message: /positive number/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('create reflects the new poll on the injected poll store', async () => {
  const wallet = makeWallet()
  const added = []
  const polls = {
    addPoll (poll) {
      added.push(poll)
    }
  }
  const memoPollCreate = new MemoPollCreate({ wallet, polls })

  await memoPollCreate.create('what next?', 3)

  assert.equal(added.length, 1)
  assert.equal(added[0].question, 'what next?')
  assert.equal(added[0].optionCount, 3)
  assert.equal(added[0].address, wallet.walletInfo.cashAddress)
})

test('create rejects an empty question', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await assert.rejects(
    () => memoPollCreate.create('', 2),
    { code: 'poll_create_validation', message: /must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('create rejects a question that exceeds the byte limit', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })
  const question = 'a'.repeat(210)

  await assert.rejects(
    () => memoPollCreate.create(question, 2),
    { code: 'poll_create_length', message: /too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('create accepts a question at the byte limit', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })
  const question = 'a'.repeat(209)

  await memoPollCreate.create(question, 2)

  assert.equal(wallet.broadcasts.length, 1)
})

test('create counts UTF-8 bytes for the limit', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })

  await assert.rejects(
    () => memoPollCreate.create('é'.repeat(105), 2),
    { code: 'poll_create_length' }
  )
})

test('create requires a wallet', async () => {
  const memoPollCreate = new MemoPollCreate({})

  await assert.rejects(
    () => memoPollCreate.create('hello', 2),
    /requires a wallet/
  )
})

test('create surfaces a broadcast failure', async () => {
  const wallet = makeWallet()
  wallet.sendOpReturn = async () => { throw new Error('broadcast failed') }
  const memoPollCreate = new MemoPollCreate({ wallet })

  await assert.rejects(
    () => memoPollCreate.create('hello', 2),
    /broadcast failed/
  )
})
