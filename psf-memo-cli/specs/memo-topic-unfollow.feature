# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T03:34:52.710089961Z","feature_name":"Memo Topic Unfollow","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-topic-unfollow.feature","background_hash":"2196b933ac45ba76e864d3959a495973a9339a2322baa299f12f9a341b059f57","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Memo Topic Unfollow (W10b): the psf-memo-cli topic-unfollow write command. It
# resolves the signing wallet (-n <wallet> or --wif <wif>, shared F2
# wallet-source), requires the topic room (-r), broadcasts the two-push Memo
# action [6d0e, room] through the shared F3 broadcast scaffolding, and reports
# the transaction id plus its bch.loping.net explorer link. The room is plain
# UTF-8 text (no cashaddr conversion). A missing room is a usage error (exit 2)
# with no broadcast; a rejected broadcast surfaces the wallet's real error
# (exit 1). Adopts the shared F5 output contract, so --json prints one JSON
# object.
#
# Scenarios: Memo Topic Unfollow - 1, Memo Topic Unfollow - 2, Memo Topic Unfollow - 3, Memo Topic Unfollow - 4
Feature: Memo Topic Unfollow

  Background:
    Given a Memo topic unfollow command

  Scenario Outline: Memo Topic Unfollow - 1 a valid topic unfollow broadcasts the unfollow prefix and the room
    Given a signing wallet that records broadcasts
    And the signing wallet returns the transaction id "<txid>"
    And the topic room is "<room>"
    When the memo-topic-unfollow command runs
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "6d0e"
    And broadcast push 2 is the UTF-8 text "<room>"
    And the command reported the transaction id "<txid>"
    And the command reported the explorer link "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             | room    |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | general |
      | fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 | memo    |

  Scenario: Memo Topic Unfollow - 2 a missing room is a usage error
    Given a signing wallet that records broadcasts
    Given no topic room is given
    When the memo-topic-unfollow command runs
    Then the memo-topic-unfollow command reported the usage error "You must specify a topic room with the -r flag."
    And the wallet did not broadcast

  Scenario: Memo Topic Unfollow - 3 a missing wallet source is a usage error
    Given no signing wallet is selected
    Given the topic room is "general"
    When the memo-topic-unfollow command runs
    Then the memo-topic-unfollow command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Topic Unfollow - 4 a rejected broadcast reports the wallet's real error
    Given a signing wallet that records broadcasts
    And the topic room is "general"
    And the signing wallet rejects the broadcast with the error "<error>"
    When the memo-topic-unfollow command runs
    Then the memo-topic-unfollow command reported the error "Failed to broadcast: <error>"

    Examples:
      | error                |
      | insufficient funds   |
      | transaction rejected |
