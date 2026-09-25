# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-25T19:24:54.164626194Z","feature_name":"TX indexer handoff retry","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/tx-indexer-handoff-retry.feature","background_hash":"5cd624958f61d16ae7b4ef44cc4a41bb067a41ea16b20863c58f852e446e83c2","implementation_hash":"unknown","scenarios":[{"index":4,"name":"TX indexer handoff retry - 5 a failed handoff logs the endpoint and the retry","scenario_hash":"2801f72c260f551c9e10dd1bb127aed232a6fc7f0babe9ba692d721dabba5403","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-09-25T19:24:54.164626194Z"},{"index":1,"name":"TX indexer handoff retry - 2 the handoff retries at the configured interval","scenario_hash":"30895449a5cfaf276c1ddfd494d81ca835dbf8d0c3fedd1690aebc7efc56cd46","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-09-25T18:31:17.761733272Z"},{"index":2,"name":"TX indexer handoff retry - 3 the retry interval defaults to 10 seconds","scenario_hash":"09304c6bef93fb218c1cf742f2ed48726a3dbf99110c9a4b036029e2624002a0","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-09-25T18:31:17.761733272Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: TX indexer handoff retry - 1, TX indexer handoff retry - 2, TX indexer handoff retry - 3, TX indexer handoff retry - 4, TX indexer handoff retry - 5
#
# After initial block download, the block indexer starts the mempool (TX)
# indexer through its control API. The handoff must not stop block indexing: a
# failed or unanswered handoff is retried in the background every retry
# interval until the TX indexer responds, and a failed handoff never exits the
# block indexer.
#
# The retry interval defaults to 10 seconds and is configurable. Each attempt
# uses a bounded request timeout so a hung connection cannot stall the retry
# loop.
#
# A failed attempt is never silent: the indexer logs the target TX indexer
# endpoint (the TX_REST_API_IP and TX_REST_API_PORT values) and the error, and
# reports that the handoff will retry automatically after the retry interval.
Feature: TX indexer handoff retry

  Background:
    Given a psf-memo-indexer with a TX indexer control endpoint

  Scenario Outline: TX indexer handoff retry - 1 the handoff retries until the TX indexer starts
    Given the TX indexer control endpoint fails <failures> time(s) then succeeds
    When the block indexer runs the TX indexer handoff
    Then the TX indexer start request was attempted <attempts> times
    And the handoff retried <retries> time(s)
    And the TX indexer is started

    Examples:
      | failures | attempts | retries |
      | 0        | 1        | 0       |
      | 1        | 2        | 1       |
      | 4        | 5        | 4       |

  Scenario Outline: TX indexer handoff retry - 2 the handoff retries at the configured interval
    Given the TX indexer control endpoint is unreachable
    And the retry interval is configured to <interval> milliseconds
    When the block indexer runs the TX indexer handoff until stopped after <retries> retries
    Then the TX indexer start request was attempted <attempts> times
    And the handoff waited <waited> milliseconds before each retry

    Examples:
      | interval | retries | attempts | waited |
      | 10000    | 3       | 4        | 10000  |
      | 5000     | 2       | 3        | 5000   |
      | 1000     | 4       | 5        | 1000   |

  Scenario Outline: TX indexer handoff retry - 3 the retry interval defaults to 10 seconds
    Given the TX indexer control endpoint is unreachable
    When the block indexer runs the TX indexer handoff until stopped after <retries> retries
    Then the TX indexer start request was attempted <attempts> times
    And the handoff waited <waited> milliseconds before each retry

    Examples:
      | retries | attempts | waited |
      | 2       | 3        | 10000  |

  Scenario Outline: TX indexer handoff retry - 4 a failed handoff does not stop block indexing
    Given a psf-memo-db instance with posts and postHeights stores
    And a psf-memo-indexer configured to write to that database
    And the TX indexer control endpoint is unreachable
    When the block indexer starts the TX indexer handoff in the background
    And the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>"
    Then the posts store contains 1 post document for <txid>

    Examples:
      | txid    | addr                | height | text |
      | post-a1 | bitcoincash:qaddr-a | 600100 | hi   |
      | post-b1 | bitcoincash:qaddr-b | 600200 | gm   |

  Scenario Outline: TX indexer handoff retry - 5 a failed handoff logs the endpoint and the retry
    Given the TX indexer control endpoint is unreachable
    And the TX indexer control endpoint is at IP <ip> and port <port>
    And the retry interval is configured to <interval> milliseconds
    When the block indexer runs the TX indexer handoff until stopped after <retries> retries
    Then the indexer logged a failed handoff for IP <expected_ip> and port <expected_port> with a retry in <expected_interval> milliseconds
    And the indexer logged the failed handoff <log_count> time(s)

    Examples:
      | ip         | port | interval | retries | expected_ip | expected_port | expected_interval | log_count |
      | 172.17.0.1 | 5455 | 10000    | 1       | 172.17.0.1  | 5455          | 10000             | 2         |
      | 10.0.0.7   | 5456 | 5000     | 2       | 10.0.0.7    | 5456          | 5000              | 3         |
