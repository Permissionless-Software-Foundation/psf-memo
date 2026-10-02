/*
  Normal acceptance runner for psf-memo-indexer.

  The shared generation and run pipeline lives in
  swarmforge/scripts/lib/acceptance-runner.cjs; this is the thin adapter that
  supplies the indexer's root and paths.
*/

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runComponentAcceptance } from '../../swarmforge/scripts/lib/acceptance-runner.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

runComponentAcceptance({
  root,
  acceptanceDir: __dirname,
  repoRoot: path.resolve(root, '..')
})
