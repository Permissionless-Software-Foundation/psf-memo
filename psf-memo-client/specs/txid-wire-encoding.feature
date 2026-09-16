# Scenarios: Txid wire encoding - 1, Txid wire encoding - 2, Txid wire encoding - 3, Txid wire encoding - 4
#
# Memo actions that reference a parent transaction embed that txid as 32 raw
# bytes. The wire order is little-endian: the reverse of the 64-character
# display txid. The indexer reverses those bytes back into the display txid so
# the referenced post, reply, or poll can be found. This feature pins the wire
# byte order for every client action that references a parent txid: like,
# reply, poll option, and poll vote.
Feature: Txid wire encoding

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Txid wire encoding - 1 a like broadcasts the post txid in little-endian wire order
    Given a post with the txid <txid> authored by the author address
    When I click the heart icon on the post with txid <txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>

    Examples:
      | txid                                                             |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff |

  Scenario Outline: Txid wire encoding - 2 a reply broadcasts the parent txid in little-endian wire order
    Given I open the thread for the post with txid <txid>
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix

    Examples:
      | txid                                                             | message      |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | hello memo   |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | a second one |

  Scenario Outline: Txid wire encoding - 3 a poll option broadcasts the poll txid in little-endian wire order
    Given a poll with the txid <txid>
    When I open the poll with txid <txid>
    When I compose an option with the text "<option>"
    When I submit the option
    Then the app broadcasts an OP_RETURN transaction with the Memo add-poll-option prefix for the poll <txid>

    Examples:
      | txid                                                             | option |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | yes    |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | no     |

  Scenario Outline: Txid wire encoding - 4 a poll vote broadcasts the poll txid in little-endian wire order
    Given a poll with the txid <txid>
    When I open the poll with txid <txid>
    When I vote with the comment "<comment>"
    When I submit the vote
    Then the app broadcasts an OP_RETURN transaction with the Memo poll-vote prefix for the poll <txid>

    Examples:
      | txid                                                             | comment       |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | yes           |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | I choose this |
