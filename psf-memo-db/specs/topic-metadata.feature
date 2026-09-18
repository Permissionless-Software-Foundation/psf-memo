# Scenarios: Topic Metadata - 1, Topic Metadata - 2, Topic Metadata - 3, Topic Metadata - 4, Topic Metadata - 5
#
# GET /topics reports each topic's lastSeen (the epoch-millisecond time of the
# room's most recent post, 0 for a follow-only room) and followerCount (the
# number of active follows) alongside the existing postCount. The topic
# backfill utility rebuilds lastSeen and followerCount from the rooms store, and
# running it twice is idempotent.
#
# Fixture "topic-metadata-indexes" (topic index stores):
#   topicSummaries:
#     memo { room: memo, postCount: 5, lastHeight: 600500, lastSeen: 1700020000000, followerCount: 12 }
#     cash { room: cash, postCount: 2, lastHeight: 600400, lastSeen: 1700010000000, followerCount: 4 }
#     lone { room: lone, postCount: 0, lastHeight: 0,      lastSeen: 0,             followerCount: 7 }
#   topicRecency:
#     memo at 600500, cash at 600400, lone at 0
#
# Fixture "rooms-with-topic-metadata" (rooms store):
#   bitcoin:post-100 { room: bitcoin, txid: post-100, type: post, blockHeight: 600100, seen: 1700000000000 }
#   bitcoin:post-200 { room: bitcoin, txid: post-200, type: post, blockHeight: 600200, seen: 1700009999000 }
#   bitcoin:addr-f   { room: bitcoin, addr: bitcoincash:qaddr-f, type: follow, unfollow: false }
#   bitcoin:addr-g   { room: bitcoin, addr: bitcoincash:qaddr-g, type: follow, unfollow: false }
#   cash:post-250    { room: cash, txid: post-250, type: post, blockHeight: 600250, seen: 1700012345000 }
#   cash:addr-f      { room: cash, addr: bitcoincash:qaddr-f, type: follow, unfollow: true }
#   lone:addr-f      { room: lone, addr: bitcoincash:qaddr-f, type: follow, unfollow: false }
Feature: Topic Metadata

  Background:
    Given a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores

  Scenario Outline: Topic Metadata - 1 GET /topics returns each topic's last-seen time
    Given the fixture "topic-metadata-indexes" is loaded into the topic index stores
    When the client requests /topics
    Then the response contains the topic "<topic>" last seen at <lastSeen>

    Examples:
      | topic | lastSeen      |
      | memo  | 1700020000000 |
      | cash  | 1700010000000 |
      | lone  | 0             |

  Scenario Outline: Topic Metadata - 2 GET /topics returns each topic's follower count
    Given the fixture "topic-metadata-indexes" is loaded into the topic index stores
    When the client requests /topics
    Then the response contains the topic "<topic>" with <followerCount> followers

    Examples:
      | topic | followerCount |
      | memo  | 12            |
      | cash  | 4             |
      | lone  | 7             |

  Scenario Outline: Topic Metadata - 3 backfill records each room's last-seen time
    Given the fixture "rooms-with-topic-metadata" is loaded into the rooms store
    When the topic backfill utility is run
    Then the topicSummaries store records the room "<room>" last seen at <lastSeen>

    Examples:
      | room    | lastSeen      |
      | bitcoin | 1700009999000 |
      | cash    | 1700012345000 |
      | lone    | 0             |

  Scenario Outline: Topic Metadata - 4 backfill records each room's follower count
    Given the fixture "rooms-with-topic-metadata" is loaded into the rooms store
    When the topic backfill utility is run
    Then the topicSummaries store records the room "<room>" with <followerCount> followers

    Examples:
      | room    | followerCount |
      | bitcoin | 2             |
      | cash    | 0             |
      | lone    | 1             |

  Scenario Outline: Topic Metadata - 5 backfill is idempotent for topic metadata
    Given the fixture "rooms-with-topic-metadata" is loaded into the rooms store
    When the topic backfill utility is run
    And the topic backfill utility is run again
    Then the topicSummaries store records the room "<room>" last seen at <lastSeen>
    And the topicSummaries store records the room "<room>" with <followerCount> followers

    Examples:
      | room    | lastSeen      | followerCount |
      | bitcoin | 1700009999000 | 2             |
      | lone    | 0             | 1             |
