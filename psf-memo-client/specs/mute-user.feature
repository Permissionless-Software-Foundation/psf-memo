# Scenarios: Mute User - 1, Mute User - 2, Mute User - 3, Mute User - 4, Mute User - 5
#
# The mute/unmute OP_RETURN payload is the target's 20-byte hash160.
# Convert the target's cash address with bch-js Address.toHash160() (available
# through the minimal-slp-wallet embedded bch-js) before broadcasting 0x6d16 /
# 0x6d17. Do not add a separate cashaddr dependency.
Feature: Mute User

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Mute User - 1 viewing another user's profile shows a Mute button
    Given I open the profile page for the address <addr>
    Then the profile page shows a Mute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Mute User - 2 clicking Mute broadcasts the mute action and shows Unmute
    Given I open the profile page for the address <addr>
    When I click the Mute button
    Then the app broadcasts an OP_RETURN transaction with the Memo mute prefix for the address <addr>
    Then the profile page shows an Unmute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Mute User - 3 clicking Unmute broadcasts the unmute action and shows Mute
    Given the psf-memo-db API reports that I mute the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Unmute button
    Then the app broadcasts an OP_RETURN transaction with the Memo unmute prefix for the address <addr>
    Then the profile page shows a Mute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario: Mute User - 4 viewing my own profile does not show a Mute button
    Given I open the profile page for my own address
    Then the profile page does not show a Mute button

  Scenario Outline: Mute User - 5 the profile page shows Unmute when I already mute the user
    Given the psf-memo-db API reports that I mute the address <addr>
    Given I open the profile page for the address <addr>
    Then the profile page shows an Unmute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |
