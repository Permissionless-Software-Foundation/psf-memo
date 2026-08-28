/*
  Property tests for the topic discovery and topic feed page controllers.

  The unit tests probe getTopic / getPost at a few fixed fixtures. These
  properties pin down the lookup invariants over broad random inputs:

    - TopicDiscoveryPage.getTopic finds any topic that was loaded.
    - TopicFeedPage.getPost finds any post that was loaded.
    - Lookups are stable: a loaded item is always found, and an unknown key
      returns null.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll, intGen } = require('./harness')
const TopicDiscoveryPage = require('../../src/services/topic-discovery-page')
const TopicFeedPage = require('../../src/services/topic-feed-page')

const rng = seededRandom(20260828)

function randomRoom () {
  return 'room-' + Math.floor(rng() * 1e6)
}

function randomTxid () {
  return 't' + rng().toString(36).slice(2, 10) + Math.floor(rng() * 1e6)
}

test('TopicDiscoveryPage.getTopic finds any loaded topic', async () => {
  await forAll(
    (i) => {
      const n = intGen(rng, 0, 20)()
      const topics = []
      for (let j = 0; j < n; j++) {
        topics.push({ room: randomRoom(), postCount: intGen(rng, 0, 1000)() })
      }
      return topics
    },
    async (topics) => {
      const memoDb = { async getTopics () { return { topics } } }
      const page = new TopicDiscoveryPage({ memoDb })
      await page.load()

      for (const topic of topics) {
        const found = page.getTopic(topic.room)
        if (!found || found.room !== topic.room) return false
      }
      if (page.getTopic('does-not-exist') !== null) return false
      return true
    },
    { label: 'topic discovery lookup completeness' }
  )
})

test('TopicFeedPage.getPost finds any loaded post', async () => {
  await forAll(
    (i) => {
      const n = intGen(rng, 0, 20)()
      const posts = []
      for (let j = 0; j < n; j++) {
        posts.push({ txid: randomTxid(), text: 'post ' + j })
      }
      return posts
    },
    async (posts) => {
      const memoDb = { async getTopicPosts () { return { posts, pagination: { total: posts.length } } } }
      const page = new TopicFeedPage({ memoDb, room: 'bitcoin' })
      await page.load()

      for (const post of posts) {
        const found = page.getPost(post.txid)
        if (!found || found.txid !== post.txid) return false
      }
      if (page.getPost('does-not-exist') !== null) return false
      return true
    },
    { label: 'topic feed lookup completeness' }
  )
})
