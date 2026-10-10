/*
  Property tests for the navigation menu model.

  The unit tests probe the real menu at fixed entries. These properties pin
  the model's lookup and active-state invariants over broad random entries:

    - shape and uniqueness: every generated entry carries a non-empty label
      and path, and no two entries share a path.
    - lookup round trip: findMenuEntry returns the exact entry for each path
      it holds, and undefined for a path the list does not hold.
    - active default: with no activePaths, isMenuEntryActive is true for the
      entry's own path and false for any other path.
    - active set: with activePaths, isMenuEntryActive is true exactly for
      those paths.
    - real menu: the file hosting entries sit between Account and BCH, every
      path is unique, and Posts is selected on the home route.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { seededRandom, forAll, intGen, randomFrom } = require('./harness')
const {
  NAV_MENU_ENTRIES,
  findMenuEntry,
  isMenuEntryActive
} = require('../../src/services/nav-menu')

const rng = seededRandom(20261010)
const ABSENT = '/__absent__'

// A list of random entries with unique paths, some with extra active paths.
function randomEntries () {
  const count = intGen(rng, 1, 8)()
  const used = new Set()
  const entries = []
  for (let i = 0; i < count; i++) {
    let path
    do {
      path = '/' + randomFrom(rng, 'abcdef', 1, 8)
    } while (used.has(path))
    used.add(path)

    const entry = { label: randomFrom(rng, 'ABC xyz', 1, 8).trim() || 'x', path }
    if (rng() < 0.5) entry.activePaths = [path, '/home-' + i]
    entries.push(entry)
  }
  return entries
}

test('random entries have non-empty labels and unique paths', async () => {
  await forAll(
    randomEntries,
    (entries) => {
      const paths = new Set()
      for (const entry of entries) {
        if (!entry.label || !entry.path) return false
        if (paths.has(entry.path)) return false
        paths.add(entry.path)
      }
      return true
    },
    { label: 'nav menu shape' }
  )
})

test('findMenuEntry returns the exact entry for its path and undefined otherwise', async () => {
  await forAll(
    randomEntries,
    (entries) => {
      for (const entry of entries) {
        if (findMenuEntry(entry.path, entries) !== entry) return false
      }
      return findMenuEntry(ABSENT, entries) === undefined
    },
    { label: 'nav menu lookup' }
  )
})

test('isMenuEntryActive matches the active path set', async () => {
  await forAll(
    randomEntries,
    (entries) => entries.every((entry) => {
      const active = entry.activePaths || [entry.path]
      const probes = new Set([entry.path, ABSENT, ...(entry.activePaths || [])])
      return [...probes].every((path) => isMenuEntryActive(entry, path) === active.includes(path))
    }),
    { label: 'nav menu active set' }
  )
})

test('every real menu path is unique and the file hosting entries sit between Account and BCH', () => {
  const paths = new Set()
  for (const entry of NAV_MENU_ENTRIES) {
    assert.ok(typeof entry.label === 'string' && entry.label.length > 0)
    assert.ok(typeof entry.path === 'string' && entry.path.startsWith('/'))
    assert.ok(!paths.has(entry.path), `duplicate path ${entry.path}`)
    paths.add(entry.path)
  }

  const labels = NAV_MENU_ENTRIES.map((entry) => entry.label)
  const slice = labels.slice(labels.indexOf('Account'), labels.indexOf('BCH') + 1)
  assert.deepEqual(slice, ['Account', 'File Upload', 'File Dashboard', 'BCH'])
})

test('Posts is active on the home route', () => {
  const posts = findMenuEntry('/posts/recent')
  assert.equal(isMenuEntryActive(posts, '/'), true)
  assert.equal(isMenuEntryActive(posts, '/posts/recent'), true)
  assert.equal(isMenuEntryActive(posts, '/topics'), false)
})
