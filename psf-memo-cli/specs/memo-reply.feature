# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T18:28:57.894688892Z","feature_name":"Memo Reply","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-reply.feature","background_hash":"c74a000bdde11145be943809e45231351c50bfd5b3290cbb71994ad056ddf26f","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Memo Reply - 5 an empty reply is a usage error","scenario_hash":"505ecf367957f6e2fd747a03491eebab18b78cd6c47892d6f5e1a9b9f8d86c75","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-07T18:28:57.894688892Z"}]}
# acceptance-mutation-manifest-end

# Memo Reply (W2): the psf-memo-cli reply write command. It resolves the signing
# wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source), requires the
# parent post txid (-t), validates the reply text against the 0x6d03 protocol
# limit of 184 UTF-8 bytes, broadcasts the two-field Memo action
# [6d03, parent txid (32 LE), text] through the shared F3 multi-push
# scaffolding, and reports the transaction id plus its bch.loping.net explorer
# link. The parent txid is embedded in little-endian wire order (gotcha #32). A
# missing or malformed flag is a usage error (exit 2) with no broadcast; a
# rejected broadcast surfaces the wallet's real error (exit 1). The command
# adopts the shared F5 output contract, so --json prints one JSON object.
#
# Scenarios: Memo Reply - 1, Memo Reply - 2, Memo Reply - 3, Memo Reply - 4, Memo Reply - 5, Memo Reply - 6, Memo Reply - 7, Memo Reply - 8, Memo Reply - 9
Feature: Memo Reply

  Background:
    Given a Memo reply command

  Scenario Outline: Memo Reply - 1 a valid reply is broadcast with the Memo reply prefix
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the parent post txid is "<parent>"
    And the reply text is "<text>"
    When the memo-reply command runs
    Then the broadcast has 3 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d03"
    And broadcast push 2 is the referenced txid "<parent>" in little-endian wire order
    And broadcast push 3 is the UTF-8 text "<text>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | parent                                                           | text                                |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | hello reply                         |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | a longer reply with several words. |

  Scenario Outline: Memo Reply - 2 the 184-byte limit counts bytes, not characters
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the reply text is <length> multibyte characters long
    When the memo-reply command runs
    Then broadcast push 3 has <bytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | length | bytes |
      | 89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567 | 92     | 184   |
      | 76543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98 | 5      | 10    |

  Scenario Outline: Memo Reply - 3 a reply longer than 184 bytes is a usage error
    Given a signing wallet that records broadcasts
    And the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the reply text is <length> multibyte characters long
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "Reply is too long. Maximum is 184 bytes."
    And the wallet did not broadcast

    Examples:
      | length |
      | 93     |
      | 200    |

  Scenario: Memo Reply - 4 a missing reply is a usage error
    Given a signing wallet that records broadcasts
    Given the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    Given no reply text is given
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "You must specify reply text with the -m flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Reply - 5 an empty reply is a usage error
    Given a signing wallet that records broadcasts
    And the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the reply text is "<text>"
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "Reply must not be empty."
    And the wallet did not broadcast

    Examples:
      | text |
      |      |

  Scenario: Memo Reply - 6 a missing parent txid is a usage error
    Given a signing wallet that records broadcasts
    Given no parent txid is given
    Given the reply text is "hello memo"
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "You must specify a post txid with the -t flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Reply - 7 a malformed parent txid is a usage error
    Given a signing wallet that records broadcasts
    And the parent post txid is "<parent>"
    And the reply text is "hello memo"
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "<error>"
    And the wallet did not broadcast

    Examples:
      | parent                                                           | error                                    |
      | 1234                                                             | Txid must be a 64-character hex string.  |
      | zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz | Txid must be a valid hex string.         |

  Scenario: Memo Reply - 8 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    Given the reply text is "hello memo"
    When the memo-reply command runs
    Then the memo-reply command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Reply - 9 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the parent post txid is "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    And the reply text is "hello memo"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-reply command runs
    Then the memo-reply command reported the error "<error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
