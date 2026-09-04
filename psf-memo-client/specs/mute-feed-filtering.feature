# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-04T20:29:46.340959103Z","feature_name":"Mute Feed Filtering","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/mute-feed-filtering.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Mute Feed Filtering - 1, Mute Feed Filtering - 2, Mute Feed Filtering - 3, Mute Feed Filtering - 4, Mute Feed Filtering - 5, Mute Feed Filtering - 6
#
# Muting a profile hides that profile's content from the viewer's feeds. The
# psf-memo-db API filters server-side: given the viewer's address, it excludes
# posts and notifications authored by profiles the viewer currently mutes. The
# client identifies the viewer from the wallet and passes the viewer address to
# the recent feed, topic feed, search, and notifications queries. Filtering is
# not optimistic: a mute only takes effect once the mute transaction is mined
# and indexed, which is represented here by the psf-memo-db API reporting the
# mute. Unmuting restores the profile's content once the unmute is indexed.
Feature: Mute Feed Filtering

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Mute Feed Filtering - 1 the recent feed hides posts from muted profiles
    Given the psf-memo-db API reports that I mute the address <muted>
    Given the psf-memo-db API serves a post with txid <txid_a> authored by the address <muted> with text <text_a>
    Given the psf-memo-db API serves a post with txid <txid_b> authored by the address <other> with text <text_b>
    When I open the recent posts feed
    Then the recent feed shows the post with text <text_b>
    And the recent feed does not show the post with text <text_a>

    Examples:
      | muted | txid_a | text_a | other | txid_b | text_b |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 1111111111111111111111111111111111111111111111111111111111111111 | hello from muted | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 2222222222222222222222222222222222222222222222222222222222222222 | hello from other |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 3333333333333333333333333333333333333333333333333333333333333333 | muted again | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4444444444444444444444444444444444444444444444444444444444444444 | other again |

  Scenario Outline: Mute Feed Filtering - 2 the topic feed hides posts from muted profiles
    Given the psf-memo-db API reports that I mute the address <muted>
    Given the psf-memo-db API serves a post with txid <txid_a> in the topic "bitcoin" authored by the address <muted> with text <text_a>
    Given the psf-memo-db API serves a post with txid <txid_b> in the topic "bitcoin" authored by the address <other> with text <text_b>
    When I open the topic feed for "bitcoin"
    Then the topic feed shows the post with text <text_b>
    And the topic feed does not show the post with text <text_a>

    Examples:
      | muted | txid_a | text_a | other | txid_b | text_b |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 1111111111111111111111111111111111111111111111111111111111111111 | muted topic post | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 2222222222222222222222222222222222222222222222222222222222222222 | other topic post |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | 3333333333333333333333333333333333333333333333333333333333333333 | muted topic again | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 4444444444444444444444444444444444444444444444444444444444444444 | other topic again |

  Scenario Outline: Mute Feed Filtering - 3 search hides posts from muted profiles
    Given the psf-memo-db API reports that I mute the address <muted>
    Given the psf-memo-db API has a post with the text <text_a> authored by the address <muted>
    Given the psf-memo-db API has a post with the text <text_b> authored by the address <other>
    When I open the Search page
    And I submit a search for <query>
    Then the search results include a post with the text <text_b>
    And the search results do not include a post with the text <text_a>

    Examples:
      | muted | text_a | other | text_b | query |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | muted post about bitcoin | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | other post about bitcoin | bitcoin |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | muted post about memo | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | other post about memo | memo |

  Scenario Outline: Mute Feed Filtering - 4 notifications hide actions from muted profiles
    Given the psf-memo-db API reports that I mute the address <muted>
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a reply with txid <reply_a> to the post with txid <my_post> by the address <muted> with text <text_a>
    Given the psf-memo-db API serves a reply with txid <reply_b> to the post with txid <my_post> by the address <other> with text <text_b>
    When I open the Notifications page
    Then the notifications include a reply notification from the address <other> with text <text_b>
    And the notifications do not include a reply notification from the address <muted>

    Examples:
      | my_post | reply_a | muted | text_a | reply_b | other | text_b |
      | 1111111111111111111111111111111111111111111111111111111111111111 | 2222222222222222222222222222222222222222222222222222222222222222 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | muted reply | 3333333333333333333333333333333333333333333333333333333333333333 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | other reply |
      | 4444444444444444444444444444444444444444444444444444444444444444 | 5555555555555555555555555555555555555555555555555555555555555555 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | muted reply again | 6666666666666666666666666666666666666666666666666666666666666666 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | other reply again |

  Scenario: Mute Feed Filtering - 5 unmuting restores posts in the recent feed
    Given the psf-memo-db API reports that I mute the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API reports that I unmute the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "hello from alice"
    When I open the recent posts feed
    Then the recent feed shows the post with text "hello from alice"

  Scenario: Mute Feed Filtering - 6 the recent feed shows all posts when I mute no one
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "hello from alice"
    When I open the recent posts feed
    Then the recent feed shows the post with text "hello from alice"
