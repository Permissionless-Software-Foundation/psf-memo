# Scenarios: Wallet Source - 1, Wallet Source - 2, Wallet Source - 3, Wallet Source - 4
#
# F2a: how a memo-* write command resolves the signing wallet. Exactly one
# source is required: a saved wallet name (-n) or a WIF (--wif). Resolution
# returns an initialized wallet and its cash address. WIF-to-address derivation
# is delegated to minimal-slp-wallet, so the acceptance injects a wallet factory
# and the WIF example values are opaque.
Feature: Wallet Source

  Background:
    Given a wallet factory

  Scenario Outline: Wallet Source - 1 a wallet name resolves the named wallet
    Given the saved wallet "<name>" has the address "<addr>"
    When the wallet source is resolved from the name "<name>"
    Then the resolved address is "<addr>"

    Examples:
      | name    | addr                                                   |
      | wallet1 | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | wallet2 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Wallet Source - 2 a WIF resolves the key's wallet
    Given the WIF "<wif>" corresponds to the address "<addr>"
    When the wallet source is resolved from the WIF "<wif>"
    Then the resolved address is "<addr>"

    Examples:
      | wif      | addr                                                   |
      | wif-one  | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | wif-two  | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario: Wallet Source - 3 no wallet source is a usage error
    Given no wallet source is given
    When the wallet source is resolved
    Then the resolution reports a usage error

  Scenario: Wallet Source - 4 both a wallet name and a WIF is a usage error
    Given both a wallet name and a WIF are given
    When the wallet source is resolved
    Then the resolution reports a usage error
