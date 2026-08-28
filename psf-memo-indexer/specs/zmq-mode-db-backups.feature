# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T17:15:12.126220806Z","feature_name":"ZMQ mode DB backups","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/zmq-mode-db-backups.feature","background_hash":"dbd9928c8a005b3b4846976d2144892926158c50a05868292fc9cdc0a03ef735","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: ZMQ mode DB backups - 1
Feature: ZMQ mode DB backups

  Background:
    Given a psf-memo-db instance that records backup requests
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: ZMQ mode DB backups - 1 a backup is created every epoch blocks
    When the block indexer in ZMQ mode processes a block at height <height> with epoch <epoch>
    Then the psf-memo-db receives <count> backup request for block <height> with epoch <epoch>

    Examples:
      | height | epoch | count |
      | 1000   | 1000  | 1     |
      | 2000   | 1000  | 1     |
      | 1001   | 1000  | 0     |
      | 500    | 500   | 1     |
      | 1001   | 500   | 0     |
