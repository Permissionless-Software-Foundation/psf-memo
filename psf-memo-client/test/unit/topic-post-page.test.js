/*
  Unit tests for the Topic Post Page controller.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const TopicPostPage = require('../../src/services/topic-post-page')

function makeMemoTopicPost (room = 'bitcoin') {
  const maxBytes = 214
  return {
    room,
    posts: [],
    async post (message) {
      if (typeof message !== 'string' || message.trim().length === 0) {
        const err = new Error('Topic message must not be empty.')
        err.code = 'topic_post_validation'
        throw err
      }
      if (room.length + message.length > maxBytes) {
        const err = new Error(`Topic message is too long. Maximum is ${maxBytes} bytes.`)
        err.code = 'topic_post_length'
        throw err
      }
      this.posts.push(message)
      return 'aa'.repeat(32)
    },
    remainingBytes (message) {
      return maxBytes - room.length - (message ? message.length : 0)
    }
  }
}

test('submit posts the current input', async () => {
  const memoTopicPost = makeMemoTopicPost()
  const page = new TopicPostPage({ memoTopicPost })
  page.setInput('hello bitcoin')

  const result = await page.submit()

  assert.equal(result.ok, true)
  assert.deepEqual(memoTopicPost.posts, ['hello bitcoin'])
})

test('remainingCount delegates to the memo topic post handler', () => {
  const memoTopicPost = makeMemoTopicPost()
  const page = new TopicPostPage({ memoTopicPost })
  page.setInput('hello')

  assert.equal(page.remainingCount(), 202)
})

test('submit returns a validation error for empty input', async () => {
  const memoTopicPost = makeMemoTopicPost()
  const page = new TopicPostPage({ memoTopicPost })
  page.setInput('')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'topic_post_validation')
})

test('submit returns a length error for over-long input', async () => {
  const memoTopicPost = makeMemoTopicPost()
  const page = new TopicPostPage({ memoTopicPost })
  page.setInput('a'.repeat(300))

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'topic_post_length')
})

test('submit requires a memo topic post handler', async () => {
  const page = new TopicPostPage({})
  page.setInput('hello')

  const result = await page.submit()

  assert.equal(result.ok, false)
  assert.equal(result.error, 'broadcast')
})

test('remainingCount requires a memo topic post handler', () => {
  const page = new TopicPostPage({})

  assert.throws(
    () => page.remainingCount(),
    /requires a memo topic post handler/
  )
})

test('exposes the combined byte limit', () => {
  assert.equal(TopicPostPage.MAX_TOPIC_MESSAGE_BYTES, 214)
})
