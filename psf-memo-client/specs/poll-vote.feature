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
