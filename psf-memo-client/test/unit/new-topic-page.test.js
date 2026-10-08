/*
  Unit tests for the New Topic Page controller.

  The controller normalizes a typed topic name into a room (trimmed,
  lowercased, leading '#' stripped), validates that the name and the first
  message are present and within the combined byte limit, then broadcasts the
  same Memo topic-message action (0x6d0c) a topic post would and navigates to
  the new room's feed.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const NewTopicPage = require('../../src/services/new-topic-page')
const MemoTopicPost = require('../../src/services/memo-topic-post')

// A fake topic-message action recording the room it was created for and the
// message it broadcast, so the page's normalization and wiring are observable.
function makeFactory (calls) {
  return (room) => ({
    room,
    async post (message) {
      calls.push({ room, message })
      if (typeof message !== 'string' || message.trim().length === 0) {
        const err = new Error('Topic message must not be empty.')
        err.code = 'topic_post_validation'
        throw err
      }
      if (room.length + message.length > MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES) {
        const err = new Error('Topic message is too long.')
        err.code = 'topic_post_length'
        throw err
      }
      return 'aa'.repeat(32)
    }
  })
}

function makePage ({ calls = [], paths = [] } = {}) {
  return new NewTopicPage({
    wallet: { walletInfo: { cashAddress: 'bitcoincash:qtest' } },
    feed: { posts: [], addPost (post) { this.posts.push(post) } },
    navigate: (path) => paths.push(path),
    memoTopicPostFactory: makeFactory(calls)
  })
}

test('setTopicName and setFirstMessage store the typed strings', () => {
  const page = makePage()

  page.setTopicName('bitcoin')
  page.setFirstMessage('hello')

  assert.equal(page.topicName, 'bitcoin')
  assert.equal(page.firstMessage, 'hello')
})

test('normalizeRoom lowercases, trims, and strips a leading hash', () => {
  const page = makePage()

  assert.equal(page.normalizeRoom('Bitcoin'), 'bitcoin')
  assert.equal(page.normalizeRoom('  bitcoin  '), 'bitcoin')
  assert.equal(page.normalizeRoom('#Cash'), 'cash')
  assert.equal(page.normalizeRoom('Déjà Vu'), 'déjà vu')
})

test('remainingCount counts the normalized room and first message in bytes', () => {
  const page = makePage()

  page.setTopicName('bitcoin').setFirstMessage('')
  assert.equal(page.remainingCount(), 207)

  page.setFirstMessage('hello')
  assert.equal(page.remainingCount(), 202)

  page.setFirstMessage('é')
  assert.equal(page.remainingCount(), 205)

  page.setTopicName('cash').setFirstMessage('hello')
  assert.equal(page.remainingCount(), 205)
})

test('submit broadcasts to the normalized room and navigates to its feed', async () => {
  const calls = []
  const paths = []
  const page = makePage({ calls, paths })
  page.setTopicName('#Bitcoin').setFirstMessage('hello bitcoin')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.equal(result.room, 'bitcoin')
  assert.deepEqual(calls, [{ room: 'bitcoin', message: 'hello bitcoin' }])
  assert.deepEqual(paths, ['/topics/bitcoin'])
})

test('submit rejects a topic name that is or normalizes to empty', async () => {
  for (const name of ['', '#']) {
    const calls = []
    const paths = []
    const page = makePage({ calls, paths })
    page.setTopicName(name).setFirstMessage('hello')

    const result = await page.submit()

    assert.equal(result.ok, false)
    assert.equal(result.error, 'topic_name_validation')
    assert.equal(page.submitError, 'topic_name_validation')
    assert.equal(calls.length, 0)
    assert.equal(paths.length, 0)
  }
})

test('submit rejects an empty first message', async () => {
  const calls = []
  const page = makePage({ calls })
  page.setTopicName('bitcoin').setFirstMessage('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'topic_post_validation')
  assert.equal(calls.length, 1)
})

test('submit rejects a name and message that exceed the combined limit', async () => {
  const calls = []
  const page = makePage({ calls })
  page.setTopicName('bitcoin').setFirstMessage('a'.repeat(210))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'topic_post_length')
})

test('submit surfaces a broadcast failure without navigating', async () => {
  const paths = []
  const page = new NewTopicPage({
    wallet: { walletInfo: { cashAddress: 'bitcoincash:qtest' } },
    navigate: (path) => paths.push(path),
    memoTopicPostFactory: () => ({
      async post () { throw new Error('Insufficient balance') }
    })
  })
  page.setTopicName('bitcoin').setFirstMessage('hello')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
  assert.equal(page.broadcastError, 'Insufficient balance')
  assert.deepEqual(paths, [])
})

test('hasTopicNameField and hasFirstMessageField report the two fields', () => {
  const page = makePage()

  assert.equal(page.hasTopicNameField(), true)
  assert.equal(page.hasFirstMessageField(), true)
})

test('submit starts and ends with the broadcasting flag cleared', async () => {
  const page = makePage()
  assert.equal(page.broadcasting, false)
  page.setTopicName('bitcoin').setFirstMessage('hello')

  await page.submit()

  assert.equal(page.broadcasting, false)
})

test('exposes the new topic path', () => {
  assert.equal(NewTopicPage.NEW_TOPIC_PATH, '/topics/new')
})

test('exposes the combined byte limit', () => {
  assert.equal(NewTopicPage.MAX_TOPIC_MESSAGE_BYTES, 214)
})
