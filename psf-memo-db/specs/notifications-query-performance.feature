# Scenarios: Notifications Query Performance - 1, Notifications Query Performance - 2, Notifications Query Performance - 3, Notifications Query Performance - 4
#
# GET /posts/notifications/:addr originally scanned the ENTIRE likes,
# postChildren, and follows stores and loaded a post for every candidate, so a
# request cost O(all likes + all replies + all follows) and the /notifications
# page blocked on it. This feature bounds the work to the viewer's activity
# inside a configurable block window (NOTIFICATION_BLOCK_WINDOW, default
# 25000; cutoff = status.chainBlockHeight - window):
#
#   - The viewer's own posts are read from addrPostHeights, range-limited to
#     the window.
#   - Likes and replies are read by prefix-scanning postLikes and postChildren
#     for those posts only; the global likes and postChildren stores are never
#     iterated.
#   - Follows are read from the followeeHeights index, range-limited to the
#     window; the global follows store is never iterated.
#   - pagination.total counts only the in-window notifications.
#
# A notification is drawn from the viewer's content inside the window, so an
# interaction with a post older than the window is not returned even when the
# interaction itself is recent.
#
# Fixture "notifications-window" (chainBlockHeight 700000):
#   viewer    = bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue
#   followerA = bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf
#   followerB = bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p
#   oldActor  = bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt
#   liker     = bitcoincash:qp24242424242424242424242424242425wtjflljr
#   replier   = bitcoincash:qpnxvenxvenxvenxvenxvenxvenxvenxvc5j32tdvn
#   posts:      post-recent (viewer, 690000), post-old (viewer, 600000),
#               post-other (followerA, 690000)
#   postLikes:  post-recent:like-recent (liker, 690100)
#               post-old:like-old (oldActor, 690200)
#               post-other:like-other (followerA, 690300)
#   postChildren: post-recent:reply-recent (replier, 690150)
#                 post-old:reply-old (oldActor, 690250)
#                 post-other:reply-other (followerA, 690300)
#   followeeHeights: viewer:690400:followerA unfollow false
#                    viewer:690550:followerB unfollow false
#                    viewer:690600:followerB unfollow true
#                    viewer:600000:oldActor unfollow false
#   filler: 100 unrelated likes, 100 unrelated postChildren entries, and 100
#           unrelated followeeHeights entries so a full-store scan is observable.
Feature: Notifications Query Performance

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, postLikes, follows, followeeHeights, and status stores
    Given the fixture "notifications-window" is loaded

  Scenario Outline: Notifications Query Performance - 1 in-window notifications paginate by the configured window
    Given a notification window of <window> blocks
    When the client requests /posts/notifications/<viewer> with limit <limit> and offset <offset>
    Then the response contains <count> notifications
    And the response pagination shows total <total> and hasMore <hasMore>

    Examples:
      | window | limit | offset | count | total | hasMore |
      | 25000  | 2     | 0      | 2     | 3     | true    |
      | 25000  | 2     | 2      | 1     | 3     | false   |
      | 100000 | 10    | 0      | 6     | 6     | false   |

  Scenario Outline: Notifications Query Performance - 2 in-window notifications are ordered newest first
    Given a notification window of 25000 blocks
    When the client requests /posts/notifications/<viewer> with limit <limit> and offset <offset>
    Then the response notification at index <index> has type <type> from <actor>

    Examples:
      | limit | offset | index | type   | actor                                                |
      | 5     | 0      | 0     | follow | bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf |
      | 5     | 0      | 1     | reply  | bitcoincash:qpnxvenxvenxvenxvenxvenxvenxvenxvc5j32tdvn |
      | 5     | 0      | 2     | like   | bitcoincash:qp24242424242424242424242424242425wtjflljr |

  Scenario Outline: Notifications Query Performance - 3 out-of-window and unrelated interactions are excluded
    Given a notification window of 25000 blocks
    When the client requests /posts/notifications/<viewer> with limit <limit> and offset <offset>
    Then the response contains no notification from <excluded_actor>

    Examples:
      | limit | offset | excluded_actor                                        |
      | 10    | 0      | bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt |
      | 10    | 0      | bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p |

  Scenario Outline: Notifications Query Performance - 4 likes and replies are read per viewer post and follows per index
    Given a notification window of 25000 blocks
    When the client requests /posts/notifications/<viewer> with limit <limit> and offset <offset>
    Then the postLikes store was read at most <max_post_likes> entries
    And the postChildren store was read at most <max_children> entries
    And the followeeHeights store was read at most <max_followee> entries
    And the likes store was not iterated
    And the follows store was not iterated

    Examples:
      | limit | offset | max_post_likes | max_children | max_followee |
      | 2     | 0      | 1              | 1            | 3            |
      | 10    | 0      | 1              | 1            | 3            |
