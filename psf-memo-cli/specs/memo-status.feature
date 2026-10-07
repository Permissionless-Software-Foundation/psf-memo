# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T04:02:56.951106251Z","feature_name":"Memo Status","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-status.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Memo Status (R14): the psf-memo-cli command that reports the psf-memo-db
# indexer's sync state from GET /level/status/status: the first indexed block
# (startBlockHeight), the last fully indexed block (syncedBlockHeight), and the
# chain tip at the last sync (chainBlockHeight). An agent uses it to see whether
# a broadcast can be visible yet (R16 memo-wait). Read-only: no wallet, no
# broadcast. A missing status record is reported as a not-found failure (exit
# 1); the /level/* 404 resolves to null at the client layer.
#
# Scenarios: Memo Status - 1, Memo Status - 2, Memo Status - 3
Feature: Memo Status

  Scenario Outline: Memo Status - 1 the command reports the indexer sync heights
    Given the Memo DB service serves the indexer status <startBlockHeight> <syncedBlockHeight> <chainBlockHeight>
    When the memo-status command runs
    Then the command reported start block height <startBlockHeight>, synced block height <syncedBlockHeight>, and chain block height <chainBlockHeight>

    Examples:
      | startBlockHeight | syncedBlockHeight | chainBlockHeight |
      | 524999           | 800000            | 800001           |
      | 0                | 0                 | 750000           |
      | 100              | 900000            | 900000           |

  Scenario: Memo Status - 2 a missing sync state reports not found
    Given the Memo DB service has no indexer status
    When the memo-status command runs
    Then the memo-status command reported not found

  Scenario: Memo Status - 3 a failed request reports the error
    Given the Memo DB service fails the status request
    When the memo-status command runs
    Then the memo-status command reported an error
