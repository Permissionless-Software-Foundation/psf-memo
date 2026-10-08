/*
  Property tests for the New Topic page's room normalization and byte budget.

  The unit tests probe normalizeRoom and remainingCount at a few fixed
  fixtures. These properties pin down invariants over broad random UTF-8
  inputs:

    - normalizeRoom always returns a lowercased room with no leading '#'.
    - repeated normalizeRoom reaches a fixed point within the input length.
    - remainingCount equals the combined byte budget minus the normalized room
      and first message byte lengths.

  normalizeRoom trims surrounding whitespace and removes a leading run of '#'
  and whitespace in one pass, so it is idempotent; the fixed-point property is
  stated over repeated application to keep it robust to future steps.
*/

'use strict'

const test = require('node:test')
const { seededRandom, forAll } = require('./harness')
const NewTopicPage = require('../../src/services/new-topic-page')
const { byteLength } = require('../../src/services/utf8')

const rng = seededRandom(20261008)
const MAX = NewTopicPage.MAX_TOPIC_MESSAGE_BYTES

// Characters with distinct UTF-8 byte widths, plus '#' and whitespace so the
// generator exercises every normalization step.
const CHARS = ['a', 'B', ' ', '#', '\t', '\u00e9', '\u20ac', '\ud83d\ude00']

function textGen () {
  const len = Math.floor(rng() * 40)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(rng() * CHARS.length)]
  }
  return out
}

function newPage () {
  return new NewTopicPage({})
}

test('normalizeRoom is lowercased and has no leading hash', async () => {
  await forAll(
    textGen,
    (name) => {
      const room = newPage().normalizeRoom(name)
      return room === room.toLowerCase() && !room.startsWith('#')
    },
    { label: 'normalizeRoom shape' }
  )
})

test('repeated normalizeRoom reaches a fixed point within the input length', async () => {
  await forAll(
    textGen,
    (name) => {
      const page = newPage()
      let room = name
      let next = page.normalizeRoom(room)
      // Each non-fixed pass removes at least one character (a leading run of
      // '#' or whitespace), so it terminates within name.length + 1 passes.
      for (let i = 0; i <= name.length + 1 && next !== room; i++) {
        room = next
        next = page.normalizeRoom(room)
      }
      return next === room
    },
    { label: 'normalizeRoom convergence' }
  )
})

test('remainingCount is the byte budget minus the normalized room and message', async () => {
  await forAll(
    () => ({ name: textGen(), message: textGen() }),
    ({ name, message }) => {
      const page = newPage()
      page.setTopicName(name).setFirstMessage(message)
      return page.remainingCount() ===
        MAX - byteLength(page.normalizeRoom()) - byteLength(message)
    },
    { label: 'remainingCount byte accounting' }
  )
})
