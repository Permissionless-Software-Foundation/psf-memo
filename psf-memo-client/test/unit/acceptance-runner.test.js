/*
  Unit tests for the shared acceptance-runner helpers.

  These pin the filesystem and hashing decisions the three component
  acceptance runners depend on, without shelling out to bb or node.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  featureHash,
  isUpToDate,
  removeStaleGeneratedTests,
  featureFiles,
  listGeneratedTests,
  generateTests
} = require('../../../swarmforge/scripts/lib/acceptance-runner.cjs')

function tmpDir (name) {
  const dir = path.join(__dirname, '..', '..', 'tmp', `acceptance-runner-${name}-${process.pid}`)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

test('featureFiles selects only .feature files and sorts them', () => {
  const specsDir = tmpDir('features')
  fs.writeFileSync(path.join(specsDir, 'b.feature'), 'B')
  fs.writeFileSync(path.join(specsDir, 'a.feature'), 'A')
  fs.writeFileSync(path.join(specsDir, 'notes.txt'), 'nope')

  assert.deepEqual(featureFiles(specsDir), ['a.feature', 'b.feature'])
})

test('listGeneratedTests selects only acceptance tests and sorts them', () => {
  const genDir = tmpDir('generated')
  fs.writeFileSync(path.join(genDir, 'z.acceptance.test.js'), '')
  fs.writeFileSync(path.join(genDir, 'a.acceptance.test.js'), '')
  fs.writeFileSync(path.join(genDir, 'helper.js'), '')

  assert.deepEqual(listGeneratedTests(genDir), [
    'a.acceptance.test.js',
    'z.acceptance.test.js'
  ])
})

test('featureHash is deterministic and content sensitive', () => {
  const dir = tmpDir('hash')
  const one = path.join(dir, 'one.feature')
  const two = path.join(dir, 'two.feature')
  fs.writeFileSync(one, 'Feature: one')
  fs.writeFileSync(two, 'Feature: two')

  assert.equal(featureHash(one), featureHash(one))
  assert.notEqual(featureHash(one), featureHash(two))
})

test('isUpToDate is false without metadata and true when hash and commit match', () => {
  const root = tmpDir('uptodate')
  const genDir = path.join(root, 'generated')
  const featurePath = path.join(root, 'thing.feature')
  fs.mkdirSync(path.join(genDir, 'metadata'), { recursive: true })
  fs.writeFileSync(featurePath, 'Feature: thing')

  assert.equal(isUpToDate({ genDir, featurePath, base: 'thing', commit: 'abc' }), false)

  fs.writeFileSync(path.join(genDir, 'thing.acceptance.test.js'), '')
  fs.writeFileSync(
    path.join(genDir, 'metadata', 'thing.json'),
    JSON.stringify({ feature_hash: featureHash(featurePath), aps_commit: 'abc' })
  )
  assert.equal(isUpToDate({ genDir, featurePath, base: 'thing', commit: 'abc' }), true)
  assert.equal(isUpToDate({ genDir, featurePath, base: 'thing', commit: 'other' }), false)
})

test('removeStaleGeneratedTests drops stale tests, keeps live ones, and is idempotent', () => {
  const genDir = tmpDir('stale')
  fs.writeFileSync(path.join(genDir, 'live.acceptance.test.js'), '')
  fs.writeFileSync(path.join(genDir, 'stale.acceptance.test.js'), '')
  fs.writeFileSync(path.join(genDir, 'notes.js'), '')

  removeStaleGeneratedTests(genDir, ['live.feature'])
  assert.deepEqual(listGeneratedTests(genDir), ['live.acceptance.test.js'])
  assert.ok(fs.existsSync(path.join(genDir, 'notes.js')))

  removeStaleGeneratedTests(genDir, ['live.feature'])
  assert.deepEqual(listGeneratedTests(genDir), ['live.acceptance.test.js'])
})

test('generateTests generates stale features, skips up-to-date ones, and reports tests', () => {
  const root = tmpDir('generate')
  const specsDir = path.join(root, 'specs')
  const irDir = path.join(root, 'ir')
  const genDir = path.join(root, 'generated')
  fs.mkdirSync(specsDir, { recursive: true })
  fs.writeFileSync(path.join(specsDir, 'one.feature'), 'Feature: one')
  fs.writeFileSync(path.join(specsDir, 'two.feature'), 'Feature: two')

  const calls = []
  const run = (cmd, args) => {
    calls.push([cmd, ...args])
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

  const first = generateTests({
    specsDir,
    irDir,
    genDir,
    apsDir: root,
    generateScript: 'generate.js',
    commit: 'abc',
    features: ['one.feature', 'two.feature'],
    run
  })
  assert.deepEqual(first, ['one.acceptance.test.js', 'two.acceptance.test.js'])
  assert.equal(calls.filter(([cmd]) => cmd === 'bb').length, 2)
  assert.equal(calls.filter(([cmd]) => cmd === 'node').length, 2)

  calls.length = 0
  const second = generateTests({
    specsDir,
    irDir,
    genDir,
    apsDir: root,
    generateScript: 'generate.js',
    commit: 'abc',
    features: ['one.feature', 'two.feature'],
    run
  })
  assert.deepEqual(second, first)
  assert.equal(calls.length, 0)
})
