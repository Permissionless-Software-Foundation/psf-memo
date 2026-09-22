# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-22T16:56:28.938565820Z","feature_name":"Recent Profile Follow Controls","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/recent-profile-follow.feature","background_hash":"d9c3efdaa68fbd8bba560c40f8b433cebb31903a5909b5cc512b296a66736cf9","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Recent Profile Follow Controls - 5 clicking Follow asks for confirmation and cancelling does not broadcast","scenario_hash":"06376100941d0a08bda59af9d9d059fbf7e2b0a5e151e2c0f4081dc68d87bcd6","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:56:28.938565820Z"},{"index":5,"name":"Recent Profile Follow Controls - 6 clicking Unfollow asks for confirmation and cancelling does not broadcast","scenario_hash":"185b4a2a05d9497dd07fc154f8917fa0e09e03c46add1652e8fbe0436578defe","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:56:28.938565820Z"},{"index":6,"name":"Recent Profile Follow Controls - 7 confirming Follow broadcasts and shows the result","scenario_hash":"6af44718743630892f4d5faaa1c338f07a774fb1026638ad3ca1ceda6706c1f8","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:56:28.938565820Z"},{"index":7,"name":"Recent Profile Follow Controls - 8 confirming Unfollow broadcasts and shows the result","scenario_hash":"3038b50897b1ed079adf487f6fe1cd092e5ba647935a5b70dbc270cd3bfa9651","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:56:28.938565820Z"},{"index":9,"name":"Recent Profile Follow Controls - 10 the result modal shows a loading indicator while the broadcast is pending","scenario_hash":"7a53d2ac5011bdf3115dd762f5bfb03fc27f3d6e834d47275237e9d7b32127d2","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:56:28.938565820Z"},{"index":1,"name":"Recent Profile Follow Controls - 2 a profile the viewer does not follow shows a Follow button","scenario_hash":"656a6e42c115764bc3855327808e28614339524e4a90b8deb092c80c8d49e583","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:18:33.966406564Z"},{"index":2,"name":"Recent Profile Follow Controls - 3 a profile the viewer follows shows an Unfollow button","scenario_hash":"0f238df231de574fcd53ebf2db6ef12edd1ea31f92c47bacf1b1247df845cc66","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-22T16:18:33.966406564Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Recent Profile Follow Controls - 1, Recent Profile Follow Controls - 2, Recent Profile Follow Controls - 3, Recent Profile Follow Controls - 4, Recent Profile Follow Controls - 5, Recent Profile Follow Controls - 6, Recent Profile Follow Controls - 7, Recent Profile Follow Controls - 8, Recent Profile Follow Controls - 9, Recent Profile Follow Controls - 10, Recent Profile Follow Controls - 11
#
# The /profile/recent table's last column is Follow. Each row shows a
# Follow/Unfollow button for the viewer: "Follow" when the viewer does not
# follow that profile, "Unfollow" when they do, and a disabled Follow button on
# the viewer's own row. Clicking the button opens a confirmation modal that
# asks the profile's display name - "Are you sure you want to follow alice?"
# (or "unfollow alice?"), where "alice" is the profile's display name, never a
# literal placeholder - and offers Yes and No buttons; nothing is broadcast
# until Yes is clicked. In the Gherkin below, <display_name> is a parameter
# that the acceptance runtime replaces with the profile's display name. That
# display name is the profile's name, or the truncated address when it has no
# name, matching the Account column. Clicking Yes continues to the broadcast:
# the modal shows a loading indicator while the Memo follow (0x6d06) or
# unfollow (0x6d07) transaction is prepared and broadcast; on success it shows
# a broadcast success message, the transaction id, and a link to that
# transaction on the block explorer, and the row's button flips to the other
# label; on failure it shows the broadcast error in red and the button keeps
# its previous label. Clicking No closes the modal without broadcasting and
# leaves the row unchanged. The result modal stays open until dismissed.
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

  Scenario Outline: Recent Profile Follow Controls - 5 clicking Follow asks for confirmation and cancelling does not broadcast
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal asks "Are you sure you want to follow <display_name>?"
    And the recent profiles follow modal offers Yes and No buttons
    When I click the No button in the recent profiles follow modal
    Then the recent profiles follow modal closes
    And the app does not broadcast an OP_RETURN transaction
    And the recent profiles follow button for the address <addr> says "Follow"

    Examples:
      | addr | display_name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |

  Scenario Outline: Recent Profile Follow Controls - 6 clicking Unfollow asks for confirmation and cancelling does not broadcast
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal asks "Are you sure you want to unfollow <display_name>?"
    And the recent profiles follow modal offers Yes and No buttons
    When I click the No button in the recent profiles follow modal
    Then the recent profiles follow modal closes
    And the app does not broadcast an OP_RETURN transaction
    And the recent profiles follow button for the address <addr> says "Unfollow"

    Examples:
      | addr | display_name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |

  Scenario Outline: Recent Profile Follow Controls - 7 confirming Follow broadcasts and shows the result
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal asks "Are you sure you want to follow <display_name>?"
    When I click the Yes button in the recent profiles follow modal
    Then the app broadcasts an OP_RETURN transaction with the Memo follow prefix for the address <addr>
    And the recent profiles follow button for the address <addr> says "Unfollow"
    And the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr | display_name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |

  Scenario Outline: Recent Profile Follow Controls - 8 confirming Unfollow broadcasts and shows the result
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal asks "Are you sure you want to unfollow <display_name>?"
    When I click the Yes button in the recent profiles follow modal
    Then the app broadcasts an OP_RETURN transaction with the Memo unfollow prefix for the address <addr>
    And the recent profiles follow button for the address <addr> says "Follow"
    And the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr | display_name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |

  Scenario Outline: Recent Profile Follow Controls - 9 a failed follow broadcast shows a red error message
    Given the wallet fails to broadcast with the error "<broadcast_error>"
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    When I click the Yes button in the recent profiles follow modal
    Then the app attempts to broadcast an OP_RETURN transaction with the Memo follow prefix for the address <addr>
    And the recent profiles follow modal shows a red error message containing "<broadcast_error>"
    And the recent profiles follow button for the address <addr> says "Follow"

    Examples:
      | addr | broadcast_error |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | Insufficient balance |

  Scenario Outline: Recent Profile Follow Controls - 10 the result modal shows a loading indicator while the broadcast is pending
    Given the follow broadcast is held until released
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    Then the recent profiles follow modal asks "Are you sure you want to follow <display_name>?"
    When I start the confirmed follow broadcast
    Then the recent profiles follow modal shows a loading indicator
    When I release the follow broadcast
    Then the recent profiles follow modal shows a broadcast success message
    And the recent profiles follow modal shows the follow transaction id
    And the recent profiles follow modal shows a link to the block explorer for the follow transaction

    Examples:
      | addr | display_name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |

  Scenario Outline: Recent Profile Follow Controls - 11 dismissing the result closes the modal
    Given I open the recent profiles page
    When I click the recent profiles follow button for the address <addr>
    When I click the Yes button in the recent profiles follow modal
    Then the recent profiles follow modal is open
    When I dismiss the recent profiles follow result
    Then the recent profiles follow modal closes

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
