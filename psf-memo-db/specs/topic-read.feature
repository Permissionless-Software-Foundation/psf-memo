# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T15:47:38.414053749Z","feature_name":"Topic Read","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/topic-read.feature","background_hash":"922fd45b8606f723073833f0aaca0e6d92b03a263a6b54c60490843e0ac41cc0","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Topic Read - 1 GET /topics lists distinct topics with their post counts","scenario_hash":"a425a0cbf18c7e7fcb7d01c3571556d4c184b013ad7990e724d95d8d100eebb9","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-08-28T15:39:33.364455310Z"},{"index":1,"name":"Topic Read - 2 GET /topics/:room/posts returns the posts for a topic sorted by block height descending","scenario_hash":"cffb702052b0df29aa87510e0c45dd01b83c4607e7ce915bc0e660d601f79cce","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-08-28T15:39:33.364455310Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Read - 1, Topic Read - 2, Topic Read - 3, Topic Read - 4
#
# The indexer stores topic activity in the rooms store. Topic messages are
# keyed `${room}:${txid}` with type 'post'; topic follows are keyed
# `${room}:${addr}` with type 'follow'. The read side lists distinct topics
# with their post counts and returns a topic's posts ordered by block height.
#
# Fixture "topics-with-posts":
#   rooms store:
#     bitcoin:post-300  { room: bitcoin, txid: post-300, type: post, blockHeight: 300 }
#     bitcoin:post-200  { room: bitcoin, txid: post-200, type: post, blockHeight: 200 }
#     bitcoin:addr-f    { room: bitcoin, addr: addr-f, type: follow, unfollow: false }
#     cash:post-250     { room: cash, txid: post-250, type: post, blockHeight: 250 }
#     dev:post-100      { room: dev, txid: post-100, type: post, blockHeight: 100 }
#     lone:addr-f       { room: lone, addr: addr-f, type: follow, unfollow: false }
#   posts store:
#     post-300 { txid: post-300, addr: addr-a, text: hello bitcoin, blockHeight: 300 }
#     post-200 { txid: post-200, addr: addr-b, text: bitcoin again, blockHeight: 200 }
#     post-250 { txid: post-250, addr: addr-a, text: cash rules, blockHeight: 250 }
#     post-100 { txid: post-100, addr: addr-c, text: dev stuff, blockHeight: 100 }
Feature: Topic Read

  Background:
    Given a psf-memo-db instance with a rooms store and a posts store
    Given the fixture "topics-with-posts" is loaded into the rooms and posts stores

  Scenario Outline: Topic Read - 1 GET /topics lists distinct topics with their post counts
    When the client requests /topics
    Then the response contains the topic <topic> with post count <count>

    Examples:
      | topic | count |
      | bitcoin | 2 |
      | cash | 1 |
      | dev | 1 |
      | lone | 0 |

  Scenario Outline: Topic Read - 2 GET /topics/:room/posts returns the posts for a topic sorted by block height descending
    When the client requests /topics/<room>/posts
    Then the response posts are sorted by block height descending
    And the response contains the txids <expected_txids>

    Examples:
      | room | expected_txids |
      | bitcoin | post-300,post-200 |
      | cash | post-250 |

  Scenario Outline: Topic Read - 3 GET /topics/:room/posts paginates
    When the client requests /topics/<room>/posts with limit <limit> and offset <offset>
    Then the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>

    Examples:
      | room | limit | offset | expected_txids | total | hasMore |
      | bitcoin | 1 | 0 | post-300 | 2 | true |
      | bitcoin | 2 | 0 | post-300,post-200 | 2 | false |
      | bitcoin | 1 | 1 | post-200 | 2 | true |

  Scenario: Topic Read - 4 GET /topics/:room/posts returns no posts for a topic with no posts
    When the client requests /topics/lone/posts
    Then the response contains no posts
