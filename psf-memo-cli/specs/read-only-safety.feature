# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T14:10:51.918422002Z","feature_name":"Read-Only Safety","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/read-only-safety.feature","background_hash":"dfbbd9404bb80651225ea0765f09f498029ce17b76284c032e6b43b406300e5c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Read-Only Safety - 1, Read-Only Safety - 2, Read-Only Safety - 3, Read-Only Safety - 4, Read-Only Safety - 5, Read-Only Safety - 6
#
# X4: a psf-memo-cli read command resolves a wallet only when the requested
# data is viewer-relative. Reads that need no viewer (memo-feed, memo-status,
# memo-profile) run with no wallet available; a viewer supplied as an address
# is not a wallet either. Only a wallet-relative read (memo-notifications here)
# resolves the wallet it is given, and a missing wallet file for such a read is
# a runtime error, not a silent empty result.
Feature: Read-Only Safety

  Background:
    Given a recording wallet resolver
    And no wallet is available

  Scenario: Read-Only Safety - 1 a feed read does not resolve a wallet
    Given the Memo DB service serves the recent feed
    When the memo-feed command runs
    Then the wallet resolver was not used
    And the command reported the post txids "alpha, bravo, charlie, delta, echo"

  Scenario: Read-Only Safety - 2 a status read does not resolve a wallet
    Given the Memo DB service serves the indexer status 524999 800000 800001
    When the memo-status command runs
    Then the wallet resolver was not used
    And the command reported start block height 524999, synced block height 800000, and chain block height 800001

  Scenario Outline: Read-Only Safety - 3 a viewer-address read does not resolve a wallet
    Given the Memo DB service serves the recent feed
    When the memo-feed command runs with viewer "<viewer>"
    Then the wallet resolver was not used
    And the service received the viewer query parameter "<viewer>"

    Examples:
      | viewer                                                 |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Read-Only Safety - 4 a profile read does not resolve a wallet
    Given the Memo DB service serves posts by "addrA"
    When the memo-profile command runs for "<address>"
    Then the wallet resolver was not used
    And the service received an address-posts request for "<address>" with limit 50 and offset 0

    Examples:
      | address                                                |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Read-Only Safety - 5 a wallet-relative read resolves the wallet it requests
    Given the Memo DB service serves the notifications feed
    And the wallet "<wallet>" has the address "<address>"
    When the memo-notifications command runs for wallet "<wallet>"
    Then the wallet resolver was used once
    And the service received a notifications request for "<address>" with limit 50 and offset 0

    Examples:
      | wallet  | address                                                |
      | viewer1 | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | viewer2 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario: Read-Only Safety - 6 a wallet-relative read with a missing wallet reports an error
    Given the Memo DB service serves the notifications feed
    When the memo-notifications command runs for wallet "missing-wallet"
    Then the wallet resolver was used once
    And the memo-notifications command reported an error
