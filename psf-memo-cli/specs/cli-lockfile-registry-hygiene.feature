# mutation-stamp: sha256=0b69b965daedfe50ceed276a09a995458144fac6e7babe3b0d46712f84430c4e
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-12T23:55:15.001987922Z","feature_name":"CLI Lockfile Registry Hygiene","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/cli-lockfile-registry-hygiene.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: CLI Lockfile Registry Hygiene - 1, CLI Lockfile Registry Hygiene - 2
# `psf-memo-cli/package-lock.json` pinned bch-token-sweep@2.2.1 to a private
# registry (http://94.130.170.209:4873/...) that is unreachable off the PSF
# network, so `npm install` and `npm ci` failed on a fresh machine even though
# the identical tarball and integrity hash are published on the public npm
# registry. This feature pins the install contract: every locked package
# resolves from the public npm registry, and the repointed package keeps its
# published integrity hash so the change is a URL correction, not a content
# change.
Feature: CLI Lockfile Registry Hygiene

  Scenario: CLI Lockfile Registry Hygiene - 1 every locked package resolves from the public npm registry
    Given the CLI dependency lockfile
    Then every locked package resolves from the public npm registry

  Scenario: CLI Lockfile Registry Hygiene - 2 bch-token-sweep resolves from the public registry with its published integrity
    Given the CLI dependency lockfile
    Then the locked package "bch-token-sweep" resolves from the public npm registry
    And the locked package "bch-token-sweep" keeps its published integrity hash
