# Scenarios: Poll Option - 1, Poll Option - 2, Poll Option - 3, Poll Option - 4
#
# The add-option composer broadcasts a Memo add-poll-option action (0x6d13).
# The payload is the poll's 32-byte txid followed by the option text. The
# option text is limited to 184 bytes. The composer counts bytes (not
# characters) so the remaining count reflects the option text.
Feature: Poll Option

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given a poll with the txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario Outline: Poll Option - 1 a valid option is broadcast for the poll
    When I open the poll with txid <txid>
    When I compose an option with the text "<option>"
    When I submit the option
    Then the app broadcasts an OP_RETURN transaction with the Memo add-poll-option prefix for the poll <txid>
    Then the poll shows the new option with the text "<option>"

    Examples:
      | txid | option |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | definitely |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | a valid option with several words and punctuation. |

  Scenario Outline: Poll Option - 2 an empty option is rejected
    When I open the poll with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I compose an option with the text "<option>"
    When I submit the option
    Then the add-option composer shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | option |
      |  |

  Scenario Outline: Poll Option - 3 an over-long option is rejected
    When I open the poll with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I compose an option with the text "<option>"
    When I submit the option
    Then the add-option composer shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | option |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: Poll Option - 4 the byte counter counts down from the option limit
    When I open the poll with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I compose an option with the text "<option>"
    Then the add-option composer shows a remaining byte count of <count>

    Examples:
      | option | count |
      |  | 184 |
      | yes | 181 |
      | é | 182 |
