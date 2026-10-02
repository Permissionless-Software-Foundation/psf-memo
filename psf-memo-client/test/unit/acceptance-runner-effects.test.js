/*
  Hardening tests for the effectful helpers in the shared acceptance runner.

  The pure-helper tests in acceptance-runner.test.js exercise the filesystem and
  hashing decisions. These tests pin the effectful branches that were otherwise
  uncovered: APS checkout resolution (shared-script path and fallback clone),
  the metadata error path, the acceptance report/exit codes, the sequential test
  loop, and the full sequential flow. They exist so language mutation has a
  covered assertion at each branch boundary.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  ensureAps,
  apsCommit,
  featureHash,
  isUpToDate,
  reportAcceptance,
  runTestsSequentially,
  runSequentialAcceptance
} = require('../../../swarmforge/scripts/lib/acceptance-runner.cjs')
const { makeTmpDir } = require('../support/tmp-dir')

const tmpDir = makeTmpDir('acc-effects')

function writeFile (file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  return file
}

test('ensureAps uses the path printed by the shared script even when a local checkout exists', () => {
  const repoRoot = tmpDir('ensure-shared')
  const shared = writeFile(
    path.join(repoRoot, 'swarmforge', 'scripts', 'ensure-aps.sh'),
    '#!/bin/sh\n'
  )
  const apsDir = path.join(repoRoot, 'tmp', 'aps')
  writeFile(path.join(apsDir, 'bb.edn'), '')

  const canonical = path.join(repoRoot, 'canonical')
  writeFile(path.join(canonical, 'bb.edn'), '')

  const calls = []
  const run = (cmd, args) => {
    calls.push([cmd, ...args])
    return canonical
  }

  assert.equal(ensureAps({ repoRoot, apsDir, run }), canonical)
  assert.deepEqual(calls, [['/bin/bash', shared]])
})

test('ensureAps creates the fallback checkout parent directory recursively', () => {
  const base = tmpDir('ensure-mkdir')
  const repoRoot = path.join(base, 'deep', 'repo')
  const apsDir = path.join(repoRoot, 'tmp', 'aps')
  const calls = []
  const run = (cmd, args) => {
    calls.push([cmd, ...args])
    return ''
  }

  const resolved = ensureAps({ repoRoot, apsDir, run })

  assert.equal(resolved, apsDir)
  assert.ok(fs.existsSync(path.join(repoRoot, 'tmp')))
  assert.deepEqual(calls[0].slice(0, 2), ['git', 'clone'])
})

test('isUpToDate returns false when the metadata file is corrupt', () => {
  const root = tmpDir('uptodate-corrupt')
  const genDir = path.join(root, 'generated')
  const featurePath = writeFile(path.join(root, 'thing.feature'), 'Feature: thing')
  writeFile(path.join(genDir, 'thing.acceptance.test.js'), '')
  writeFile(path.join(genDir, 'metadata', 'thing.json'), '{not json')

  assert.equal(isUpToDate({ genDir, featurePath, base: 'thing', commit: 'abc' }), false)
})

test('isUpToDate returns false when the generated test file is missing', () => {
  const root = tmpDir('uptodate-missing-test')
  const genDir = path.join(root, 'generated')
  const featurePath = writeFile(path.join(root, 'thing.feature'), 'Feature: thing')
  writeFile(
    path.join(genDir, 'metadata', 'thing.json'),
    JSON.stringify({ feature_hash: featureHash(featurePath), aps_commit: 'abc' })
  )

  assert.equal(isUpToDate({ genDir, featurePath, base: 'thing', commit: 'abc' }), false)
})

test('reportAcceptance reports success and does not exit without failures', (t) => {
  const exits = []
  const logs = []
  t.mock.method(process, 'exit', (code) => { exits.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', (...args) => { logs.push(args.join(' ')) })

  reportAcceptance([{}, {}], 0)

  assert.deepEqual(exits, [])
  assert.ok(logs.some((line) => line.includes('all 2')))
})

test('reportAcceptance exits non-zero when a test file failed', (t) => {
  const exits = []
  t.mock.method(process, 'exit', (code) => { exits.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})

  reportAcceptance([{}], 1)

  assert.deepEqual(exits, [1])
})

test('runTestsSequentially runs every generated test and reports success', (t) => {
  const genDir = tmpDir('sequential-pass')
  writeFile(path.join(genDir, 'a.acceptance.test.js'), "console.log('a ok')\n")
  writeFile(path.join(genDir, 'b.acceptance.test.js'), "console.log('b ok')\n")

  const exits = []
  const logs = []
  t.mock.method(process, 'exit', (code) => { exits.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', (...args) => { logs.push(args.join(' ')) })

  runTestsSequentially(genDir, ['a.acceptance.test.js', 'b.acceptance.test.js'])

  assert.deepEqual(exits, [])
  assert.ok(logs.some((line) => line.includes('ACCEPTANCE PASS: a.acceptance.test.js')))
  assert.ok(logs.some((line) => line.includes('all 2')))
})

function runFailingTestCapturing (t, { name, stream, output }) {
  const genDir = tmpDir(name)
  writeFile(
    path.join(genDir, 'fail.acceptance.test.js'),
    `process.${stream}.write('${output}\\n')\nprocess.exit(3)\n`
  )

  const writes = []
  const realWrite = process[stream].write.bind(process[stream])
  t.mock.method(process[stream], 'write', (chunk, ...rest) => {
    writes.push(String(chunk))
    return realWrite(chunk, ...rest)
  })
  const exits = []
  t.mock.method(process, 'exit', (code) => { exits.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})

  runTestsSequentially(genDir, ['fail.acceptance.test.js'])
  return { writes, exits }
}

for (const stream of ['stdout', 'stderr']) {
  test(`runTestsSequentially streams a failing test ${stream} before reporting the failure`, (t) => {
    const output = stream === 'stdout' ? 'boom-out' : 'boom-err'
    const { writes, exits } = runFailingTestCapturing(t, {
      name: `sequential-${stream}`,
      stream,
      output
    })

    assert.ok(writes.some((chunk) => chunk.includes(output)))
    assert.deepEqual(exits, [1])
  })
}

test('runSequentialAcceptance runs the suite when one feature is present', (t) => {
  const repoRoot = tmpDir('sequential-flow')
  const apsDir = path.join(repoRoot, 'tmp', 'aps')
  writeFile(path.join(apsDir, 'bb.edn'), '')

  const specsDir = path.join(repoRoot, 'specs')
  const featurePath = writeFile(path.join(specsDir, 'one.feature'), 'Feature: one')

  const genDir = path.join(repoRoot, 'generated')
  writeFile(path.join(genDir, 'one.acceptance.test.js'), "console.log('ran one')\n")
  writeFile(
    path.join(genDir, 'metadata', 'one.json'),
    JSON.stringify({ feature_hash: featureHash(featurePath), aps_commit: apsCommit(apsDir) })
  )

  const logs = []
  const realWrite = process.stdout.write.bind(process.stdout)
  t.mock.method(process.stdout, 'write', (chunk, ...rest) => {
    logs.push(String(chunk))
    return realWrite(chunk, ...rest)
  })
  const exits = []
  t.mock.method(process, 'exit', (code) => { exits.push(code) })
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', (...args) => { logs.push(args.join(' ')) })

  runSequentialAcceptance({
    specsDir,
    irDir: path.join(repoRoot, 'ir'),
    genDir,
    repoRoot,
    apsDir,
    generateScript: path.join(repoRoot, 'generate.js')
  })

  assert.deepEqual(exits, [])
  assert.ok(logs.some((line) => line.includes('ran one')))
  assert.ok(!logs.some((line) => line.includes('No feature files found')))
})
