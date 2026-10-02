# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-02T18:24:15.320651265Z","feature_name":"Feed Pagination Scroll","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/feed-pagination-scroll.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Feed Pagination Scroll - 1 clicking Next scrolls the recent posts feed to the top","scenario_hash":"422ed0b7dfd80b0a4dead66b02d2e0b8b3386b33fd91cbb5f84fdd4f4d64c6ea","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-02T18:24:15.320651265Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Feed Pagination Scroll - 1, Feed Pagination Scroll - 2, Feed Pagination Scroll - 3, Feed Pagination Scroll - 4
#
# The posts feed at /posts/recent shows its Previous and Next buttons at the
# bottom of the feed and its Recent/Following tabs at the top. After the viewer
# clicks Next or Previous and another page loads, the browser keeps the scroll
# position at the bottom, so the viewer starts reading the new page at its end.
# Switching between the Recent and Following tabs also reloads the feed. The
# feed page now scrolls back to the top whenever a page loads or the active tab
# changes, so the first post of the new page is visible. This applies to both
# tabs because the pagination, tab selection, and their scroll reset are shared.
# This is a client-only read behavior: the page loads posts from psf-memo-db and
# broadcasts no Memo action.
Feature: Feed Pagination Scroll

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Feed Pagination Scroll - 1 clicking Next scrolls the recent posts feed to the top
    Given the psf-memo-db API serves <count> recent posts
    When I open the posts feed with page size 2
    And I click the Next page button
    Then the posts feed shows 2 posts
    And the posts feed is scrolled to the top

    Examples:
      | count |
      | 4     |
      | 5     |

  Scenario Outline: Feed Pagination Scroll - 2 clicking Next scrolls the following posts feed to the top
    Given my wallet follows the address <followee>
    And the psf-memo-db API serves <count> posts authored by the address <followee>
    When I open the posts feed with page size 2
    And I click the Next page button
    Then the posts feed shows the post with text "<expected_post>"
    And the posts feed is scrolled to the top

    Examples:
      | followee | count | expected_post |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4 | Post 2 |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 5 | Post 3 |

  Scenario Outline: Feed Pagination Scroll - 3 clicking Previous scrolls the following posts feed to the top
    Given my wallet follows the address <followee>
    And the psf-memo-db API serves <count> posts authored by the address <followee>
    When I open the posts feed with page size 2
    And I click the Next page button
    And I click the Previous page button
    Then the posts feed shows the post with text "<expected_post>"
    And the posts feed is scrolled to the top

    Examples:
      | followee | count | expected_post |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4 | Post 4 |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 5 | Post 5 |

  Scenario: Feed Pagination Scroll - 4 switching tabs scrolls the posts feed to the top
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    And the psf-memo-db API serves a post with txid 7777777777777777777777777777777777777777777777777777777777777777 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "a followed post"
    And the psf-memo-db API serves a post with txid 8888888888888888888888888888888888888888888888888888888888888888 authored by the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r with text "an unfollowed post"
    When I open the posts feed
    And I click the Recent tab
    Then the Recent tab is active
    And the posts feed shows the post with text "an unfollowed post"
    And the posts feed is scrolled to the top
