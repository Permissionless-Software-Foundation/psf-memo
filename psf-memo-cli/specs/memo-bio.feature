# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T02:04:03.438837741Z","feature_name":"Memo Bio","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-bio.feature","background_hash":"f1a88a83f9f92f43f37401ac7b1c46d44617c43ba6cd6ea49f24f6d2924c9796","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Memo Bio - 5 an empty bio is a usage error","scenario_hash":"e9d5948e7949bfbbc3fadfff2db132f84e46799fd6d60aee340cdb1f12add053","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-08T02:04:03.438837741Z"}]}
# acceptance-mutation-manifest-end

# Memo Bio (W5): the psf-memo-cli set-profile-text write command. It resolves the
# signing wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source),
# validates the bio against the 0x6d05 protocol limit of 217 UTF-8 bytes (not
# characters; gotcha #7), broadcasts the single-field Memo action [6d05, bio]
# through the shared F3 broadcast scaffolding, and reports the transaction id
# plus its bch.loping.net explorer link. A missing or invalid flag is a usage
# error (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's
# real error (exit 1). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout.
#
# Scenarios: Memo Bio - 1, Memo Bio - 2, Memo Bio - 3, Memo Bio - 4, Memo Bio - 5, Memo Bio - 6, Memo Bio - 7
Feature: Memo Bio

  Background:
    Given a Memo bio command

  Scenario Outline: Memo Bio - 1 a valid bio is broadcast with the Memo set-profile prefix
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the bio is "<text>"
    When the memo-bio command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d05"
    And broadcast push 2 is the UTF-8 text "<text>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | text                                      |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | Building the future on Bitcoin Cash       |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | a longer bio with spaces and punctuation. |

  Scenario Outline: Memo Bio - 2 the 217-byte limit counts bytes, not characters
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the bio is <length> multibyte characters long
    When the memo-bio command runs
    Then broadcast push 2 has <bytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | length | bytes |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | 108    | 216   |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | 5      | 10    |

  Scenario Outline: Memo Bio - 3 a bio longer than 217 bytes is a usage error
    Given a signing wallet that records broadcasts
    And the bio is <length> multibyte characters long
    When the memo-bio command runs
    Then the memo-bio command reported the usage error "Bio is too long. Maximum is 217 bytes."
    And the wallet did not broadcast

    Examples:
      | length |
      | 109    |
      | 150    |

  Scenario: Memo Bio - 4 a missing bio is a usage error
    Given a signing wallet that records broadcasts
    Given no bio is given
    When the memo-bio command runs
    Then the memo-bio command reported the usage error "You must specify bio text with the -m flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Bio - 5 an empty bio is a usage error
    Given a signing wallet that records broadcasts
    And the bio is "<text>"
    When the memo-bio command runs
    Then the memo-bio command reported the usage error "Bio must not be empty."
    And the wallet did not broadcast

    Examples:
      | text |
      |      |

  Scenario: Memo Bio - 6 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the bio is "hello"
    When the memo-bio command runs
    Then the memo-bio command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Bio - 7 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the bio is "hello"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-bio command runs
    Then the memo-bio command reported the error "Failed to broadcast: <error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
