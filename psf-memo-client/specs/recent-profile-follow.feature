# Scenarios: Recent Profile Follow Controls - 1, Recent Profile Follow Controls - 2, Recent Profile Follow Controls - 3, Recent Profile Follow Controls - 4, Recent Profile Follow Controls - 5, Recent Profile Follow Controls - 6, Recent Profile Follow Controls - 7, Recent Profile Follow Controls - 8, Recent Profile Follow Controls - 9
#
# The /profile/recent table no longer shows the profile's provenance TXID.
# Its last column is renamed "Follow" and each row shows a Follow/Unfollow
# button for the viewer. The button says "Follow" when the viewer does not
# follow that profile and "Unfollow" when the viewer does. The viewer's own
# profile row shows a disabled Follow button. Clicking the button opens a
# result modal: while the Memo follow (0x6d06) or unfollow (0x6d07)
# transaction is prepared and broadcast, the modal shows a loading indicator;
# on success the modal shows a broadcast success message, the transaction id,
# and a link to that transaction on the block explorer, and the row's button
# flips to the other label; on failure the modal shows the broadcast error in
# red and the button keeps its previous label. The modal stays open until
# dismissed.
# This is a client-only behavior in psf-memo-client: it broadcasts a Memo
# follow/unfollow action and reads the viewer's follow state from the existing
# psf-memo-db REST API; it changes no DB data on the write path.
#
# Fixture "recent-profiles-identities" (the GET /profile/recent response: each
# profile carries the display name and avatar URL joined from the names and
# profilePics stores, null when absent). The viewer's address is the wallet
# address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d, which is
# dave's address, so dave's row is the viewer's own row:
#   bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy (alice)
#   bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r (bob)
#   bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a (carol)
#   bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d (dave, the viewer)
Feature: Recent Profile Follow Controls

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given the psf-memo-db API serves the recent profiles fixture "recent-profiles-identities"

  Scenario: Recent Profile Follow Controls - 1 the follow column replaces the txid column
    When I open the recent profiles page
    Then the recent profiles table has the column headers "Account", "Address", "Bio", "Block", "Seen", "Follow"

  Scenario Outline: Recent Profile Follow Controls - 2 a profile the viewer does not follow shows a Follow button
    When I open the recent profiles page
    Then the recent profiles follow button for the address <addr> says "Follow"

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a |

  Scenario Outline: Recent Profile Follow Controls - 3 a profile the viewer follows shows an Unfollow button
    Given the psf-memo-db API reports that I follow the address <addr>
    When I open the recent profiles page
    Then the recent profiles follow button for the address <addr> says "Unfollow"

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario: Recent Profile Follow Controls - 4 the viewer's own profile shows a disabled follow button
    When I open the recent profiles page
    Then the recent profiles follow button for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d is disabled

  Scenario Outline: Recent Profile Follow Controls - 5 clicking Follow broadcasts and shows the result
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the app broadcasts an OP_RETURN transaction with the Memo follow prefix for the address <addr>
    And the recent profiles follow button for the address <addr> says "Unfollow"
    And the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Recent Profile Follow Controls - 6 clicking Unfollow broadcasts and shows the result
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the app broadcasts an OP_RETURN transaction with the Memo unfollow prefix for the address <addr>
    And the recent profiles follow button for the address <addr> says "Follow"
    And the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Recent Profile Follow Controls - 7 a failed follow broadcast shows a red error message
    Given the wallet fails to broadcast with the error "<broadcast_error>"
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the app attempts to broadcast an OP_RETURN transaction with the Memo follow prefix for the address <addr>
    And the recent profiles follow modal shows a red error message containing "<broadcast_error>"
    And the recent profiles follow button for the address <addr> says "Follow"

    Examples:
      | addr | broadcast_error |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | Insufficient balance |

  Scenario Outline: Recent Profile Follow Controls - 8 the result modal shows a loading indicator while the broadcast is pending
    Given the follow broadcast is held until released
    Given I open the recent profiles page
    When I start following the address <addr>
    Then the recent profiles follow modal shows a loading indicator
    When I release the follow broadcast
    Then the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Recent Profile Follow Controls - 9 dismissing the result closes the modal
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal is open
    When I dismiss the recent profiles follow result
    Then the recent profiles follow modal closes

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
