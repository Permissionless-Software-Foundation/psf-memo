# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T00:37:55.277305747Z","feature_name":"Poll Vote","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/poll-vote.feature","background_hash":"9d8ea293796e711d8de8ea019377a9ade22ab7cb963aeef565a8d1a5ee447119","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Poll Vote - 2 an empty comment is rejected","scenario_hash":"31d59bfcd52104756d65afbc7a76928752bdd662fc414a889e94a3b24d8be577","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:37:55.277305747Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Poll Vote - 1, Poll Vote - 2, Poll Vote - 3
#
# The vote composer broadcasts a Memo poll-vote action (0x6d14). The payload
# is the poll's 32-byte txid followed by a comment. The comment is limited to
# 184 bytes.
Feature: Poll Vote

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given a poll with the txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario Outline: Poll Vote - 1 a valid vote is broadcast for the poll
    When I open the poll with txid <txid>
    When I vote with the comment "<comment>"
    When I submit the vote
    Then the app broadcasts an OP_RETURN transaction with the Memo poll-vote prefix for the poll <txid>
    Then the poll shows my vote with the comment "<comment>"

    Examples:
      | txid | comment |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | I choose this one |

  Scenario Outline: Poll Vote - 2 an empty comment is rejected
    When I open the poll with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I vote with the comment "<comment>"
    When I submit the vote
    Then the vote composer shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | comment |
      |  |

  Scenario Outline: Poll Vote - 3 an over-long comment is rejected
    When I open the poll with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I vote with the comment "<comment>"
    When I submit the vote
    Then the vote composer shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | comment |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
