# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T13:25:07.835747327Z","feature_name":"Topic Metadata Indexing","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/topic-metadata-indexing.feature","background_hash":"0639f3e7176ddd178bf266b5f62c66fcfff9acda7487916f3496de2a3dd86e3f","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Metadata Indexing - 1, Topic Metadata Indexing - 2, Topic Metadata Indexing - 3, Topic Metadata Indexing - 4, Topic Metadata Indexing - 5, Topic Metadata Indexing - 6
#
# The indexer maintains lastSeen and followerCount on each room's
# topicSummaries record so the read side can report when a topic was last
# active and how many addresses follow it.
#   - lastSeen is the `seen` timestamp (epoch milliseconds) of the room's most
#     recent post; a follow-only room keeps lastSeen 0.
#   - followerCount is the number of active follows for the room; an unfollow
#     removes its address from the count.
# Reprocessing an action is idempotent, and a follow must not disturb the
# room's post count, lastHeight, or lastSeen.
Feature: Topic Metadata Indexing

  Background:
    Given a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Topic Metadata Indexing - 1 a topic message records the room's last-seen time
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>" seen at <seen>
    Then the topicSummaries store records the room "<room>" last seen at <lastSeen>

    Examples:
      | txid     | room    | addr                | height | text | seen          | lastSeen      |
      | topic-a1 | bitcoin | bitcoincash:qaddr-a | 600100 | hello | 1700000000000 | 1700000000000 |
      | topic-b1 | cash    | bitcoincash:qaddr-b | 600200 | chat  | 1700009999000 | 1700009999000 |

  Scenario Outline: Topic Metadata Indexing - 2 a newer topic message advances the room's last-seen time
    When the indexer processes a Memo topic message <firstTxid> in room "bitcoin" from bitcoincash:qaddr-a at block height <firstHeight> with text "<firstText>" seen at <firstSeen>
    And the indexer processes a Memo topic message <secondTxid> in room "bitcoin" from bitcoincash:qaddr-a at block height <secondHeight> with text "<secondText>" seen at <secondSeen>
    Then the topicSummaries store records the room "bitcoin" last seen at 1700009999000

    Examples:
      | firstTxid | secondTxid | firstHeight | secondHeight | firstText | secondText | firstSeen     | secondSeen    |
      | topic-a1  | topic-a2   | 600100      | 600200       | hello     | again      | 1700000000000 | 1700009999000 |
      | topic-a3  | topic-a4   | 600200      | 600100       | later     | earlier    | 1700009999000 | 1700000000000 |

  Scenario Outline: Topic Metadata Indexing - 3 topic follows increase the room's follower count
    When the indexer processes a Memo topic follow for room "<room>" from <addr1>
    And the indexer processes a Memo topic follow for room "<room>" from <addr2>
    Then the topicSummaries store records the room "<room>" with 2 followers

    Examples:
      | room    | addr1               | addr2               |
      | bitcoin | bitcoincash:qaddr-a | bitcoincash:qaddr-b |
      | cash    | bitcoincash:qaddr-c | bitcoincash:qaddr-d |

  Scenario Outline: Topic Metadata Indexing - 4 a topic unfollow decreases the room's follower count
    When the indexer processes a Memo topic follow for room "<room>" from <addr1>
    And the indexer processes a Memo topic follow for room "<room>" from <addr2>
    And the indexer processes a Memo topic unfollow for room "<room>" from <addr1>
    Then the topicSummaries store records the room "<room>" with 1 follower

    Examples:
      | room    | addr1               | addr2               |
      | bitcoin | bitcoincash:qaddr-a | bitcoincash:qaddr-b |
      | cash    | bitcoincash:qaddr-c | bitcoincash:qaddr-d |

  Scenario Outline: Topic Metadata Indexing - 5 reprocessing a topic follow does not change the follower count
    When the indexer processes a Memo topic follow for room "<room>" from <addr>
    And the indexer processes the same Memo topic follow for room "<room>" from <addr> again
    Then the topicSummaries store records the room "<room>" with 1 follower

    Examples:
      | room    | addr                |
      | bitcoin | bitcoincash:qaddr-a |
      | cash    | bitcoincash:qaddr-b |

  Scenario Outline: Topic Metadata Indexing - 6 a follow preserves the room's post metadata
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>" seen at <seen>
    And the indexer processes a Memo topic follow for room "<room>" from <addr>
    Then the topicSummaries store contains the room "<room>" with postCount 1 and lastHeight <lastHeight>
    And the topicSummaries store records the room "<room>" last seen at <lastSeen>
    And the topicSummaries store records the room "<room>" with 1 follower

    Examples:
      | txid     | room    | addr                | height | text     | seen          | lastHeight | lastSeen      |
      | topic-d1 | bitcoin | bitcoincash:qaddr-a | 600400 | followed | 1700012345000 | 600400     | 1700012345000 |
      | topic-e1 | cash    | bitcoincash:qaddr-b | 600500 | tagged   | 1700012999000 | 600500     | 1700012999000 |
