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
