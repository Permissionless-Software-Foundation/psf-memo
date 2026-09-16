/*
  Unit tests for the failed-image state transition used by the post renderer.

  The transition is pure: it either returns the same set (when the URL is
  already tracked, so React can skip a re-render) or a new set with the URL
  added, and it never mutates the input set.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { addFailedImage } = require('../../src/services/failed-images')

const URL_A = 'https://i.imgur.com/swCI56T.jpeg'
const URL_B = 'https://cdn.example.com/pics/Sunset.PNG'

test('addFailedImage returns a new set containing the added URL', () => {
  const original = new Set()
  const next = addFailedImage(original, URL_A)
  assert.notEqual(next, original)
  assert.deepEqual([...next], [URL_A])
  assert.equal(original.size, 0)
})

test('addFailedImage returns the same set when the URL is already present', () => {
  const original = new Set([URL_A])
  const next = addFailedImage(original, URL_A)
  assert.equal(next, original)
})

test('addFailedImage preserves existing entries and does not mutate the input', () => {
  const original = new Set([URL_A])
  const next = addFailedImage(original, URL_B)
  assert.deepEqual([...next].sort(), [URL_B, URL_A].sort())
  assert.deepEqual([...original], [URL_A])
})
