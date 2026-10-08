# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T03:34:49.975842498Z","feature_name":"Memo Like","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-like.feature","background_hash":"e0f4cd04fd00a3ffda3d4ad9f0568830f9e95968d33fe6f6365a58139e30d67b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Memo Like (W3): the psf-memo-cli like/tip write command. It resolves the
# signing wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source), requires
# the liked post txid (-t), and broadcasts the 0x6d04 like action carrying the
# post txid (32-byte little-endian wire order; gotcha #32) through the shared F3
# broadcast scaffolding. An optional tip (--tip <sats>, --author <addr>) adds a
# P2PKH output paying the post author in the same transaction. The command
# mirrors memo-like.js's validation: a tip below the 600-sat dust floor, above
# the 1-BCH maximum, non-integer, or without an author address is a usage error
# (exit 2); a wallet with under 3000 spendable sats, or a tip above the
# spendable balance, is reported as an error (exit 1). A rejected broadcast
# surfaces the wallet's real error (exit 1). The command adopts the shared F5
# output contract, so --json prints one JSON object to stdout.
#
# Scenarios: Memo Like - 1, Memo Like - 2, Memo Like - 3, Memo Like - 4, Memo Like - 5, Memo Like - 6, Memo Like - 7, Memo Like - 8, Memo Like - 9, Memo Like - 10
Feature: Memo Like

  Background:
    Given a Memo like command

  Scenario Outline: Memo Like - 1 a pure like broadcasts the Memo like prefix and the post txid
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of <balance> satoshis
    And the signing wallet returns the transaction id "<txid>"
    And the liked post txid is "<post>"
    When the memo-like command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d04"
    And broadcast push 2 is the referenced txid "<post>" in little-endian wire order
    And the broadcast has no BCH tip output
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | post                                                             | balance |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 3000    |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 100000  |

  Scenario Outline: Memo Like - 2 a like with a tip broadcasts and pays the author
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of <balance> satoshis
    And the signing wallet returns the transaction id "<txid>"
    And the liked post txid is "<post>"
    And the tip is "<tip>" satoshis to the author "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    When the memo-like command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d04"
    And broadcast push 2 is the referenced txid "<post>" in little-endian wire order
    And the broadcast pays <tip> satoshis to the author "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | post                                                             | balance | tip   |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 3000    | 600   |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 100000  | 25000 |

  Scenario Outline: Memo Like - 3 an invalid tip is a usage error
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of 150000000 satoshis
    And the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the tip is "<tip>" satoshis to the author "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    When the memo-like command runs
    Then the memo-like command reported the usage error "<error>"
    And the wallet did not broadcast

    Examples:
      | tip       | error                                        |
      | 1         | Tip is below the dust limit of 600 sats.     |
      | 599       | Tip is below the dust limit of 600 sats.     |
      | 1.5       | Tip must be a valid number of satoshis.      |
      | abc       | Tip must be a valid number of satoshis.      |
      | 100000001 | Tip exceeds the maximum of 100000000 sats.   |

  Scenario: Memo Like - 4 a tip without an author address is a usage error
    Given a signing wallet that records broadcasts
    Given the signing wallet has a spendable balance of 100000 satoshis
    Given the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    Given the tip is "600" satoshis
    Given no author address is given
    When the memo-like command runs
    Then the memo-like command reported the usage error "Tip requires an author address."
    And the wallet did not broadcast

  Scenario: Memo Like - 5 a missing post txid is a usage error
    Given a signing wallet that records broadcasts
    Given the signing wallet has a spendable balance of 100000 satoshis
    Given no liked post txid is given
    When the memo-like command runs
    Then the memo-like command reported the usage error "You must specify a post txid with the -t flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Like - 6 a malformed post txid is a usage error
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of 100000 satoshis
    And the liked post txid is "<post>"
    When the memo-like command runs
    Then the memo-like command reported the usage error "<error>"
    And the wallet did not broadcast

    Examples:
      | post                                                             | error                                   |
      | 1234                                                             | Txid must be a 64-character hex string. |
      | zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz | Txid must be a valid hex string.        |

  Scenario Outline: Memo Like - 7 a wallet with no spendable balance cannot like
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of <balance> satoshis
    And the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    When the memo-like command runs
    Then the memo-like command reported the error "add BCH to your wallet before liking a post."
    And the wallet did not broadcast

    Examples:
      | balance |
      | 0       |
      | 2999    |

  Scenario Outline: Memo Like - 8 a tip above the spendable balance is rejected
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of <balance> satoshis
    And the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the tip is "<tip>" satoshis to the author "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    When the memo-like command runs
    Then the memo-like command reported the error "Tip exceeds the spendable balance."
    And the wallet did not broadcast

    Examples:
      | balance | tip    |
      | 30000   | 35000  |
      | 500000  | 550000 |

  Scenario: Memo Like - 9 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    When the memo-like command runs
    Then the memo-like command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Like - 10 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the signing wallet has a spendable balance of 100000 satoshis
    And the liked post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-like command runs
    Then the memo-like command reported the error "Failed to broadcast: <error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
