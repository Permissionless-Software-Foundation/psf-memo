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
