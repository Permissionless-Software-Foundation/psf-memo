# Memo Avatar (W6): the psf-memo-cli set-profile-picture write command. It
# resolves the signing wallet (-n <wallet> or --wif <wif>, shared F2
# wallet-source), validates the avatar URL from the -u flag against the 0x6d0a
# protocol limit of 217 UTF-8 bytes (not characters; gotcha #7), broadcasts the
# single-field Memo action [6d0a, url] through the shared F3 broadcast
# scaffolding, and reports the transaction id plus its bch.loping.net explorer
# link. A missing or invalid flag is a usage error (exit 2) with no broadcast; a
# rejected broadcast surfaces the wallet's real error (exit 1). Adopts the
# shared F5 output contract, so --json prints one JSON object to stdout. Unlike
# the -m profile-text commands, the value comes from the -u flag.
#
# Scenarios: Memo Avatar - 1, Memo Avatar - 2, Memo Avatar - 3, Memo Avatar - 4, Memo Avatar - 5, Memo Avatar - 6, Memo Avatar - 7
Feature: Memo Avatar

  Background:
    Given a Memo avatar command

  Scenario Outline: Memo Avatar - 1 a valid avatar URL is broadcast with the Memo set-profile-picture prefix
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the avatar URL is "<url>"
    When the memo-avatar command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d0a"
    And broadcast push 2 is the UTF-8 text "<url>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | url                                   |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | https://example.com/avatar.png        |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | https://cdn.example.com/pics/me.jpg   |

  Scenario Outline: Memo Avatar - 2 the 217-byte limit counts bytes, not characters
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the avatar URL is <length> multibyte characters long
    When the memo-avatar command runs
    Then broadcast push 2 has <bytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | length | bytes |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | 108    | 216   |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | 5      | 10    |

  Scenario Outline: Memo Avatar - 3 an avatar URL longer than 217 bytes is a usage error
    Given a signing wallet that records broadcasts
    And the avatar URL is <length> multibyte characters long
    When the memo-avatar command runs
    Then the memo-avatar command reported the usage error "Avatar URL is too long. Maximum is 217 bytes."
    And the wallet did not broadcast

    Examples:
      | length |
      | 109    |
      | 150    |

  Scenario: Memo Avatar - 4 a missing avatar URL is a usage error
    Given a signing wallet that records broadcasts
    Given no avatar URL is given
    When the memo-avatar command runs
    Then the memo-avatar command reported the usage error "You must specify an avatar URL with the -u flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Avatar - 5 an empty avatar URL is a usage error
    Given a signing wallet that records broadcasts
    And the avatar URL is "<url>"
    When the memo-avatar command runs
    Then the memo-avatar command reported the usage error "Avatar URL must not be empty."
    And the wallet did not broadcast

    Examples:
      | url |
      |     |

  Scenario: Memo Avatar - 6 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the avatar URL is "https://example.com/avatar.png"
    When the memo-avatar command runs
    Then the memo-avatar command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Avatar - 7 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the avatar URL is "https://example.com/avatar.png"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-avatar command runs
    Then the memo-avatar command reported the error "<error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
