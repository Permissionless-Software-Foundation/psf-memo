# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-02T19:55:36.282796191Z","feature_name":"Following Feed","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/following-feed.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Following Feed - 1, Following Feed - 2, Following Feed - 3, Following Feed - 4, Following Feed - 5, Following Feed - 6, Following Feed - 7
#
# The Following feed shows top-level posts (replies excluded) authored only by
# profiles the viewer follows, newest first. The viewer's own posts are never
# shown, nor are posts from people the viewer does not follow. It is a read-only
# feature: the psf-memo-db API joins the follows index with the posts index and
# returns a paginated page. The client identifies the viewer from the wallet and
# renders the page like the recent feed; it broadcasts no Memo action.
Feature: Following Feed

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Following Feed - 1 the feed shows posts from followed profiles only
    Given my wallet follows the address <followee>
    Given the psf-memo-db API serves a post with txid <txid_a> authored by the address <followee> with text <text_a>
    Given the psf-memo-db API serves a post with txid <txid_b> authored by the address <other> with text <text_b>
    When I open the Following feed
    Then the feed shows the post with text <text_a>
    And the feed does not show the post with text <text_b>

    Examples:
      | followee | txid_a | text_a | other | txid_b | text_b |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 1111111111111111111111111111111111111111111111111111111111111111 | hello from alice | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 2222222222222222222222222222222222222222222222222222222222222222 | hello from bob |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 3333333333333333333333333333333333333333333333333333333333333333 | bitcoin rocks | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4444444444444444444444444444444444444444444444444444444444444444 | memo is fun |

  Scenario: Following Feed - 2 the feed does not include the viewer's own posts
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "hello from alice"
    Given the psf-memo-db API serves a post with txid 5555555555555555555555555555555555555555555555555555555555555555 authored by my wallet address with text "my own post"
    When I open the Following feed
    Then the feed shows the post with text "hello from alice"
    And the feed does not show the post with text "my own post"

  Scenario: Following Feed - 3 the feed orders followed posts newest first
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid 0000000000000000000000000000000000000000000000000000000000000001 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "older post" at block height 100
    Given the psf-memo-db API serves a post with txid 0000000000000000000000000000000000000000000000000000000000000002 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "newer post" at block height 300
    When I open the Following feed
    Then the feed shows the post with txid 0000000000000000000000000000000000000000000000000000000000000002 before the post with txid 0000000000000000000000000000000000000000000000000000000000000001

  Scenario: Following Feed - 4 the feed excludes replies
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "top level post"
    Given the psf-memo-db API serves a reply with txid 6666666666666666666666666666666666666666666666666666666666666666 to the post with txid 1111111111111111111111111111111111111111111111111111111111111111 with text "a reply"
    When I open the Following feed
    Then the feed shows the post with text "top level post"
    And the feed does not show the post with text "a reply"

  Scenario: Following Feed - 5 the feed paginates followed posts
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "post one"
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "post two"
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "post three"
    When I open the Following feed with page size 2
    Then the feed shows 2 posts
    And the feed can load more posts

  Scenario: Following Feed - 6 the feed shows a message when the viewer follows no one
    Given I follow no one
    When I open the Following feed
    Then the feed shows a message that I am not following anyone

  Scenario: Following Feed - 7 the feed is empty when followed profiles have no posts
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I open the Following feed
    Then the feed shows no posts
