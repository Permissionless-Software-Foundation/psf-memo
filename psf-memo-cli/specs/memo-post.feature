# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T17:08:51.819471214Z","feature_name":"Memo Post","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-post.feature","background_hash":"7bea6f80b25d9ffd2f92c185c96be0e759970af76c06e0d86f6676c9c5722b29","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Memo Post - 5 an empty memo is a usage error","scenario_hash":"d231aa8cdbb25bca9a0544ed139212dff06c144ccbcb85aa6b9312e61655cb5a","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-07T17:08:51.819471214Z"}]}
# acceptance-mutation-manifest-end

# Memo Post (W1): the first psf-memo-cli write command. It resolves the signing
# wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source), validates the
# post text against the 0x6d02 protocol limit of 217 characters (UTF-16 code
# units, not bytes; gotcha #7), broadcasts the memo as the single-field Memo
# action [6d02, text] through the shared F3 broadcast scaffolding, and reports
# the transaction id plus its bch.loping.net explorer link. A missing or
# invalid flag is a usage error (exit 2); a rejected broadcast surfaces the
# wallet's real error (exit 1). The command adopts the shared F5 output
# contract, so --json prints one JSON object to stdout.
#
# Scenarios: Memo Post - 1, Memo Post - 2, Memo Post - 3, Memo Post - 4, Memo Post - 5, Memo Post - 6, Memo Post - 7
Feature: Memo Post

  Background:
    Given a Memo post command

  Scenario Outline: Memo Post - 1 a valid memo is broadcast with the Memo post prefix
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the memo text is "<text>"
    When the memo-post command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d02"
    And broadcast push 2 is the UTF-8 text "<text>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | text                                              |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | hello memo                                        |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | a longer memo with several words and punctuation. |

  Scenario Outline: Memo Post - 2 the 217-character limit counts characters, not bytes
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the memo text is <length> multibyte characters long
    When the memo-post command runs
    Then broadcast push 2 has <bytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | length | bytes |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | 217    | 434   |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | 5      | 10    |

  Scenario Outline: Memo Post - 3 a memo longer than 217 characters is a usage error
    Given a signing wallet that records broadcasts
    And the memo text is <length> characters long
    When the memo-post command runs
    Then the memo-post command reported the usage error "Memo is too long. Maximum is 217 characters."
    And the wallet did not broadcast

    Examples:
      | length |
      | 218    |
      | 300    |

  Scenario: Memo Post - 4 a missing memo is a usage error
    Given a signing wallet that records broadcasts
    Given no memo text is given
    When the memo-post command runs
    Then the memo-post command reported the usage error "You must specify memo text with the -m flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Post - 5 an empty memo is a usage error
    Given a signing wallet that records broadcasts
    And the memo text is "<text>"
    When the memo-post command runs
    Then the memo-post command reported the usage error "Memo must not be empty."
    And the wallet did not broadcast

    Examples:
      | text |
      |      |

  Scenario: Memo Post - 6 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the memo text is "hello memo"
    When the memo-post command runs
    Then the memo-post command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Post - 7 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the memo text is "hello memo"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-post command runs
    Then the memo-post command reported the error "Failed to broadcast: <error>"

    Examples:
      | error              |
      | insufficient funds |
      | transaction rejected |
