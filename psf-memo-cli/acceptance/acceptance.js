/*
  Normal acceptance runner for psf-memo-cli.

  The shared generation and run pipeline lives in
  swarmforge/scripts/lib/acceptance-runner.cjs; this is the thin adapter that
  supplies the cli's root and paths.

  Exit code 0 when all acceptance tests pass; non-zero otherwise.
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
