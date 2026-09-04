# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-04T17:42:23.821120012Z","feature_name":"Page Size","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/page-size.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Page Size - 1, Page Size - 2, Page Size - 3, Page Size - 4, Page Size - 5, Page Size - 6, Page Size - 7
#
# Every paginated page in the client requests 50 items per page instead of 100.
# This reduces the payload each page loads and improves page load times. The
# pages covered are the recent feed, the following feed, the topic feed, the
# notifications page, the search page, the profile page, and the recent
# profiles page. Each page requests a page size of 50 and reports that more
# items are available when the API has more than 50.
Feature: Page Size

  Scenario Outline: Page Size - 1 the recent feed loads 50 posts per page
    Given the psf-memo-db API serves <count> recent posts
    When I open the recent posts feed
    Then the recent feed shows 50 posts
    And the recent feed can load more posts

    Examples:
      | count |
      | 60 |
      | 70 |

  Scenario Outline: Page Size - 2 the following feed loads 50 posts per page
    Given my wallet follows the address <addr>
    Given the psf-memo-db API serves <count> posts authored by the address <addr>
    When I open the Following feed
    Then the following feed shows 50 posts
    And the following feed can load more posts

    Examples:
      | addr | count |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 60 |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 70 |

  Scenario Outline: Page Size - 3 the topic feed loads 50 posts per page
    Given the psf-memo-db API serves <count> posts in the topic <topic>
    When I open the topic feed for <topic>
    Then the topic feed shows 50 posts
    And the topic feed can load more posts

    Examples:
      | topic | count |
      | bitcoin | 60 |
      | memo | 70 |

  Scenario Outline: Page Size - 4 the notifications page loads 50 notifications per page
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves <count> replies to the post with txid <my_post>
    When I open the Notifications page
    Then the notifications show 50 notifications
    And the notifications can load more

    Examples:
      | my_post | count |
      | 1111111111111111111111111111111111111111111111111111111111111111 | 60 |
      | 3333333333333333333333333333333333333333333333333333333333333333 | 70 |

  Scenario Outline: Page Size - 5 the search page loads 50 results per page
    Given the psf-memo-db API serves <count> search posts matching <query>
    When I submit a search for <query>
    Then the search results show 50 posts
    And the search results can load more posts

    Examples:
      | query | count |
      | memo | 60 |
      | bitcoin | 70 |

  Scenario Outline: Page Size - 6 the profile page loads 50 posts per page
    Given the psf-memo-db API serves <count> posts authored by the address <addr>
    When I open the profile page for the address <addr>
    Then the profile page shows 50 posts
    And the profile page can load more posts

    Examples:
      | addr | count |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 60 |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 70 |

  Scenario Outline: Page Size - 7 the recent profiles page loads 50 profiles per page
    Given the psf-memo-db API serves <count> profiles
    When I open the recent profiles page
    Then the recent profiles page shows 50 profiles
    And the recent profiles page can load more profiles

    Examples:
      | count |
      | 60 |
      | 70 |
