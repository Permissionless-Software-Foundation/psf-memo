# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T05:13:52.736034084Z","feature_name":"Efficient post query","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/efficient-post-query.feature","background_hash":"3d649fb198f0f3ee58e20f11cd09a2e17b0431cd170a61b3fc26b4d7dfd6af7b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Efficient post query - 1, Efficient post query - 2, Efficient post query - 3, Efficient post query - 4
Feature: Efficient post query

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, and postLikes stores
    Given the fixture "posts-with-likes-and-indexes" is loaded into the posts and likes stores

  Scenario Outline: Efficient post query - 1 GET /posts/by/:addr returns a page using the addrPostHeights index
    When the client requests /posts/by/<addr> with limit <limit> and offset <offset>
    Then the response posts are sorted by block height descending
    And the response contains only posts by <addr>
    And the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>
    And no more than <limit> addrPostHeights entries are read after applying the offset
    And no more than <limit> posts are loaded by txid

    Examples:
      | addr                | limit | offset | expected_txids      | total | hasMore |
      | bitcoincash:qaddr-a | 1     | 0      | post-200-a          | 2     | true    |
      | bitcoincash:qaddr-a | 2     | 0      | post-200-a,post-100 | 2     | false   |
      | bitcoincash:qaddr-b | 1     | 0      | post-200-b          | 1     | false   |

  Scenario Outline: Efficient post query - 2 GET /posts/recent returns a page using the postHeights index
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response posts are sorted by block height descending
    And the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>
    And no more than <limit> postHeights entries are read after applying the offset
    And no more than <limit> posts are loaded by txid

    Examples:
      | limit | offset | expected_txids                 | total | hasMore |
      | 2     | 0      | post-200-b,post-200-a          | 3     | true    |
      | 3     | 0      | post-200-b,post-200-a,post-100 | 3     | false   |

  Scenario Outline: Efficient post query - 3 reply counts are computed per returned post
    When the client requests /posts/by/<addr> with limit <limit> and offset <offset>
    Then the response post with txid <txid> has replyCount <replyCount>
    And the postChildren store was iterated at most <max_iterations> times

    Examples:
      | addr                | limit | offset | txid       | replyCount | max_iterations |
      | bitcoincash:qaddr-a | 2     | 0      | post-200-a | 1          | 2              |
      | bitcoincash:qaddr-a | 2     | 0      | post-100   | 0          | 2              |

  Scenario Outline: Efficient post query - 4 like counts are computed per returned post
    When the client requests /posts/by/<addr> with limit <limit> and offset <offset>
    Then the post with txid <txid> has likeCount <likeCount>
    And the postLikes store was iterated at most <max_iterations> times

    Examples:
      | addr                | limit | offset | txid       | likeCount | max_iterations |
      | bitcoincash:qaddr-a | 2     | 0      | post-200-a | 2         | 2              |
      | bitcoincash:qaddr-a | 2     | 0      | post-100   | 0         | 2              |
