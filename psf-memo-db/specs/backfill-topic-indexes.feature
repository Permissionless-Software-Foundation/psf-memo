# Scenarios: Backfill topic indexes - 1, Backfill topic indexes - 2, Backfill topic indexes - 3
#
# The topic backfill utility builds topicSummaries and topicRecency from the
# existing rooms store so the read side can serve /topics by recency without
# scanning posts. Rooms with posts get postCount and lastHeight; follow-only
# rooms get postCount 0 and lastHeight 0. Running the backfill twice is
# idempotent.
#
# Fixture "rooms-with-topics-and-follows":
#   rooms store:
#     bitcoin:post-100  { room: bitcoin, txid: post-100, type: post, blockHeight: 600100 }
#     bitcoin:post-200  { room: bitcoin, txid: post-200, type: post, blockHeight: 600200 }
#     bitcoin:addr-f    { room: bitcoin, addr: addr-f, type: follow, unfollow: false }
#     cash:post-250     { room: cash, txid: post-250, type: post, blockHeight: 600250 }
#     lone:addr-f       { room: lone, addr: addr-f, type: follow, unfollow: false }
Feature: Backfill topic indexes

  Background:
    Given a psf-memo-db instance with rooms, topicSummaries, and topicRecency stores
    Given the fixture "rooms-with-topics-and-follows" is loaded into the rooms store

  Scenario Outline: Backfill topic indexes - 1 backfill summarizes every room
    When the topic backfill utility is run
    Then the topicSummaries store contains the room "<room>" with postCount <postCount> and lastHeight <height>

    Examples:
      | room    | postCount | height |
      | bitcoin | 2         | 600200 |
      | cash    | 1         | 600250 |
      | lone    | 0         | 0      |

  Scenario Outline: Backfill topic indexes - 2 backfill builds the recency index
    When the topic backfill utility is run
    Then the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | room    | height |
      | bitcoin | 600200 |
      | cash    | 600250 |
      | lone    | 0      |

  Scenario Outline: Backfill topic indexes - 3 backfill is idempotent
    When the topic backfill utility is run
    And the topic backfill utility is run again
    Then the topicSummaries store contains the room "<room>" with postCount <postCount> and lastHeight <height>
    And the topicRecency store records the room "<room>" at block height <height>

    Examples:
      | room    | postCount | height |
      | bitcoin | 2         | 600200 |
      | cash    | 1         | 600250 |
