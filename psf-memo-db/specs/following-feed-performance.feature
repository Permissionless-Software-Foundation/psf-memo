# Scenarios: Following Feed Performance - 1, Following Feed Performance - 2
#
# GET /posts/following/:addr is slow because list-following-feed.js does two
# full scans on every request:
#   - scanFollowingFeedTxidsAndCount iterates the ENTIRE global postHeights
#     index to count every top-level post by a followed address (the live
#     total reached 10942), because followed posts are sparse in the index.
#   - it first calls loadReplyTxids(), which iterates the ENTIRE postParents
#     store to build a global set of reply txids.
# This feature specifies the capped-scan optimization, mirroring the recent
# feed (feed-total-cap.feature):
#   - reply detection uses per-candidate point lookups (isReply) instead of
#     loading every reply txid, so the postParents store is not iterated.
#   - the postHeights scan stops once it has seen offset + limit + 500 eligible
#     followed posts, and reports total = min(eligible, 500). Corpora smaller
#     than the cap report an exact total; larger corpora stay bounded and
#     hasMore still works for the first pages.
# The cap counts eligible followed posts, not raw index entries: followed posts
# are sparse, so a raw-entry cap could return a short page even when more
# followed posts exist.
#
# Mute filtering is intentionally not applied here: following a profile negates
# a mute, so the current followed-post behavior is correct.
#
# Fixture "following-feed-capped": the viewer
# bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d follows
# bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy, who has 510
# top-level posts (post-000..post-509) at heights 600000..600509, all eligible.
#
# Fixture "following-feed-mixed": the same follow edge plus one other author and
# the viewer. Followed top-level posts are post-A1 (height 600100) and post-A2
# (height 600200); post-viewer (viewer, height 600150) and post-other (other
# author, height 600250) are top-level but not eligible; reply-A2 (followed
# author, height 600300) is a reply to post-A2 and is excluded.
Feature: Following Feed Performance

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, and postLikes stores

  Scenario Outline: Following Feed Performance - 1 the followed-post total is capped at 500
    Given the fixture "following-feed-capped" is loaded
    When the client requests /posts/following/<viewer> with limit <limit> and offset <offset>
    Then the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>
    And the postHeights store was read at most <max_entries> entries

    Examples:
      | limit | offset | expected_txids | total | hasMore | max_entries |
      | 3     | 0      | post-509,post-508,post-507 | 500 | true | 503 |
      | 50    | 499    | post-010,post-009,post-008,post-007,post-006,post-005,post-004,post-003,post-002,post-001,post-000 | 500 | false | 510 |

  Scenario Outline: Following Feed Performance - 2 only followed top-level posts are returned and postParents is not scanned
    Given the fixture "following-feed-mixed" is loaded
    When the client requests /posts/following/<viewer> with limit <limit> and offset <offset>
    Then the response contains the txids <expected_txids>
    And the response pagination shows total <total> and hasMore <hasMore>
    And the postParents store was not iterated

    Examples:
      | limit | offset | expected_txids  | total | hasMore |
      | 10    | 0      | post-A2,post-A1 | 2     | false   |
