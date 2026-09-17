# mutation-stamp: sha256=62b1088abcd456b0067ce18fd78f32c715254e912046c44d8d67fdd54417147f
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-17T17:23:44.068113041Z","feature_name":"Backfill topic indexes","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/backfill-topic-indexes.feature","background_hash":"386b39215fd2ac58af1a095ce21b3e5a94c26a052be33ebb653986f56d1cdaf5","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Backfill topic indexes - 1 backfill summarizes every room","scenario_hash":"98e2a49f35bf2c57825af892d343b091df3b8ea9938d88877112a244195e2b6a","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-09-17T17:23:44.068113041Z"},{"index":1,"name":"Backfill topic indexes - 2 backfill builds the recency index","scenario_hash":"6210a596d0011bd42ab984430a01e639932e19bb99dd05e6b79c0e3d8e50ccdc","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-17T17:23:44.068113041Z"},{"index":2,"name":"Backfill topic indexes - 3 backfill is idempotent","scenario_hash":"93b5d81880c0f9bf768aa363353607761c7cebd4d6b1c6cef52eae0f40fd3cc0","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-17T17:23:44.068113041Z"}]}
# acceptance-mutation-manifest-end

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
