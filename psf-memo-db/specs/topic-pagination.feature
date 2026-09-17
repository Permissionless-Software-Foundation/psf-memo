# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-17T17:22:41.386110241Z","feature_name":"Topic Pagination","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/topic-pagination.feature","background_hash":"4a01ae658dda9a91b7f19edbeb3e657bef1d666b5355b8dd30496013bed35d7e","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Pagination - 1, Topic Pagination - 2, Topic Pagination - 3
#
# GET /topics returns a page of topics ordered by their most recent post's
# block height descending, with rooms at the same height ordered by room name
# ascending; rooms with no posts (follow-only) come last, also by room name
# ascending. Pagination metadata reports the total distinct topics and whether
# more remain. The page is served from topicSummaries and topicRecency without
# iterating the rooms store.
#
# Fixture "topic-indexes":
#   topicSummaries store:
#     memo  { room: memo,  postCount: 5, lastHeight: 600500 }
#     cash  { room: cash,  postCount: 2, lastHeight: 600400 }
#     dance { room: dance, postCount: 3, lastHeight: 600400 }
#     anime { room: anime, postCount: 1, lastHeight: 600300 }
#     lone  { room: lone,  postCount: 0, lastHeight: 0 }
#     quiet { room: quiet, postCount: 0, lastHeight: 0 }
#   topicRecency store:
#     memo at 600500, cash at 600400, dance at 600400,
#     anime at 600300, lone at 0, quiet at 0
Feature: Topic Pagination

  Background:
    Given a psf-memo-db instance with topicSummaries and topicRecency stores
    Given the fixture "topic-indexes" is loaded into the topic index stores

  Scenario Outline: Topic Pagination - 1 GET /topics returns topics ordered by most recent post
    When the client requests /topics with limit <limit> and offset <offset>
    Then the response lists topics in order <expected_topics>
    And the response pagination shows total <total> and hasMore <hasMore>

    Examples:
      | limit | offset | expected_topics                  | total | hasMore |
      | 2     | 0      | memo,cash                        | 6     | true    |
      | 2     | 2      | dance,anime                      | 6     | true    |
      | 2     | 4      | lone,quiet                       | 6     | false   |
      | 6     | 0      | memo,cash,dance,anime,lone,quiet | 6     | false   |

  Scenario Outline: Topic Pagination - 2 GET /topics reports each topic's post count
    When the client requests /topics with limit <limit> and offset <offset>
    Then the response contains the topic "<topic>" with post count <postCount>

    Examples:
      | limit | offset | topic | postCount |
      | 3     | 0      | memo  | 5         |
      | 3     | 0      | cash  | 2         |
      | 3     | 3      | anime | 1         |
      | 3     | 3      | lone  | 0         |

  Scenario Outline: Topic Pagination - 3 GET /topics reads the recency index without scanning rooms
    When the client requests /topics with limit <limit> and offset <offset>
    Then the topicRecency store was read exactly <read_count> records
    And the rooms store was not iterated

    Examples:
      | limit | offset | read_count |
      | 2     | 0      | 2          |
      | 2     | 2      | 4          |
      | 2     | 4      | 6          |
      | 6     | 0      | 6          |
