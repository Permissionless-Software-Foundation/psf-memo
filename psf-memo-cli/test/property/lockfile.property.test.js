/*
  Property tests for the CLI lockfile registry rules.

  The acceptance step pins the real package-lock.json. These properties exercise
  broad synthetic lockfiles to confirm the classifier invariants over every
  entry shape:

    - only http(s)-resolved entries outside the public registry are offenders;
      git, file, non-string, and missing resolutions are ignored.
    - the root entry and malformed (null) entries are ignored.
    - lockedPackage returns exactly the node_modules entry for a name and throws
      for a missing one.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import {
  PUBLIC_REGISTRY,
  nonPublicRegistryResolves,
  lockedPackage
} from '../../acceptance/lib/lockfile.js'

const rng = seededRandom(20261012)

const CATEGORIES = [
  'git',
  'file',
  'nonstring',
  'absent',
  'public',
  'private-http',
  'private-https'
]

// A resolved value of the requested shape. Only the private shapes are
// offenders; the lockfile entry for `absent` carries no resolved field.
function resolvedFor (category, name) {
  switch (category) {
    case 'git':
      return 'git+https://github.com/example/repo.git'
    case 'file':
      return 'file:../local'
    case 'nonstring':
      return 42
    case 'public':
      return `${PUBLIC_REGISTRY}${name}/-/${name}-1.0.0.tgz`
    case 'private-http':
      return `http://94.130.170.209:4873/${name}/-/${name}-1.0.0.tgz`
    case 'private-https':
      return `https://npm.example.com/${name}/-/${name}-1.0.0.tgz`
    default:
      return undefined
  }
}

test('nonPublicRegistryResolves flags exactly the non-public http(s) entries', () => {
  for (let i = 0; i < 300; i++) {
    const count = Math.floor(rng() * 15)
    const packages = {}
    const expected = []

    for (let j = 0; j < count; j++) {
      const name = `pkg-${i}-${j}`
      const key = `node_modules/${name}`
      const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)]
      const resolved = resolvedFor(category, name)
      packages[key] = category === 'absent' ? { version: '1.0.0' } : { version: '1.0.0', resolved }

      if (category.startsWith('private-')) {
        expected.push(`${key} -> ${resolved}`)
      }
    }

    // The root entry and a null entry must be ignored even when they look bad.
    packages[''] = { resolved: 'http://private.example.com/root.tgz' }
    packages['node_modules/broken'] = null

    assert.deepEqual(nonPublicRegistryResolves({ packages }).sort(), expected.sort())
  }

  assert.deepEqual(nonPublicRegistryResolves({}), [])
  assert.deepEqual(nonPublicRegistryResolves({ packages: undefined }), [])
})

test('lockedPackage returns the matching entry and throws for a missing name', () => {
  for (let i = 0; i < 200; i++) {
    const count = Math.floor(rng() * 10)
    const packages = {}
    const names = []

    for (let j = 0; j < count; j++) {
      const name = `dep-${i}-${j}`
      names.push(name)
      packages[`node_modules/${name}`] = { version: String(j) }
    }

    const lockfile = { packages }
    for (const name of names) {
      assert.equal(lockedPackage(lockfile, name), packages[`node_modules/${name}`])
    }

    assert.throws(
      () => lockedPackage(lockfile, `absent-${i}`),
      /Expected a locked package/
    )
  }

  assert.throws(() => lockedPackage({}, 'missing'), /Expected a locked package/)
  assert.throws(() => lockedPackage({ packages: undefined }, 'missing'), /Expected a locked package/)
})
