# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-20T17:33:46.020711102Z","feature_name":"Feed Tabs","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/feed-tabs.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Feed Tabs - 1, Feed Tabs - 2, Feed Tabs - 3, Feed Tabs - 4, Feed Tabs - 5, Feed Tabs - 6, Feed Tabs - 7, Feed Tabs - 8
#
# The posts feed at /posts/recent is the single posts page. It shows a row of
# two mode buttons: "Recent", which shows the global recent feed, and
# "Following", which shows top-level posts from profiles the viewer follows.
# On first load the page selects Following when the viewer's address follows at
# least one account, and Recent when it follows no one. The viewer can switch
# between the two at any time, and switching resets the feed to its first page.
# The old /posts/following route and its navigation-menu item are removed, so
# the Following feed is reached only through the Following button. This is a
# client-only read feature: the page reads psf-memo-db (including
# GET /follow/following/:addr to decide the default) and broadcasts no Memo
# action.
Feature: Feed Tabs

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario: Feed Tabs - 1 the posts feed shows the Recent and Following tabs
    When I open the posts feed
    Then the posts feed shows the tabs "Recent" and "Following"

  Scenario Outline: Feed Tabs - 2 the Following feed is selected when the viewer follows an account
    Given my wallet follows the address <followee>
    And the psf-memo-db API serves a post with txid <followed_txid> authored by the address <followee> with text "<followed_text>"
    And the psf-memo-db API serves a post with txid <other_txid> authored by the address <other> with text "<other_text>"
    When I open the posts feed
    Then the Following tab is active
    And the posts feed shows the post with text "<followed_text>"
    And the posts feed does not show the post with text "<other_text>"

    Examples:
      | followee | followed_txid | followed_text | other | other_txid | other_text |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 1111111111111111111111111111111111111111111111111111111111111111 | a followed post | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 2222222222222222222222222222222222222222222222222222222222222222 | an unfollowed post |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 3333333333333333333333333333333333333333333333333333333333333333 | another followed post | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4444444444444444444444444444444444444444444444444444444444444444 | another unfollowed post |

  Scenario Outline: Feed Tabs - 3 the Recent feed is selected when the viewer follows no one
    Given the psf-memo-db API serves a post with txid <txid> authored by the address <other> with text "<text>"
    When I open the posts feed
    Then the Recent tab is active
    And the posts feed shows the post with text "<text>"

    Examples:
      | other | txid | text |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 5555555555555555555555555555555555555555555555555555555555555555 | a recent post |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 6666666666666666666666666666666666666666666666666666666666666666 | another recent post |

  Scenario Outline: Feed Tabs - 4 clicking the Recent tab shows the recent feed
    Given my wallet follows the address <followee>
    And the psf-memo-db API serves a post with txid <followed_txid> authored by the address <followee> with text "<followed_text>"
    And the psf-memo-db API serves a post with txid <other_txid> authored by the address <other> with text "<other_text>"
    When I open the posts feed
    Then the Following tab is active
    When I click the Recent tab
    Then the Recent tab is active
    And the posts feed shows the post with text "<other_text>"

    Examples:
      | followee | followed_txid | followed_text | other | other_txid | other_text |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 7777777777777777777777777777777777777777777777777777777777777777 | a followed post | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 8888888888888888888888888888888888888888888888888888888888888888 | an unfollowed post |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 9999999999999999999999999999999999999999999999999999999999999999 | another followed post | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | another unfollowed post |

  Scenario Outline: Feed Tabs - 5 clicking the Following tab shows the following feed
    Given my wallet follows the address <followee>
    And the psf-memo-db API serves a post with txid <followed_txid> authored by the address <followee> with text "<followed_text>"
    And the psf-memo-db API serves a post with txid <other_txid> authored by the address <other> with text "<other_text>"
    When I open the posts feed
    When I click the Recent tab
    Then the Recent tab is active
    When I click the Following tab
    Then the Following tab is active
    And the posts feed shows the post with text "<followed_text>"
    And the posts feed does not show the post with text "<other_text>"

    Examples:
      | followee | followed_txid | followed_text | other | other_txid | other_text |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | a followed post | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc | an unfollowed post |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd | another followed post | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee | another unfollowed post |

  Scenario: Feed Tabs - 6 the Following feed stays selected when followees have no posts
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I open the posts feed
    Then the Following tab is active
    And the posts feed shows no posts
    And the posts feed does not show a message that I am not following anyone

  Scenario: Feed Tabs - 7 clicking the Following tab when following no one shows the not-following-anyone message
    When I open the posts feed
    Then the Recent tab is active
    When I click the Following tab
    Then the Following tab is active
    And the posts feed shows a message that I am not following anyone

  Scenario: Feed Tabs - 8 switching tabs resets the feed to its first page
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    And the psf-memo-db API serves a post with txid 0000000000000000000000000000000000000000000000000000000000000001 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "oldest followed post" at block height 100
    And the psf-memo-db API serves a post with txid 0000000000000000000000000000000000000000000000000000000000000002 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "middle followed post" at block height 200
    And the psf-memo-db API serves a post with txid 0000000000000000000000000000000000000000000000000000000000000003 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "newest followed post" at block height 300
    When I open the posts feed with page size 2
    Then the Following tab is active
    And the posts feed shows 2 posts
    When I click the Next page button
    Then the posts feed shows the post with text "oldest followed post"
    When I click the Recent tab
    And I click the Following tab
    Then the posts feed shows the post with text "newest followed post"
    And the posts feed does not show the post with text "oldest followed post"
