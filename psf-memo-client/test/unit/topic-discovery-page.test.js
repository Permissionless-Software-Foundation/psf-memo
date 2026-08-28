/*
  Unit tests for the topic discovery page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')

function makeMemoDb (topics) {
  return {
    async getTopics () {
      return { topics }
    }
  }
}

test('load returns topics with post counts', async () => {
  const topics = [
    { room: 'bitcoin', postCount: 2 },
    { room: 'cash', postCount: 1 }
  ]
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb(topics) })

  const result = await page.load()

  assert.deepEqual(result.topics, topics)
})

test('load throws when no memo db client is provided', async () => {
  const page = new TopicDiscoveryPage({})

  await assert.rejects(
    () => page.load(),
    /requires a memo db client/
  )
})

test('getTopic returns the matching topic', async () => {
  const topics = [
    { room: 'bitcoin', postCount: 2 },
    { room: 'cash', postCount: 1 }
  ]
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb(topics) })

  await page.load()

  assert.deepEqual(page.getTopic('bitcoin'), { room: 'bitcoin', postCount: 2 })
})

test('getTopic returns null when the topic is not loaded', async () => {
  const page = new TopicDiscoveryPage({ memoDb: makeMemoDb([]) })

  await page.load()

  assert.equal(page.getTopic('bitcoin'), null)
})

test('exposes the topics page path', () => {
  assert.equal(TopicDiscoveryPage.TOPICS_PATH, '/topics')
})
