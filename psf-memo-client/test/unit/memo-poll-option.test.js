/*
  Unit tests for the Memo add-poll-option behavior.

  An add-poll-option transaction carries the Memo add-poll-option protocol
  prefix (0x6d13) followed by the poll's 32-byte txid and the option text.
  The option text is limited to 184 bytes.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const MemoPollOption = require('../../src/services/memo-poll-option')

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
  const option = buf.slice(32).toString('utf8')
  return { pollTxid, option }
}

test('add broadcasts with the add-poll-option prefix and payload', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID })

  await memoPollOption.add('yes')

  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(wallet.broadcasts[0].prefix, MemoPollOption.MEMO_ADD_POLL_OPTION_PREFIX)
  const decoded = decodePayload(wallet.broadcasts[0].msg)
  assert.equal(decoded.pollTxid, POLL_TXID)
  assert.equal(decoded.option, 'yes')
})

test('add reflects the new option on the injected poll store', async () => {
  const wallet = makeWallet()
  const added = []
  const polls = {
    addOption (option) {
      added.push(option)
    }
  }
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID, polls })

  await memoPollOption.add('definitely')

  assert.equal(added.length, 1)
  assert.equal(added[0].option, 'definitely')
  assert.equal(added[0].pollTxid, POLL_TXID)
  assert.equal(added[0].address, wallet.walletInfo.cashAddress)
})

test('add rejects an empty option', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID })

  await assert.rejects(
    () => memoPollOption.add(''),
    { code: 'poll_option_validation', message: /must not be empty/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('add rejects an option that exceeds the byte limit', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID })
  const option = 'a'.repeat(185)

  await assert.rejects(
    () => memoPollOption.add(option),
    { code: 'poll_option_length', message: /too long/ }
  )
  assert.equal(wallet.broadcasts.length, 0)
})

test('add requires a wallet', async () => {
  const memoPollOption = new MemoPollOption({ pollTxid: POLL_TXID })

  await assert.rejects(
    () => memoPollOption.add('yes'),
    /requires a wallet/
  )
})

test('add requires a poll txid', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet })

  await assert.rejects(
    () => memoPollOption.add('yes'),
    { code: 'poll_option_validation', message: /Poll txid is required/ }
  )
})
