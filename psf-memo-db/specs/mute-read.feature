# Scenarios: Mute Read - 1, Mute Read - 2
#
# The mutes store keys mutees by 20-byte hash160. Use bch-js
# Address.toHash160() / Address.hash160ToCash() to convert between cash
# addresses and hash160 for the mute state and muted-user lists.
# Prefer bch-js over adding a separate cashaddr dependency.
Feature: Mute Read

  Background:
    Given a psf-memo-db instance with a mutes store
    Given the fixture "mutes" is loaded into the mutes store

  Scenario Outline: Mute Read - 1 GET /mute/state reports whether a muter mutes a mutee
    When the client requests the mute state for muter <muter> and mutee <mutee>
    Then the mute state reports muted <muted>

    Examples:
      | muter | mutee | muted |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | false |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | true |

  Scenario Outline: Mute Read - 2 GET /mute/muted lists the addresses a muter mutes
    When the client requests the muted list for <muter>
    Then the muted list contains the addresses <expected>

    Examples:
      | muter | expected |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
