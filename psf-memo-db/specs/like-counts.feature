# Scenarios: Like counts on posts - 1, Like counts on posts - 2, Like counts on posts - 3, Like counts on posts - 4
Feature: Like counts on posts

  Background:
    Given a psf-memo-db instance with a posts store and a likes store
    Given the fixture "posts-with-likes" is loaded into the posts and likes stores

  Scenario Outline: Like counts on posts - 1 GET /posts/recent includes likeCount for each top-level post
    When the client requests the recent posts endpoint
    Then the post with txid <txid> has likeCount <likeCount>

    Examples:
      | txid       | likeCount |
      | post-200-a | 2         |
      | post-200-b | 1         |
      | post-100   | 0         |

  Scenario Outline: Like counts on posts - 2 GET /posts/by/:addr includes likeCount for that address's posts
    When the client requests posts by address <addr>
    Then the post with txid <txid> has likeCount <likeCount>

    Examples:
      | addr                | txid       | likeCount |
      | bitcoincash:qaddr-a | post-200-a | 2         |
      | bitcoincash:qaddr-a | post-100   | 0         |
      | bitcoincash:qaddr-b | post-200-b | 1         |

  Scenario Outline: Like counts on posts - 3 GET /posts/:txid/thread includes likeCount on the root and replies
    When the client requests the thread for <root_txid>
    Then the post with txid <txid> has likeCount <likeCount>

    Examples:
      | root_txid  | txid       | likeCount |
      | post-200-a | post-200-a | 2         |
      | post-200-a | reply-1    | 1         |

  Scenario Outline: Like counts on posts - 4 likes for posts that are not in the posts store are ignored
    When the client requests the recent posts endpoint
    Then the post with txid <txid> has likeCount <likeCount>

    Examples:
      | txid     | likeCount |
      | post-100 | 0         |
