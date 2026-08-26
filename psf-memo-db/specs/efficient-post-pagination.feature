# Scenarios: Efficient post pagination - 1, Efficient post pagination - 2, Efficient post pagination - 3
Feature: Efficient post pagination

  Background:
    Given a psf-memo-db instance with a posts store and a postHeights secondary index
    Given the fixture "three-top-level-posts-and-one-reply" is loaded into the posts store

  Scenario Outline: Efficient post pagination - 1 GET /posts/recent returns a page of top-level posts sorted by block height descending
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response posts are sorted by block height descending
    And the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>
    And no more than <limit> postHeights entries are read after applying the offset
    And no more than <limit> posts are loaded by txid

    Examples:
      | limit | offset | expected_txids                  | total | hasMore |
      | 2     | 0      | post-200-b,post-200-a           | 3     | true    |
      | 2     | 1      | post-200-a,post-100             | 3     | false   |
      | 3     | 0      | post-200-b,post-200-a,post-100  | 3     | false   |

  Scenario Outline: Efficient post pagination - 2 GET /posts/by/:addr returns a page of top-level posts for that address sorted by block height descending
    When the client requests /posts/by/<addr> with limit <limit> and offset <offset>
    Then the response posts are sorted by block height descending
    And the response contains only posts by <addr>
    And the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>

    Examples:
      | addr                  | limit | offset | expected_txids        | total | hasMore |
      | bitcoincash:qaddr-a | 1     | 0      | post-200-a            | 2     | true    |
      | bitcoincash:qaddr-a | 2     | 0      | post-200-a,post-100   | 2     | false   |
      | bitcoincash:qaddr-b | 1     | 0      | post-200-b            | 1     | false   |

  Scenario Outline: Efficient post pagination - 3 reply counts are computed from a single postChildren scan
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response post with txid <txid> has replyCount <replyCount>
    And the postChildren store was iterated exactly once

    Examples:
      | limit | offset | txid       | replyCount |
      | 3     | 0      | post-200-a | 1          |
      | 3     | 0      | post-200-b | 0          |
      | 3     | 0      | post-100   | 0          |
