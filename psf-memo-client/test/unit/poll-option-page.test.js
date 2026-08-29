/*
  Unit tests for the Poll Option Page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const PollOptionPage = require('../../src/services/poll-option-page')
const MemoPollOption = require('../../src/services/memo-poll-option')

const POLL_TXID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function makeWallet () {
  return {
    walletInfo: { cashAddress: 'bitcoincash:qtest' },
    broadcasts: [],
    async getUtxos () { return [] },
    async sendOpReturn (msg, prefix) {
      this.broadcasts.push({ msg, prefix })
      return 'aa'.repeat(32)
    }
  }
}

test('submit adds an option', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID })
  const page = new PollOptionPage({ memoPollOption })

  page.setInput('yes')
  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(wallet.broadcasts.length, 1)
})

test('submit records a validation error for an empty option', async () => {
  const wallet = makeWallet()
  const memoPollOption = new MemoPollOption({ wallet, pollTxid: POLL_TXID })
  const page = new PollOptionPage({ memoPollOption })

  page.setInput('')
  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'poll_option_validation')
  assert.equal(wallet.broadcasts.length, 0)
})

test('remainingCount counts down from the option limit', () => {
  const memoPollOption = new MemoPollOption({ pollTxid: POLL_TXID })
  const page = new PollOptionPage({ memoPollOption })

  page.setInput('')
  assert.equal(page.remainingCount(), MemoPollOption.MAX_OPTION_BYTES)
  page.setInput('yes')
  assert.equal(page.remainingCount(), MemoPollOption.MAX_OPTION_BYTES - 3)
})

test('starts with the in-flight flag cleared', () => {
  const memoPollOption = new MemoPollOption({ pollTxid: POLL_TXID })
  const page = new PollOptionPage({ memoPollOption })

  assert.equal(page.adding, false)
})
