/*
  Pure rules for the CLI dependency lockfile.

  Extracted from the lockfile-registry acceptance step so the registry
  classifier and package lookup can be exercised directly, without the Gherkin
  world wiring.
*/

// The public npm registry prefix every registry-resolved package must use.
export const PUBLIC_REGISTRY = 'https://registry.npmjs.org/'

// The integrity hashes published on the public npm registry for packages the
// acceptance suite pins. A repointed registry URL must not change the content
// hash.
export const PUBLISHED_INTEGRITY = {
  'bch-token-sweep': 'sha512-f4UGEpPXzea7HQMRSEb6h/amXiwrlsMBAjl1dVYg5//26IDWeG+e3qVNtMJhm00NMZ0BS+LasUa2xlz0UVziZA=='
}

// The set of registry-resolved packages in the lockfile that do not use the
// public npm registry. Entries without an http(s) resolved URL (git, file, and
// workspace dependencies) are skipped.
export function nonPublicRegistryResolves (lockfile) {
  const offenders = []

  for (const [name, entry] of Object.entries(lockfile.packages || {})) {
    if (name === '' || !entry || typeof entry.resolved !== 'string') continue
    if (!/^https?:\/\//.test(entry.resolved)) continue
    if (!entry.resolved.startsWith(PUBLIC_REGISTRY)) {
      offenders.push(`${name} -> ${entry.resolved}`)
    }
  }

  return offenders
}

// The lockfile entry for a package name, or throw a clear failure.
export function lockedPackage (lockfile, name) {
  const entry = (lockfile.packages || {})[`node_modules/${name}`]
  if (!entry) {
    throw new Error(`Expected a locked package "${name}"`)
  }
  return entry
}
