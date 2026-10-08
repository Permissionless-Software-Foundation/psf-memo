# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T01:53:25.485800745Z","feature_name":"Memo Name","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-name.feature","background_hash":"931f0abad2189767340d07bbf836cb7a0f5d68e8f173d8735a36b13571d897eb","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Memo Name - 5 an empty name is a usage error","scenario_hash":"c7435465d4bbb8b1325b8ad4ddc488edb5f5f78f97d930c2eb2510656716ac26","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-08T01:53:25.485800745Z"}]}
# acceptance-mutation-manifest-end

# Memo Name (W4): the psf-memo-cli set-name write command. It resolves the
# signing wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source),
# validates the name against the 0x6d01 protocol limit of 77 UTF-8 bytes (not
# characters; gotcha #7), broadcasts the single-field Memo action [6d01, name]
# through the shared F3 broadcast scaffolding, and reports the transaction id
# plus its bch.loping.net explorer link. A missing or invalid flag is a usage
# error (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's
# real error (exit 1). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout.
#
# Scenarios: Memo Name - 1, Memo Name - 2, Memo Name - 3, Memo Name - 4, Memo Name - 5, Memo Name - 6, Memo Name - 7
Feature: Memo Name

  Background:
    Given a Memo name command

  Scenario Outline: Memo Name - 1 a valid name is broadcast with the Memo set-name prefix
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the name is "<name>"
    When the memo-name command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d01"
    And broadcast push 2 is the UTF-8 text "<name>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | name               |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | trout              |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | a longer name here |

  Scenario Outline: Memo Name - 2 the 77-byte limit counts bytes, not characters
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the name is <length> multibyte characters long
    When the memo-name command runs
    Then broadcast push 2 has <bytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | length | bytes |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | 38     | 76    |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | 5      | 10    |

  Scenario Outline: Memo Name - 3 a name longer than 77 bytes is a usage error
    Given a signing wallet that records broadcasts
    And the name is <length> multibyte characters long
    When the memo-name command runs
    Then the memo-name command reported the usage error "Name is too long. Maximum is 77 bytes."
    And the wallet did not broadcast

    Examples:
      | length |
      | 39     |
      | 100    |

  Scenario: Memo Name - 4 a missing name is a usage error
    Given a signing wallet that records broadcasts
    Given no name is given
    When the memo-name command runs
    Then the memo-name command reported the usage error "You must specify a name with the -m flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Name - 5 an empty name is a usage error
    Given a signing wallet that records broadcasts
    And the name is "<name>"
    When the memo-name command runs
    Then the memo-name command reported the usage error "Name must not be empty."
    And the wallet did not broadcast

    Examples:
      | name |
      |      |

  Scenario: Memo Name - 6 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the name is "trout"
    When the memo-name command runs
    Then the memo-name command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Name - 7 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the name is "trout"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-name command runs
    Then the memo-name command reported the error "Failed to broadcast: <error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
