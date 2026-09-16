/*
  Normal acceptance runner for psf-memo-indexer.
*/

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const specsDir = path.join(root, 'specs')
const buildDir = path.join(root, 'build', 'acceptance')
const irDir = path.join(buildDir, 'ir')
const genDir = path.join(buildDir, 'generated')
const repoRoot = path.resolve(root, '..')
const apsDir = path.join(repoRoot, 'tmp', 'aps')
const APS_URL = 'https://github.com/unclebob/Acceptance-Pipeline-Specification.git'

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts
  }).toString()
}

function ensureAps () {
  if (fs.existsSync(path.join(apsDir, 'bb.edn'))) return
  const shared = path.join(repoRoot, 'swarmforge', 'scripts', 'ensure-aps.sh')
  if (fs.existsSync(shared)) {
    sh('/bin/bash', [shared])
    return
  }
  fs.mkdirSync(path.dirname(apsDir), { recursive: true })
  sh('git', ['clone', '--depth', '1', APS_URL, apsDir])
}

function apsCommit () {
  try {
    return sh('git', ['-C', apsDir, 'rev-parse', 'HEAD']).trim()
  } catch (err) {
    return ''
  }
}

function featureHash (featurePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(featurePath)).digest('hex')
}

// True when the generated entry point and metadata already match the current
// feature text and APS checkout, so parse/generate can be skipped.
function isUpToDate (featurePath, base, commit) {
  const testFile = path.join(genDir, `${base}.acceptance.test.js`)
  const metaFile = path.join(genDir, 'metadata', `${base}.json`)
  if (!fs.existsSync(testFile) || !fs.existsSync(metaFile)) return false
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    return meta.feature_hash === featureHash(featurePath) && meta.aps_commit === commit
  } catch (err) {
    return false
  }
}

// Remove generated tests for features that no longer exist under specs/.
function removeStaleGeneratedTests (features) {
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

function main () {
  ensureAps()

  const features = fs
    .readdirSync(specsDir)
    .filter((f) => f.endsWith('.feature'))
    .sort()

  if (features.length === 0) {
    console.log('No feature files found under specs/.')
    return
  }

  fs.mkdirSync(irDir, { recursive: true })
  fs.mkdirSync(genDir, { recursive: true })
  removeStaleGeneratedTests(features)

  const commit = apsCommit()

  for (const featureFile of features) {
    const base = featureFile.replace(/\.feature$/i, '')
    const featurePath = path.join(specsDir, featureFile)

    if (isUpToDate(featurePath, base, commit)) continue

    const irPath = path.join(irDir, `${base}.json`)

    sh('bb', ['gherkin-parser', featurePath, irPath], { cwd: apsDir })
    sh('node', [path.join(__dirname, 'lib', 'generate.js'), irPath, genDir, featurePath, commit])
  }

  const tests = fs
    .readdirSync(genDir)
    .filter((f) => f.endsWith('.acceptance.test.js'))
    .sort()

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

  if (failures > 0) {
    console.error(`ACCEPTANCE: ${failures} failing test file(s)`)
    process.exit(1)
  } else {
    console.log(`ACCEPTANCE: all ${tests.length} generated test file(s) passed`)
  }
}

main()
