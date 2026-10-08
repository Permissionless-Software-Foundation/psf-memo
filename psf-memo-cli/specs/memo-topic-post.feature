# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T03:34:52.277118736Z","feature_name":"Memo Topic Post","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-topic-post.feature","background_hash":"8de8c7153486300acfd5e553c81b91f77b1d11930634fbc878223a93c032e07e","implementation_hash":"unknown","scenarios":[{"index":5,"name":"Memo Topic Post - 6 an empty message is a usage error","scenario_hash":"bb2cf24e08a05ff572f707c9a74fcae8e2720748ebb25702b3e653a2cac98fcc","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-08T02:38:11.264202830Z"}]}
# acceptance-mutation-manifest-end

# Memo Topic Post (W9): the psf-memo-cli topic-message write command. It resolves
# the signing wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source),
# requires the topic room (-r) and the message text (-m), validates that the
# room plus message is at most the 0x6d0c protocol limit of 214 UTF-8 bytes
# (bytes, not characters; gotcha #7), broadcasts the multi-field Memo action
# [6d0c, room, message] through the shared F3 multi-push scaffolding (gotcha
# #35), and reports the transaction id plus its bch.loping.net explorer link. A
# missing or invalid flag is a usage error (exit 2) with no broadcast; a
# rejected broadcast surfaces the wallet's real error (exit 1). Adopts the
# shared F5 output contract, so --json prints one JSON object.
#
# Scenarios: Memo Topic Post - 1, Memo Topic Post - 2, Memo Topic Post - 3, Memo Topic Post - 4, Memo Topic Post - 5, Memo Topic Post - 6, Memo Topic Post - 7, Memo Topic Post - 8
Feature: Memo Topic Post

  Background:
    Given a Memo topic post command

  Scenario Outline: Memo Topic Post - 1 a valid topic message broadcasts the prefix, room, and message
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the topic room is "<room>"
    And the topic message is "<message>"
    When the memo-topic-post command runs
    Then the broadcast has 3 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d0c"
    And broadcast push 2 is the UTF-8 text "<room>"
    And broadcast push 3 is the UTF-8 text "<message>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | room    | message                                    |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | general | hello topic                                |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | memo    | a longer topic message with several words. |

  Scenario Outline: Memo Topic Post - 2 the 214-byte combined limit counts room and message bytes, not characters
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the topic room is "<room>"
    And the topic message is <length> multibyte characters long
    When the memo-topic-post command runs
    Then broadcast push 2 has <roomBytes> bytes
    And broadcast push 3 has <messageBytes> bytes
    And the command reported the transaction id "<txid>"

    Examples:
      | txid                                                             | room    | length | roomBytes | messageBytes |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | general | 103    | 7         | 206          |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | memo    | 105    | 4         | 210          |

  Scenario Outline: Memo Topic Post - 3 a room plus message over 214 bytes is a usage error
    Given a signing wallet that records broadcasts
    And the topic room is "general"
    And the topic message is <length> multibyte characters long
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the usage error "Topic message is too long. Maximum is 214 bytes."
    And the wallet did not broadcast

    Examples:
      | length |
      | 104    |
      | 200    |

  Scenario: Memo Topic Post - 4 a missing room is a usage error
    Given a signing wallet that records broadcasts
    Given no topic room is given
    Given the topic message is "hello topic"
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the usage error "You must specify a topic room with the -r flag."
    And the wallet did not broadcast

  Scenario: Memo Topic Post - 5 a missing message is a usage error
    Given a signing wallet that records broadcasts
    Given the topic room is "general"
    Given no topic message is given
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the usage error "You must specify topic message text with the -m flag."
    And the wallet did not broadcast

  Scenario Outline: Memo Topic Post - 6 an empty message is a usage error
    Given a signing wallet that records broadcasts
    And the topic room is "general"
    And the topic message is "<message>"
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the usage error "Topic message must not be empty."
    And the wallet did not broadcast

    Examples:
      | message |
      |         |

  Scenario: Memo Topic Post - 7 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the topic room is "general"
    Given the topic message is "hello topic"
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Topic Post - 8 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the topic room is "general"
    And the topic message is "hello topic"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-topic-post command runs
    Then the memo-topic-post command reported the error "Failed to broadcast: <error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
