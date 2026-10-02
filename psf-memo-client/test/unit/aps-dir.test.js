/*
  Unit tests for resolving the canonical APS checkout used by the acceptance
  runners.

  ensure-aps.sh single-sources the checkout at the repository root and prints
  that path. In a SwarmForge worktree the local <worktree>/tmp/aps does not
  exist, so the runner must use the printed path rather than its own fallback.
  These tests pin that decision without shelling out.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { resolveApsDir } = require('../../../swarmforge/scripts/lib/aps-dir.cjs')

test('uses the path printed by the shared ensure-aps.sh', () => {
  const printed = '/repo/tmp/aps'

  assert.equal(
    resolveApsDir({
      repoRoot: '/repo/.worktrees/coder',
      sharedExists: true,
      sharedOutput: `${printed}\n`
    }),
    printed
  )
})

test('falls back to the repo-root tmp/aps when the shared script is absent', () => {
  assert.equal(
    resolveApsDir({
      repoRoot: '/repo/.worktrees/coder',
      sharedExists: false,
      sharedOutput: ''
    }),
    path.join('/repo/.worktrees/coder', 'tmp', 'aps')
  )
})

test('falls back when the shared script exists but prints no path', () => {
  assert.equal(
    resolveApsDir({
      repoRoot: '/repo/.worktrees/coder',
      sharedExists: true,
      sharedOutput: '   \n'
    }),
    path.join('/repo/.worktrees/coder', 'tmp', 'aps')
  )
})
