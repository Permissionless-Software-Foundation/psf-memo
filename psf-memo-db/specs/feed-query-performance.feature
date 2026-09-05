# Scenarios: Feed query performance - 1, Feed query performance - 2
#
# GET /posts/recent (and the other paginated feeds) is slow at 1.3M posts
# because list-recent-posts.js does two full scans on every request:
#   - countTopLevelPosts() iterates the ENTIRE postHeights index to compute
#     the total/hasMore pagination field.
#   - buildReplyCountMap() scans ALL postChildren entries to build a global
#     reply-count map.
# This feature specifies the capped-scan optimization:
#   - reply counts are computed per returned post (per-page), not globally.
#   - the total scan is capped to the last TOTAL_SCAN_CAP top-level posts so
#     hasMore still works for the first pages without walking the whole index.
Feature: Feed query performance

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, and postLikes stores
    Given the fixture "many-posts-with-replies" is loaded into the posts and likes stores

  Scenario Outline: Feed query performance - 1 reply counts are computed per returned post
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response post with txid <txid> has replyCount <replyCount>
    And the postChildren store was read at most <max_entries> entries

    Examples:
      | limit | offset | txid       | replyCount | max_entries |
      | 3     | 0      | post-020   | 2          | 3           |
      | 3     | 0      | post-019   | 1          | 3           |
      | 3     | 0      | post-018   | 0          | 3           |

  Scenario Outline: Feed query performance - 2 the total scan is capped
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response pagination shows total <total> and hasMore <hasMore>
    And the postHeights store was read at most <max_entries> entries

    Examples:
      | limit | offset | total | hasMore | max_entries |
      | 3     | 0      | 10    | true    | 13          |
      | 5     | 0      | 10    | true    | 15          |
