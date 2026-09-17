# Scenarios: Memo multi-push encoding - 1, Memo multi-push encoding - 2, Memo multi-push encoding - 3, Memo multi-push encoding - 4, Memo multi-push encoding - 5
#
# Memo actions that carry more than one field encode each protocol field as
# its own OP_RETURN script push. The first push is the two-byte action prefix
# and the remaining pushes are the fields in protocol order. Referenced
# transaction ids are 32 raw bytes in little-endian wire order (the reverse of
# the 64-character display txid). A multi-field action written as a single
# combined push is not valid Memo: the indexer rejects it and memo.cash does
# not display it.
Feature: Memo multi-push encoding

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Memo multi-push encoding - 1 a reply broadcasts the parent txid and text as separate OP_RETURN pushes
    Given I open the thread for the post with txid <txid>
    When I type a reply with the text "<text>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN with the Memo reply prefix and 3 pushes
    Then the second broadcast push is the referenced txid <txid> in little-endian wire order
    Then the third broadcast push is the UTF-8 text "<text>"

    Examples:
      | txid                                                             | text   |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | hello memo |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | a second reply |

  Scenario Outline: Memo multi-push encoding - 2 a topic message broadcasts the topic and text as separate OP_RETURN pushes
    Given I open the topic feed for the topic <topic>
    When I compose a topic message with the text "<text>"
    When I submit the topic message
    Then the wallet broadcasts an OP_RETURN with the Memo topic-message prefix and 3 pushes
    Then the second broadcast push is the UTF-8 topic "<topic>"
    Then the third broadcast push is the UTF-8 text "<text>"

    Examples:
      | topic   | text                                                       |
      | bitcoin | hello bitcoin                                              |
      | cash    | a longer topic message with several words and punctuation. |

  Scenario Outline: Memo multi-push encoding - 3 an add-poll-option broadcasts the poll txid and text as separate OP_RETURN pushes
    Given a poll with the txid <txid>
    When I open the poll with txid <txid>
    When I compose an option with the text "<text>"
    When I submit the option
    Then the wallet broadcasts an OP_RETURN with the Memo add-poll-option prefix and 3 pushes
    Then the second broadcast push is the referenced txid <txid> in little-endian wire order
    Then the third broadcast push is the UTF-8 text "<text>"

    Examples:
      | txid                                                             | text       |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | yes        |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | definitely |

  Scenario Outline: Memo multi-push encoding - 4 a poll vote broadcasts the poll txid and text as separate OP_RETURN pushes
    Given a poll with the txid <txid>
    When I open the poll with txid <txid>
    When I vote with the comment "<text>"
    When I submit the vote
    Then the wallet broadcasts an OP_RETURN with the Memo poll-vote prefix and 3 pushes
    Then the second broadcast push is the referenced txid <txid> in little-endian wire order
    Then the third broadcast push is the UTF-8 text "<text>"

    Examples:
      | txid                                                             | text          |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | yes           |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | I choose this |

  Scenario Outline: Memo multi-push encoding - 5 a create-poll broadcasts the poll type, option count, and question as separate OP_RETURN pushes
    When I compose a poll with the question "<question>" and <option_count> options
    When I submit the poll
    Then the wallet broadcasts an OP_RETURN with the Memo create-poll prefix and 4 pushes
    Then the second broadcast push is the poll type 1
    Then the third broadcast push is the option count <option_count>
    Then the fourth broadcast push is the UTF-8 question "<question>"

    Examples:
      | question                   | option_count |
      | which is better?           | 2            |
      | what should we build next? | 3            |
