/*
  Property tests for the shared acceptance-runner helpers.

  Unit tests cover fixed examples. These properties exercise broad input
  ranges so the invariants hold everywhere:

    - hashing: featureHash is deterministic and content sensitive.
    - conservation: removeStaleGeneratedTests keeps exactly the live tests and
      is idempotent.
    - round trip / idempotence: after generateTests every feature is up to
      date, and a second pass performs no parse or generate work.
    - ordering: listGeneratedTests returns only acceptance tests, sorted.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { seededRandom, forAll } = require('./harness')
const {
  featureHash,
  isUpToDate,
  removeStaleGeneratedTests,
  featureFiles,
  listGeneratedTests,
  generateTests
} = require('../../../swarmforge/scripts/lib/acceptance-runner.cjs')

const rng = seededRandom(20261002)
const BASE = path.join(__dirname, '..', '..', 'tmp', `acceptance-runner-prop-${process.pid}`)

function freshDir (name) {
  const dir = path.join(BASE, name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function randomWord (min, max) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-_'
  const length = min + Math.floor(rng() * (max - min + 1))
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(rng() * chars.length)]
  return out
}

function randomContent () {
  return randomWord(0, 120)
}

// Pick a subset of a pool without duplicates, preserving pool order.
function subset (pool) {
  return pool.filter(() => rng() < 0.5)
}

test('featureHash is deterministic', async () => {
  const dir = freshDir('hash')
  await forAll(
    () => randomContent(),
    (content) => {
      const first = path.join(dir, 'first.feature')
      const second = path.join(dir, 'second.feature')
      fs.writeFileSync(first, content)
      fs.writeFileSync(second, content)
      return featureHash(first) === featureHash(second)
    },
    { samples: 200, label: 'featureHash determinism' }
  )
})

test('featureHash changes when content changes', async () => {
  const dir = freshDir('hash-change')
  await forAll(
    (i) => {
      const a = randomContent()
      const b = a + 'x' + i
      return { a, b }
    },
    ({ a, b }) => {
      const fa = path.join(dir, 'a.feature')
      const fb = path.join(dir, 'b.feature')
      fs.writeFileSync(fa, a)
      fs.writeFileSync(fb, b)
      return featureHash(fa) !== featureHash(fb)
    },
    { samples: 200, label: 'featureHash sensitivity' }
  )
})

test('removeStaleGeneratedTests keeps exactly the live tests and is idempotent', async () => {
  const pool = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
  await forAll(
    () => {
      const live = subset(pool)
      const stale = pool.filter((name) => !live.includes(name))
      return { live, stale }
    },
    ({ live, stale }, i) => {
      const genDir = freshDir(`stale-${i}`)
      for (const name of [...live, ...stale]) {
        fs.writeFileSync(path.join(genDir, `${name}.acceptance.test.js`), '')
      }
      fs.writeFileSync(path.join(genDir, 'notes.js'), '')

      const features = live.map((name) => `${name}.feature`)
      removeStaleGeneratedTests(genDir, features)
      const expected = live.map((name) => `${name}.acceptance.test.js`).sort()
      assert.deepEqual(listGeneratedTests(genDir), expected)

      removeStaleGeneratedTests(genDir, features)
      assert.deepEqual(listGeneratedTests(genDir), expected)
      return fs.existsSync(path.join(genDir, 'notes.js'))
    },
    { samples: 40, label: 'removeStaleGeneratedTests conservation' }
  )
})

test('generateTests reaches an up-to-date fixed point after one pass', async () => {
  const pool = ['one', 'two', 'three', 'four']
  await forAll(
    () => subset(pool),
    (names, i) => {
      if (names.length === 0) return true
      const root = freshDir(`generate-${i}`)
      const specsDir = path.join(root, 'specs')
      const irDir = path.join(root, 'ir')
      const genDir = path.join(root, 'generated')
      fs.mkdirSync(specsDir, { recursive: true })
      for (const name of names) {
        fs.writeFileSync(path.join(specsDir, `${name}.feature`), `Feature: ${name}`)
      }

      let calls = 0
      const run = (cmd, args) => {
        calls++
        if (cmd === 'node') {
          const [, , outGenDir, featurePath, commit] = args
          const base = path.basename(featurePath, '.feature')
          fs.mkdirSync(path.join(outGenDir, 'metadata'), { recursive: true })
          fs.writeFileSync(path.join(outGenDir, `${base}.acceptance.test.js`), '')
          fs.writeFileSync(
            path.join(outGenDir, 'metadata', `${base}.json`),
            JSON.stringify({ feature_hash: featureHash(featurePath), aps_commit: commit })
          )
        }
        return ''
      }

      const features = featureFiles(specsDir)
      const first = generateTests({
        specsDir,
        irDir,
        genDir,
        apsDir: root,
        generateScript: 'generate.js',
        commit: 'abc',
        features,
        run
      })
      assert.deepEqual(first, names.map((n) => `${n}.acceptance.test.js`).sort())
      const allFresh = features.every((feature) =>
        isUpToDate({ genDir, featurePath: path.join(specsDir, feature), base: path.basename(feature, '.feature'), commit: 'abc' })
      )

      calls = 0
      const second = generateTests({
        specsDir,
        irDir,
        genDir,
        apsDir: root,
        generateScript: 'generate.js',
        commit: 'abc',
        features,
        run
      })
      return allFresh && calls === 0 && second.length === first.length
    },
    { samples: 16, label: 'generateTests fixed point' }
  )
})

test('listGeneratedTests returns only acceptance tests in sorted order', async () => {
  const dir = freshDir('ordering')
  await forAll(
    (i) => {
      const names = []
      const count = 1 + Math.floor(rng() * 6)
      for (let j = 0; j < count; j++) names.push(`${randomWord(1, 8)}-${i}-${j}`)
      return names
    },
    (names) => {
      for (const name of names) {
        fs.writeFileSync(path.join(dir, `${name}.acceptance.test.js`), '')
        fs.writeFileSync(path.join(dir, `${name}.js`), '')
      }
      const listed = listGeneratedTests(dir)
      const expected = names.map((n) => `${n}.acceptance.test.js`).sort()
      // Clean up so the next sample starts empty.
      for (const name of names) {
        fs.rmSync(path.join(dir, `${name}.acceptance.test.js`), { force: true })
        fs.rmSync(path.join(dir, `${name}.js`), { force: true })
      }
      return JSON.stringify(listed) === JSON.stringify(expected)
    },
    { samples: 60, label: 'listGeneratedTests selection and order' }
  )
})
