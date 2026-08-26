/*
  Normal acceptance runner for psf-memo-indexer.
*/

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const specsDir = path.join(root, 'specs')
const buildDir = path.join(root, 'build', 'acceptance')
const irDir = path.join(buildDir, 'ir')
const genDir = path.join(buildDir, 'generated')
const apsDir = path.join(root, '..', 'tmp', 'aps-spec')

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts
  }).toString()
}

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

    sh('bb', ['gherkin-parser', featurePath, irPath], { cwd: apsDir })
    sh('node', [path.join(__dirname, 'lib', 'generate.js'), irPath, genDir])
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
