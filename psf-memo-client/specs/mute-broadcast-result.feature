# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T22:26:11.305882913Z","feature_name":"Mute Broadcast Result","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/mute-broadcast-result.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Mute Broadcast Result - 1, Mute Broadcast Result - 2, Mute Broadcast Result - 3, Mute Broadcast Result - 4
#
# Clicking the Mute button on another user's profile broadcasts a Memo mute
# (0x6d16). Once the broadcast completes, the profile page shows a result
# modal. On success the modal shows a broadcast success message, the mute
# transaction id, and a link to that transaction on the block explorer
# (https://bch.loping.net/tx/<txid>) that opens in a new tab; on failure it
# shows the broadcast error message. A successful mute still changes the button
# to Unmute and a successful unmute changes it back to Mute; a failed broadcast
# leaves the button in its previous state. The result modal stays open until
# the user dismisses it, and dismissing it closes the modal without navigating.
# This mirrors the New Post page and like/tip broadcast result modals. This is
# a client-only behavior in psf-memo-client: it broadcasts no additional Memo
# action and changes no DB data.
Feature: Mute Broadcast Result

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Mute Broadcast Result - 1 a successful mute shows the broadcast result modal
    Given I open the profile page for the address <addr>
    When I click the Mute button
    Then the app broadcasts an OP_RETURN transaction with the Memo mute prefix for the address <addr>
    Then the profile page shows an Unmute button
    And the profile page shows a mute result modal
    And the mute result modal shows a broadcast success message
    And the mute result modal shows the mute transaction id
    And the mute result modal shows a link to the block explorer for the mute transaction

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Mute Broadcast Result - 2 a successful unmute shows the broadcast result modal
    Given the psf-memo-db API reports that I mute the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Unmute button
    Then the app broadcasts an OP_RETURN transaction with the Memo unmute prefix for the address <addr>
    Then the profile page shows a Mute button
    And the profile page shows a mute result modal
    And the mute result modal shows a broadcast success message
    And the mute result modal shows the mute transaction id
    And the mute result modal shows a link to the block explorer for the mute transaction

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Mute Broadcast Result - 3 dismissing the mute result closes the modal
    Given I open the profile page for the address <addr>
    When I click the Mute button
    Then the profile page shows a mute result modal
    When I dismiss the mute result
    Then the mute result modal closes
    And the profile page shows an Unmute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Mute Broadcast Result - 4 a failed mute broadcast shows the failure modal
    Given I open the profile page for the address <addr>
    And the wallet fails to broadcast with the error "<broadcast_error>"
    When I click the Mute button
    Then the app attempts to broadcast an OP_RETURN transaction with the Memo mute prefix for the address <addr>
    Then the profile page shows a failure modal containing "<broadcast_error>"
    And the profile page shows a Mute button

    Examples:
      | addr | broadcast_error |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | Insufficient balance |
