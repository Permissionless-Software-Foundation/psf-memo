/*
  Normal acceptance runner for psf-memo-cli.

  The shared generation and run pipeline lives in
  swarmforge/scripts/lib/acceptance-runner.cjs. This runner supplies the
  cli-specific paths and runs the generated tests sequentially.
*/

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ensureAps,
  apsCommit,
  featureFiles,
  generateTests,
  runTestsSequentially
} from '../../swarmforge/scripts/lib/acceptance-runner.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const repoRoot = path.resolve(root, '..')

const specsDir = path.join(root, 'specs')
const buildDir = path.join(root, 'build', 'acceptance')
const irDir = path.join(buildDir, 'ir')
const genDir = path.join(buildDir, 'generated')

function main () {
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

  runTestsSequentially(genDir, tests)
}

main()
