# mutation-stamp: sha256=9685d4d281c33b449530a853441ee46b2b27b8907e09bb460780c6f463f45075
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-27T03:40:40.281402104Z","feature_name":"Like counts on posts","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/like-counts.feature","background_hash":"30a5bc9082cb9530e629dfeef1897d58e0fbd06c2e6e6e9824cfd8d29a821bfc","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Like counts on posts - 1 GET /posts/recent includes likeCount for each top-level post","scenario_hash":"93f4b6a672ca408ba714219ee2ed3090ad7dcdcded70d3910929936d62b161ad","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-08-27T03:40:40.281402104Z"},{"index":1,"name":"Like counts on posts - 2 GET /posts/by/:addr includes likeCount for that address's posts","scenario_hash":"c4aeb8aec676bc5e6d622646788838e4131d4c7f5852e585885757c1de9b5d5b","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-08-27T03:40:40.281402104Z"},{"index":2,"name":"Like counts on posts - 3 GET /posts/:txid/thread includes likeCount on the root and replies","scenario_hash":"87302ac20d7b363f59683f1f334f6a1000242d76bb0ba844578f4b2c8a0f2b9c","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-08-27T03:40:40.281402104Z"},{"index":3,"name":"Like counts on posts - 4 likes for posts that are not in the posts store are ignored","scenario_hash":"00f89904d11df1636df9913b9212c9cada3d20955d6c60ddf8af793988b16e92","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-08-27T03:40:40.281402104Z"}]}
# acceptance-mutation-manifest-end

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
