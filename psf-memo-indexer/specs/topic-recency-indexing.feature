# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-17T16:45:30.497089416Z","feature_name":"Topic Recency Indexing","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/topic-recency-indexing.feature","background_hash":"0639f3e7176ddd178bf266b5f62c66fcfff9acda7487916f3496de2a3dd86e3f","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Recency Indexing - 1, Topic Recency Indexing - 2, Topic Recency Indexing - 3, Topic Recency Indexing - 4, Topic Recency Indexing - 5
#
# The indexer maintains two topic indexes so the read side can list topics by
# most recent post without scanning every topic post record:
#   - topicSummaries: one record per room with postCount and lastHeight.
#   - topicRecency: one record per room at that room's most recent post height;
#     a room with no posts (follow-only) is recorded at height 0.
# Reprocessing a topic message must not double-count posts, and a follow for a
# room that already has posts must not change the room's summary.
Feature: Topic Recency Indexing

  Background:
    Given a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Topic Recency Indexing - 1 a topic message records a room summary and a recency record
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>"
    Then the topicSummaries store contains the room "<room>" with postCount 1 and lastHeight <height>
    And the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | txid     | room    | addr                | height | text      |
      | topic-a1 | bitcoin | bitcoincash:qaddr-a | 600100 | hello     |
      | topic-b1 | cash    | bitcoincash:qaddr-b | 600200 | cash chat |

  Scenario Outline: Topic Recency Indexing - 2 successive topic messages accumulate postCount and keep the newest height
    When the indexer processes a Memo topic message <firstTxid> in room "<room>" from <addr> at block height <firstHeight> with text "<firstText>"
    And the indexer processes a Memo topic message <secondTxid> in room "<room>" from <addr> at block height <secondHeight> with text "<secondText>"
    Then the topicSummaries store contains the room "<room>" with postCount 2 and lastHeight <height>
    And the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | firstTxid | secondTxid | room    | addr                | firstHeight | secondHeight | firstText | secondText | height |
      | topic-a1  | topic-a2   | bitcoin | bitcoincash:qaddr-a | 600100      | 600200       | hello     | again      | 600200 |
      | topic-a3  | topic-a4   | bitcoin | bitcoincash:qaddr-a | 600200      | 600100       | later     | earlier    | 600200 |

  Scenario Outline: Topic Recency Indexing - 3 reprocessing a topic message is idempotent
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>"
    And the indexer processes the same Memo topic message <txid> again
    Then the topicSummaries store contains the room "<room>" with postCount 1 and lastHeight <height>
    And the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | txid     | room    | addr                | height | text     |
      | topic-c1 | bitcoin | bitcoincash:qaddr-c | 600300 | repeated |

  Scenario Outline: Topic Recency Indexing - 4 a topic follow with no posts records a zero-post room
    When the indexer processes a Memo topic follow for room "<room>" from <addr>
    Then the topicSummaries store contains the room "<room>" with postCount 0 and lastHeight 0
    And the topicRecency store records the room "<room>" at block height 0

    Examples:
      | room | addr                |
      | lone | bitcoincash:qaddr-a |
      | dev  | bitcoincash:qaddr-b |

  Scenario Outline: Topic Recency Indexing - 5 a topic follow for a room with posts leaves its summary unchanged
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>"
    And the indexer processes a Memo topic follow for room "<room>" from <addr>
    Then the topicSummaries store contains the room "<room>" with postCount 1 and lastHeight <height>
    And the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | txid     | room    | addr                | height | text     |
      | topic-d1 | bitcoin | bitcoincash:qaddr-a | 600400 | followed |
