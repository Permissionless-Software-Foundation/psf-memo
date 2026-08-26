/*
  Normal acceptance runner for psf-memo-client.

  Orchestrates the acceptance pipeline:
    feature file -> bb gherkin-parser -> JSON IR -> acceptance entrypoint
    generator -> generated test entry points -> node test runner

  It procures the latest Babashka APS tools from the Acceptance-Pipeline-
  Specification repository on first use, then parses, generates, and runs every
  Gherkin feature under specs/.

  Exit code 0 when all acceptance tests pass; non-zero otherwise.
*/

'use strict'

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const specsDir = path.join(root, 'specs')
const buildDir = path.join(root, 'build', 'acceptance')
const irDir = path.join(buildDir, 'ir')
const genDir = path.join(buildDir, 'generated')
const apsDir = path.join(root, 'tmp', 'aps-spec')

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts
  }).toString()
}

// Procure the latest APS tools if not already present in the worktree.
function ensureAps () {
  if (fs.existsSync(apsDir)) return
  fs.mkdirSync(path.dirname(apsDir), { recursive: true })
  sh('git', ['clone', '--depth', '1',
    'https://github.com/unclebob/Acceptance-Pipeline-Specification.git', apsDir])
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

  for (const featureFile of features) {
    const base = featureFile.replace(/\.feature$/i, '')
    const featurePath = path.join(specsDir, featureFile)
    const irPath = path.join(irDir, `${base}.json`)

    // 1) Parse the feature to JSON IR using the Babashka APS gherkin-parser.
    sh('bb', ['gherkin-parser', featurePath, irPath], { cwd: apsDir })

    // 2) Generate executable acceptance entry points from the IR.
    sh('node', [path.join(root, 'acceptance', 'lib', 'generate.js'), irPath, genDir])
  }

  // 3) Run every generated acceptance test.
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
