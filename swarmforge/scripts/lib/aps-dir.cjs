/*
  Resolve the canonical Acceptance Pipeline Specification (APS) checkout.

  The shared ensure-aps.sh script single-sources the checkout at the repository
  root (resolved via git-common-dir) and prints that path on stdout. SwarmForge
  worktrees must therefore use the printed path: the worktree-local
  <worktree>/tmp/aps directory is never created when the shared script handles
  the checkout, so running the parser with that path as cwd fails with ENOENT.

  Fall back to <repoRoot>/tmp/aps only when the shared script is unavailable
  (for example, a component checked out on its own), where the acceptance
  runner clones APS itself.
*/
'use strict'

const path = require('node:path')

function resolveApsDir ({ repoRoot, sharedExists, sharedOutput }) {
  if (sharedExists) {
    const printed = String(sharedOutput || '').trim()
    if (printed) return printed
  }
  return path.join(repoRoot, 'tmp', 'aps')
}

module.exports = { resolveApsDir }
