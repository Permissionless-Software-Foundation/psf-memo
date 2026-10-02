/*
  Normal acceptance runner for psf-memo-db.

  The shared generation pipeline lives in
  swarmforge/scripts/lib/acceptance-runner.cjs. This runner supplies the
  db-specific paths and runs the generated tests with bounded concurrency.
*/

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureAps,
  apsCommit,
  featureFiles,
  generateTests
} from '../../swarmforge/scripts/lib/acceptance-runner.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const specsDir = path.join(root, 'specs')
const buildDir = path.join(root, 'build', 'acceptance')
const irDir = path.join(buildDir, 'ir')
const genDir = path.join(buildDir, 'generated')
const repoRoot = path.resolve(root, '..')

// Async variant used to run generated acceptance test files concurrently. Each
// generated test opens its own isolated LevelDB world under tmp/acceptance, so
// running several at once does not share state.
function shAsync (cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: stdout || '', stderr: stderr || '' })
    })
  })
}

// Run generated test files with bounded concurrency, preserving per-file
// output order. Generation stays sequential; only the test phase is pooled.
// Override the pool size with ACCEPTANCE_CONCURRENCY (1 restores the old
// sequential behavior).
async function runTests (tests) {
  const requested = Number.parseInt(process.env.ACCEPTANCE_CONCURRENCY || '', 10)
  const concurrency = Number.isFinite(requested) && requested > 0
    ? requested
    : Math.min(4, tests.length)
  const results = new Array(tests.length)
  let next = 0

  async function worker () {
    while (true) {
      const index = next++
      if (index >= tests.length) return
      const testFile = tests[index]
      const result = await shAsync('node', [path.join(genDir, testFile)])
      results[index] = { testFile, ...result }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tests.length) }, worker))
  return results
}

// Each scenario opens an isolated LevelDB directory under tmp/acceptance.
// Remove leftovers from earlier runs (including pre-fix runs that leaked them)
// so the directory cannot grow without bound.
function cleanStaleWorlds () {
  try {
    fs.rmSync(path.join(root, 'tmp', 'acceptance'), { recursive: true, force: true })
  } catch (err) {
    // ignore cleanup errors
  }
}

async function main () {
  cleanStaleWorlds()
  const apsDir = ensureAps({ repoRoot, apsDir: path.join(repoRoot, 'tmp', 'aps') })

  const features = featureFiles(specsDir)
  if (features.length === 0) {
    console.log('No feature files found under specs/.')
    return
  }

  const commit = apsCommit(apsDir)
  const tests = generateTests({
    specsDir,
    irDir,
    genDir,
    apsDir,
    generateScript: path.join(__dirname, 'lib', 'generate.js'),
    commit,
    features
  })

  const results = await runTests(tests)
  let failures = 0
  for (const { testFile, ok, stdout, stderr } of results) {
    process.stdout.write(stdout)
    process.stderr.write(stderr)
    if (ok) {
      console.log(`ACCEPTANCE PASS: ${testFile}`)
    } else {
      failures++
      console.error(`ACCEPTANCE FAIL: ${testFile}`)
    }
  }

  if (failures > 0) {
    console.error(`ACCEPTANCE: ${failures} failing test file(s)`)
    process.exit(1)
  } else {
    console.log(`ACCEPTANCE: all ${tests.length} generated test file(s) passed`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
