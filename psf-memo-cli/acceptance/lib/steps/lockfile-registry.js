/*
  Gherkin step handlers for the CLI Lockfile Registry Hygiene feature (F4).

  These scenarios read the real psf-memo-cli package-lock.json and assert the
  install contract: every registry-resolved package points at the public npm
  registry, and the repointed bch-token-sweep entry keeps its published
  integrity hash. Git and local dependencies (which carry no registry URL) are
  out of scope.
*/

// Node libraries
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Local libraries
import { resolveParam } from '../step-support.js'
import {
  PUBLIC_REGISTRY,
  PUBLISHED_INTEGRITY,
  nonPublicRegistryResolves,
  lockedPackage
} from '../lockfile.js'

const __dirname = import.meta.dirname

// The lockfile under test.
const LOCKFILE_PATH = path.resolve(__dirname, '../../../package-lock.json')

const lockfileRegistryHandlers = [
  {
    name: 'the CLI dependency lockfile',
    pattern: /^the CLI dependency lockfile$/,
    run (m, example, world) {
      world.lockfile = JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8'))
    }
  },
  {
    name: 'every locked package resolves from the public npm registry',
    pattern: /^every locked package resolves from the public npm registry$/,
    run (m, example, world) {
      const offenders = nonPublicRegistryResolves(world.lockfile)
      if (offenders.length > 0) {
        throw new Error(`Expected every package to resolve from ${PUBLIC_REGISTRY}, got: ${offenders.join(', ')}`)
      }
    }
  },
  {
    name: 'a locked package resolves from the public npm registry',
    pattern: /^the locked package "([^"]+)" resolves from the public npm registry$/,
    run (m, example, world) {
      const name = resolveParam(m[1], example)
      const entry = lockedPackage(world.lockfile, name)
      if (!entry.resolved.startsWith(PUBLIC_REGISTRY)) {
        throw new Error(`Expected "${name}" to resolve from ${PUBLIC_REGISTRY}, got "${entry.resolved}"`)
      }
    }
  },
  {
    name: 'a locked package keeps its published integrity hash',
    pattern: /^the locked package "([^"]+)" keeps its published integrity hash$/,
    run (m, example, world) {
      const name = resolveParam(m[1], example)
      const expected = PUBLISHED_INTEGRITY[name]
      if (!expected) {
        throw new Error(`No published integrity hash recorded for "${name}"`)
      }

      const entry = lockedPackage(world.lockfile, name)
      if (entry.integrity !== expected) {
        throw new Error(`Expected "${name}" to keep integrity "${expected}", got "${entry.integrity}"`)
      }
    }
  }
]

export { lockfileRegistryHandlers }
