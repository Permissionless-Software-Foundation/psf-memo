# Scenarios: Notifications - 1, Notifications - 2, Notifications - 3, Notifications - 4, Notifications - 5, Notifications - 6, Notifications - 7, Notifications - 8
#
# Notifications is a read-only feature: the psf-memo-db API aggregates replies
# to the viewer's posts, likes on the viewer's posts, and follows of the
# viewer into a single newest-first, paginated list. The client identifies the
# viewer from the wallet and renders the page; it broadcasts no Memo action.
# Only actions by other people on the viewer's own content are shown; the
# viewer's own actions never notify them.
Feature: Notifications

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twtmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Notifications - 1 a reply to my post appears as a reply notification
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a reply with txid <reply_txid> to the post with txid <my_post> by the address <replier> with text <reply_text>
    When I open the Notifications page
    Then the notifications include a reply notification from the address <replier> with text <reply_text>

    Examples:
      | my_post | reply_txid | replier | reply_text |
      | 1111111111111111111111111111111111111111111111111111111111111111 | 2222222222222222222222222222222222222222222222222222222222222222 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | nice post |
      | 3333333333333333333333333333333333333333333333333333333333333333 | 4444444444444444444444444444444444444444444444444444444444444444 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | agreed |

  Scenario Outline: Notifications - 2 a like on my post appears as a like notification
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a like with txid <like_txid> on the post with txid <my_post> by the address <liker>
    When I open the Notifications page
    Then the notifications include a like notification from the address <liker>

    Examples:
      | my_post | like_txid | liker |
      | 1111111111111111111111111111111111111111111111111111111111111111 | 2222222222222222222222222222222222222222222222222222222222222222 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | 3333333333333333333333333333333333333333333333333333333333333333 | 4444444444444444444444444444444444444444444444444444444444444444 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Notifications - 3 a follow of me appears as a follow notification
    Given the psf-memo-db API records that the address <follower> follows my wallet address
    When I open the Notifications page
    Then the notifications include a follow notification from the address <follower>

    Examples:
      | follower |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario: Notifications - 4 notifications are ordered newest first
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a reply with txid 2222222222222222222222222222222222222222222222222222222222222222 to the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "nice post" at block height 100
    Given the psf-memo-db API serves a like with txid 3333333333333333333333333333333333333333333333333333333333333333 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r at block height 300
    When I open the Notifications page
    Then the notifications show the like notification before the reply notification

  Scenario: Notifications - 5 notifications paginate
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a reply with txid 2222222222222222222222222222222222222222222222222222222222222222 to the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "nice post"
    Given the psf-memo-db API serves a like with txid 3333333333333333333333333333333333333333333333333333333333333333 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r
    When I open the Notifications page with page size 1
    Then the notifications show 1 notification
    And the notifications can load more

  Scenario: Notifications - 6 only notifications about my content are shown
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text "alice's post"
    Given the psf-memo-db API serves a reply with txid 2222222222222222222222222222222222222222222222222222222222222222 to the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r with text "a reply to alice"
    When I open the Notifications page
    Then the notifications include no notifications

  Scenario: Notifications - 7 the page shows a message when I have no notifications
    When I open the Notifications page
    Then the notifications show a message that I have no notifications

  Scenario: Notifications - 8 my own actions do not notify me
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    Given the psf-memo-db API serves a reply with txid 2222222222222222222222222222222222222222222222222222222222222222 to the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by my wallet address with text "my own reply"
    When I open the Notifications page
    Then the notifications include no notifications
