/*
  Property tests for the Memo topic-post byte accounting.

  The unit tests probe isTooLong and remainingBytes at a few fixed fixtures.
  These properties pin down invariants that hold over broad random UTF-8
  inputs (mixed byte widths):

    - byte accounting: remainingBytes(msg) always equals the combined byte
      budget minus the room and message byte lengths.
    - consistency: isTooLong(msg) is true exactly when remainingBytes(msg)
      is negative.
    - monotonicity: appending bytes never flips a too-long message back to
      being accepted.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll } = require('./harness')
const MemoTopicPost = require('../../src/services/memo-topic-post')
const { byteLength } = require('../../src/services/utf8')

const rng = seededRandom(20260901)
const MAX = MemoTopicPost.MAX_TOPIC_MESSAGE_BYTES

// Characters with distinct UTF-8 byte widths: 1, 1, 1, 2, 3, and 4 bytes.
const CHARS = ['a', 'b', ' ', '\u00e9', '\u20ac', '\ud83d\ude00']

function textGen () {
  const len = Math.floor(rng() * 140)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(rng() * CHARS.length)]
  }
  return out
}

function postInputGen () {
  return () => ({ room: textGen(), msg: textGen() })
}

test('remainingBytes equals the byte budget minus room and message bytes', async () => {
  await forAll(
    postInputGen(),
    ({ room, msg }) => {
      const post = new MemoTopicPost({ room })
      return post.remainingBytes(msg) === MAX - byteLength(room) - byteLength(msg)
    },
    { label: 'remainingBytes byte accounting' }
  )
})

test('isTooLong is true exactly when remainingBytes is negative', async () => {
  await forAll(
    postInputGen(),
    ({ room, msg }) => {
      const post = new MemoTopicPost({ room })
      return post.isTooLong(msg) === (post.remainingBytes(msg) < 0)
    },
    { label: 'isTooLong / remainingBytes consistency' }
  )
})

test('isTooLong is monotonic as message bytes are appended', async () => {
  await forAll(
    () => {
      const { room, msg } = postInputGen()()
      const extra = textGen()
      return { room, msg, extra }
    },
    ({ room, msg, extra }) => {
      const post = new MemoTopicPost({ room })
      // Appending bytes can only make a message longer, so a too-long
      // message must remain too-long once more bytes are added.
      return !(post.isTooLong(msg) && !post.isTooLong(msg + extra))
    },
    { label: 'isTooLong monotonicity' }
  )
})
