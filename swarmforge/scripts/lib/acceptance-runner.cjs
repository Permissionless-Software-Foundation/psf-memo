/*
  Shared acceptance-runner helpers for the psf-memo components.

  The client, db, and indexer acceptance runners orchestrate the same pipeline:
  resolve the single canonical APS checkout, parse each Gherkin feature to JSON
  IR, generate an executable test entry point, then run the generated tests.
  This module centralizes checkout resolution, the generation half, and the
  default sequential run/report loop, so each component's runner is a thin
  adapter that differs only in how it runs the generated tests.

  `run` on the effectful helpers defaults to `sh` and can be injected by tests.
*/
'use strict'

const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { resolveApsDir } = require('./aps-dir.cjs')

const APS_URL = 'https://github.com/unclebob/Acceptance-Pipeline-Specification.git'

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts
  }).toString()
}

// Ensure the single canonical APS checkout is present. When the shared
// ensure-aps.sh script exists, use the path it prints: worktrees share one
// checkout at the repository root, not a worktree-local tmp/aps. Returns the
// resolved checkout directory.
function ensureAps ({ repoRoot, apsDir, run = sh }) {
  const shared = path.join(repoRoot, 'swarmforge', 'scripts', 'ensure-aps.sh')
  const sharedExists = fs.existsSync(shared)
  if (!sharedExists && fs.existsSync(path.join(apsDir, 'bb.edn'))) return apsDir
  const sharedOutput = sharedExists ? run('/bin/bash', [shared]) : ''
  const resolved = resolveApsDir({ repoRoot, sharedExists, sharedOutput })
  if (fs.existsSync(path.join(resolved, 'bb.edn'))) return resolved
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  run('git', ['clone', '--depth', '1', APS_URL, resolved])
  return resolved
}

function apsCommit (apsDir, run = sh) {
  try {
    return run('git', ['-C', apsDir, 'rev-parse', 'HEAD']).trim()
  } catch (err) {
    return ''
  }
}

function featureHash (featurePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(featurePath)).digest('hex')
}

// True when the generated entry point and metadata already match the current
// feature text and APS checkout, so parse/generate can be skipped.
function isUpToDate ({ genDir, featurePath, base, commit, hash = featureHash }) {
  const testFile = path.join(genDir, `${base}.acceptance.test.js`)
  const metaFile = path.join(genDir, 'metadata', `${base}.json`)
  if (!fs.existsSync(testFile) || !fs.existsSync(metaFile)) return false
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    return meta.feature_hash === hash(featurePath) && meta.aps_commit === commit
  } catch (err) {
    return false
  }
}

// Remove generated tests for features that no longer exist under specs/.
function removeStaleGeneratedTests (genDir, features) {
  const bases = new Set(features.map((f) => f.replace(/\.feature$/i, '')))
  if (!fs.existsSync(genDir)) return
  for (const file of fs.readdirSync(genDir)) {
    if (!file.endsWith('.acceptance.test.js')) continue
    const base = file.replace(/\.acceptance\.test\.js$/, '')
    if (!bases.has(base)) {
      try {
        fs.rmSync(path.join(genDir, file), { force: true })
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }
}

function featureFiles (specsDir) {
  return fs.readdirSync(specsDir).filter((f) => f.endsWith('.feature')).sort()
}

function listGeneratedTests (genDir) {
  return fs.readdirSync(genDir).filter((f) => f.endsWith('.acceptance.test.js')).sort()
}

// Report a completed acceptance run and exit non-zero when any file failed.
function reportAcceptance (tests, failures) {
  if (failures > 0) {
    console.error(`ACCEPTANCE: ${failures} failing test file(s)`)
    process.exit(1)
  } else {
    console.log(`ACCEPTANCE: all ${tests.length} generated test file(s) passed`)
  }
}

// Run generated tests one at a time, streaming each file's output, then report.
// Used by the client and indexer runners.
function runTestsSequentially (genDir, tests) {
  let failures = 0
  for (const testFile of tests) {
    try {
      const out = sh('node', [path.join(genDir, testFile)])
      process.stdout.write(out)
      console.log(`ACCEPTANCE PASS: ${testFile}`)
    } catch (err) {
      failures++
      process.stdout.write(err.stdout || '')
      process.stderr.write(err.stderr || '')
      console.error(`ACCEPTANCE FAIL: ${testFile}`)
    }
  }
  reportAcceptance(tests, failures)
}

// Parse and generate acceptance entry points for every feature, skipping those
// already up to date. Returns the sorted generated test file names.
function generateTests ({
  specsDir,
  irDir,
  genDir,
  apsDir,
  generateScript,
  commit,
  features,
  run = sh
}) {
  fs.mkdirSync(irDir, { recursive: true })
  fs.mkdirSync(genDir, { recursive: true })
  removeStaleGeneratedTests(genDir, features)

  for (const featureFile of features) {
    const base = featureFile.replace(/\.feature$/i, '')
    const featurePath = path.join(specsDir, featureFile)
    if (isUpToDate({ genDir, featurePath, base, commit })) continue

    const irPath = path.join(irDir, `${base}.json`)
    run('bb', ['gherkin-parser', featurePath, irPath], { cwd: apsDir })
    run('node', [generateScript, irPath, genDir, featurePath, commit])
  }

  return listGeneratedTests(genDir)
}

// Full acceptance flow for runners that run generated tests sequentially:
// resolve the APS checkout, generate entry points, run tests, report. Exits
// non-zero when any generated test file fails.
function runSequentialAcceptance ({ specsDir, irDir, genDir, repoRoot, apsDir, generateScript }) {
  const resolvedApsDir = ensureAps({ repoRoot, apsDir })

  const features = featureFiles(specsDir)
  if (features.length === 0) {
    console.log('No feature files found under specs/.')
    return
  }

  const commit = apsCommit(resolvedApsDir)
  const tests = generateTests({
    specsDir,
    irDir,
    genDir,
    apsDir: resolvedApsDir,
    generateScript,
    commit,
    features
  })

  runTestsSequentially(genDir, tests)
}

// Convenience wrapper for the standard component layout: `specs/`,
// `build/acceptance/{ir,generated}`, and a generator at
// `<acceptanceDir>/lib/generate.js`. Used by the client and indexer runners.
function runComponentAcceptance ({ root, acceptanceDir, repoRoot }) {
  return runSequentialAcceptance({
    specsDir: path.join(root, 'specs'),
    irDir: path.join(root, 'build', 'acceptance', 'ir'),
    genDir: path.join(root, 'build', 'acceptance', 'generated'),
    repoRoot,
    apsDir: path.join(repoRoot, 'tmp', 'aps'),
    generateScript: path.join(acceptanceDir, 'lib', 'generate.js')
  })
}

module.exports = {
  sh,
  ensureAps,
  apsCommit,
  featureHash,
  isUpToDate,
  removeStaleGeneratedTests,
  featureFiles,
  listGeneratedTests,
  generateTests,
  reportAcceptance,
  runTestsSequentially,
  runSequentialAcceptance,
  runComponentAcceptance
}
