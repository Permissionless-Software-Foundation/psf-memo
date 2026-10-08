# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T02:24:23.766121320Z","feature_name":"Memo Unmute","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-unmute.feature","background_hash":"35c4ea603d2b58c428035b5901811cf776d16c40988442c410418771fefb04fd","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Memo Unmute (W8b): the psf-memo-cli unmute write command. It resolves the
# signing wallet (-n <wallet> or --wif <wif>, shared F2 wallet-source), requires
# the mutee cash address (-a), converts it to its 20-byte hash160 in display
# order -- and NOT byte-reversed (gotcha #32; the shared F4 addressToHash160
# helper) -- broadcasts the single-field Memo action [6d17, hash160] through the
# shared F3 broadcast scaffolding, and reports the transaction id plus its
# bch.loping.net explorer link. A missing or malformed address is a usage error
# (exit 2) with no broadcast; a rejected broadcast surfaces the wallet's real
# error (exit 1). Persistence depends on the psf-memo-db `mute` entity route
# (gotcha #60). Adopts the shared F5 output contract, so --json prints one JSON
# object.
#
# Scenarios: Memo Unmute - 1, Memo Unmute - 2, Memo Unmute - 3, Memo Unmute - 4, Memo Unmute - 5
Feature: Memo Unmute

  Background:
    Given a Memo unmute command

  Scenario Outline: Memo Unmute - 1 a valid unmute broadcasts the unmute prefix and the mutee hash160
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the target address is "<addr>"
    When the memo-unmute command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d17"
    And broadcast push 2 is the hash160 "<hash160>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | addr                                                   | hash160                                  |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | 3e31055173cf58d56edb075499daf29d7b488f09 |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | cb481232299cd5743151ac4b2d63ae198e7bb0a9 |

  Scenario: Memo Unmute - 2 a missing mutee address is a usage error
    Given a signing wallet that records broadcasts
    Given no target address is given
    When the memo-unmute command runs
    Then the memo-unmute command reported the usage error "You must specify a mutee address with the -a flag."
    And the wallet did not broadcast

  Scenario: Memo Unmute - 3 a malformed mutee address is a usage error
    Given a signing wallet that records broadcasts
    And the target address is "not-an-address"
    When the memo-unmute command runs
    Then the memo-unmute command reported the usage error "Address must be a valid cash address."
    And the wallet did not broadcast

  Scenario: Memo Unmute - 4 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the target address is "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    When the memo-unmute command runs
    Then the memo-unmute command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Unmute - 5 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the target address is "bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-unmute command runs
    Then the memo-unmute command reported the error "<error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
