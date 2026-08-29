/*
  Unit tests for the Poll Create Page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const PollCreatePage = require('../../src/services/poll-create-page')
const MemoPollCreate = require('../../src/services/memo-poll-create')

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

test('submit creates a poll and navigates on success', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })
  let navigated = null
  const page = new PollCreatePage({
    memoPollCreate,
    navigate: (path) => { navigated = path }
  })

  page.setInput('which is better?')
  page.setOptionCount(2)
  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(wallet.broadcasts.length, 1)
  assert.equal(navigated, '/posts/recent')
})

test('submit records a validation error for an empty question', async () => {
  const wallet = makeWallet()
  const memoPollCreate = new MemoPollCreate({ wallet })
  const page = new PollCreatePage({ memoPollCreate })

  page.setInput('')
  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(page.submitError, 'poll_create_validation')
  assert.equal(wallet.broadcasts.length, 0)
})

test('remainingCount counts down from the question limit', () => {
  const memoPollCreate = new MemoPollCreate({})
  const page = new PollCreatePage({ memoPollCreate })

  page.setInput('')
  assert.equal(page.remainingCount(), MemoPollCreate.MAX_QUESTION_BYTES)
  page.setInput('hello')
  assert.equal(page.remainingCount(), MemoPollCreate.MAX_QUESTION_BYTES - 5)
  page.setInput('é')
  assert.equal(page.remainingCount(), MemoPollCreate.MAX_QUESTION_BYTES - 2)
})

test('starts with the in-flight flag cleared', () => {
  const memoPollCreate = new MemoPollCreate({})
  const page = new PollCreatePage({ memoPollCreate })

  assert.equal(page.creating, false)
})
