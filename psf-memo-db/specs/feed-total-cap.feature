# Scenarios: Feed total cap - 1
#
# GET /posts/recent caps its total scan at TOTAL_SCAN_CAP (500) eligible
# top-level posts. A corpus larger than the cap reports a total of exactly 500
# and reads at most offset + limit + 500 postHeights entries.
Feature: Feed total cap

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, postChildren, likes, and postLikes stores
    Given the fixture "many-top-level-posts" is loaded into the posts and likes stores

  Scenario Outline: Feed total cap - 1 the recent-feed total is capped at 500
    When the client requests /posts/recent with limit <limit> and offset <offset>
    Then the response pagination shows total <total> and hasMore <hasMore>
    And the postHeights store was read at most <max_entries> entries

    Examples:
      | limit | offset | total | hasMore | max_entries |
      | 3     | 0      | 500   | true    | 503         |
      | 50    | 499    | 500   | false   | 510         |
