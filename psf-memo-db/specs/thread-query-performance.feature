# Scenarios: Thread query performance - 1
#
# GET /posts/:txid/thread currently does work proportional to the whole
# database, not to the requested thread:
#   - get-post-thread.js calls buildLikeCountMap(), which iterates every
#     postLikes entry and loads one post per like just to compute counts.
#   - get-post-thread.js loadChildTxids() iterates every postChildren entry
#     for each node in the thread instead of prefix-scanning that node's
#     parent key.
# This feature pins the endpoint to bounded, per-thread reads. Thread shape,
# reply ordering, and per-node likeCount remain specified by like-counts.feature.
Feature: Thread query performance

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, and postLikes stores
    Given the fixture "posts-with-likes" is loaded into the posts and likes stores

  Scenario Outline: Thread query performance - 1 GET /posts/:txid/thread performs work bounded by the thread
    When the client requests the thread for <txid>
    Then the post with txid <txid> has likeCount <likeCount>
    And the postChildren store was read at most <max_entries> entries
    And no more than <limit> posts are loaded by txid

    Examples:
      | txid       | likeCount | max_entries | limit |
      | post-200-a | 2         | 1           | 2     |
      | post-200-b | 1         | 0           | 1     |
