# Scenarios: Topic Post - 1, Topic Post - 2, Topic Post - 3, Topic Post - 4
#
# The topic feed page has a composer that broadcasts a Memo topic message
# (0x6d0c). The payload is the topic name plus the message, with a combined
# limit of 214 bytes. The composer counts bytes (not characters) so the
# remaining count reflects the topic name plus the typed message.
Feature: Topic Post

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Topic Post - 1 a valid topic message is broadcast and shown in the topic feed
    Given I open the topic feed for the topic <topic>
    When I compose a topic message with the text "<message>"
    When I submit the topic message
    Then the app broadcasts an OP_RETURN transaction with the Memo topic-message prefix for the topic <topic>
    Then the topic feed shows a new post from my address with the text "<message>"

    Examples:
      | topic | message |
      | bitcoin | hello bitcoin |
      | cash | a longer topic message with several words and punctuation. |
      | bitcoin | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: Topic Post - 2 an empty topic message is rejected
    Given I open the topic feed for the topic <topic>
    When I compose a topic message with the text "<message>"
    When I submit the topic message
    Then the topic post composer shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | topic | message |
      | bitcoin |  |

  Scenario Outline: Topic Post - 3 an over-long topic message is rejected
    Given I open the topic feed for the topic <topic>
    When I compose a topic message with the text "<message>"
    When I submit the topic message
    Then the topic post composer shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | topic | message |
      | bitcoin | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: Topic Post - 4 the byte counter counts down from the combined topic limit
    Given I open the topic feed for the topic <topic>
    When I compose a topic message with the text "<message>"
    Then the topic post composer shows a remaining byte count of <count>

    Examples:
      | topic | message | count |
      | bitcoin |  | 207 |
      | bitcoin | hello | 202 |
      | bitcoin | é | 205 |
