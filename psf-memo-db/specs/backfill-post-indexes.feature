# mutation-stamp: sha256=3a958c63addf082c1c2e4317e00510ce7c57840672eb5597741e13d07ed9b9c6
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T05:20:47.553772812Z","feature_name":"Backfill post indexes","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/backfill-post-indexes.feature","background_hash":"c62edf86bef24705bc4571e01b7eb19cd3ec30cddfbe5c362e3fbd2e2422e048","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Backfill post indexes - 1 backfill builds addrPostHeights entries for existing top-level posts","scenario_hash":"22f641086ccb2b526db39c238a7fb8826a9453ca4dcc47636ecc7ea30ee16456","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-08-28T05:20:47.553772812Z"},{"index":1,"name":"Backfill post indexes - 2 backfill builds postLikes entries for existing likes","scenario_hash":"4906cd1fc0e905a8dcb6f5978abbba59fc9d52ec35da69a04d72902201a13aaa","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-08-28T05:20:47.553772812Z"},{"index":2,"name":"Backfill post indexes - 3 backfill is idempotent","scenario_hash":"72e1c999a7b41dbca264ca94eb85ec6bf379545a9bf04b7395b02442d61e85d8","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-08-28T05:20:47.553772812Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Backfill post indexes - 1, Backfill post indexes - 2, Backfill post indexes - 3
Feature: Backfill post indexes

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, likes, and postLikes stores
    Given the fixture "posts-and-likes-without-indexes" is loaded into the posts and likes stores

  Scenario Outline: Backfill post indexes - 1 backfill builds addrPostHeights entries for existing top-level posts
    When the backfill utility is run
    Then the addrPostHeights store contains <count> entry whose key starts with <addr> and ends with <postTxid>

    Examples:
      | addr                | postTxid   | count |
      | bitcoincash:qaddr-a | post-200-a | 1     |
      | bitcoincash:qaddr-a | post-100   | 1     |
      | bitcoincash:qaddr-b | post-200-b | 1     |

  Scenario Outline: Backfill post indexes - 2 backfill builds postLikes entries for existing likes
    When the backfill utility is run
    Then the postLikes store contains <count> entry whose key starts with <postTxid> and ends with <likeTxid>

    Examples:
      | postTxid   | likeTxid | count |
      | post-200-a | like-1   | 1     |
      | post-200-a | like-2   | 1     |
      | post-200-b | like-3   | 1     |

  Scenario Outline: Backfill post indexes - 3 backfill is idempotent
    When the backfill utility is run
    And the backfill utility is run again
    Then the addrPostHeights store contains <count> entry whose key starts with <addr> and ends with <postTxid>
    And the postLikes store contains <count> entry whose key starts with <postTxid> and ends with <likeTxid>

    Examples:
      | addr                | postTxid   | likeTxid | count |
      | bitcoincash:qaddr-a | post-200-a | like-1   | 1     |
