# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-04T18:29:23.460506768Z","feature_name":"Binary Payload Broadcast","feature_path":"../../psf-memo-client/specs/binary-payload-broadcast.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Binary Payload Broadcast - 1, Binary Payload Broadcast - 2, Binary Payload Broadcast - 3, Binary Payload Broadcast - 4
#
# Follow/unfollow and mute/unmute broadcast an OP_RETURN whose payload is the
# target's raw 20-byte hash160, not its display-form cash address text. This
# regression spec exercises that binary payload on the wire for every action.
# The coder must keep the payload bytes exact and must not surface a broadcast
# error after a successful action.
Feature: Binary Payload Broadcast

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Binary Payload Broadcast - 1 clicking Mute broadcasts the binary hash160 payload for the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Mute button
    Then the app broadcasts an OP_RETURN transaction with the Memo mute prefix and the binary hash160 payload for the address <addr>
    Then the profile page shows an Unmute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Binary Payload Broadcast - 2 clicking Unmute broadcasts the binary hash160 payload for the address <addr>
    Given the psf-memo-db API reports that I mute the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Unmute button
    Then the app broadcasts an OP_RETURN transaction with the Memo unmute prefix and the binary hash160 payload for the address <addr>
    Then the profile page shows a Mute button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Binary Payload Broadcast - 3 clicking Follow broadcasts the binary hash160 payload for the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Follow button
    Then the app broadcasts an OP_RETURN transaction with the Memo follow prefix and the binary hash160 payload for the address <addr>
    Then the profile page shows an Unfollow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Binary Payload Broadcast - 4 clicking Unfollow broadcasts the binary hash160 payload for the address <addr>
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Unfollow button
    Then the app broadcasts an OP_RETURN transaction with the Memo unfollow prefix and the binary hash160 payload for the address <addr>
    Then the profile page shows a Follow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
