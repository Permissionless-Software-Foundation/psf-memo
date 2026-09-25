# Scenarios: TX indexer handoff retry - 1, TX indexer handoff retry - 2, TX indexer handoff retry - 3, TX indexer handoff retry - 4
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
