# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T00:47:08.117619576Z","feature_name":"Memo Broadcast","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-broadcast.feature","background_hash":"52c78008f684fe9b0041a82a948c1e03ed825b104747bada15d557cb9f48fbbe","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Memo Broadcast - 1, Memo Broadcast - 2, Memo Broadcast - 3, Memo Broadcast - 4, Memo Broadcast - 5
#
# F2b/F3: the shared broadcast scaffolding every memo-* write command uses. It
# takes an ordered list of protocol fields, calls the wallet's public
# sendOpReturn(msg, prefix, bchOutput), and returns the transaction id. A single
# field is sent as one payload push; multiple fields are expanded into one push
# per field, because minimal-slp-wallet's sendOpReturn hardcodes [prefix, msg]
# and would otherwise flatten a multi-field action (gotcha #35). On success the
# command reports the txid and a bch.loping.net explorer link.
Feature: Memo Broadcast

  Background:
    Given a wallet that records broadcasts
    And the wallet has spendable output

  Scenario Outline: Memo Broadcast - 1 a single-field action broadcasts the prefix and one payload push
    Given the Memo action prefix is "<prefix>"
    And the action has one field with the UTF-8 text "<text>"
    When the command broadcasts the Memo action
    Then the broadcast has 2 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "<prefix>"
    And broadcast push 2 is the UTF-8 text "<text>"

    Examples:
      | prefix | text            |
      | 6d02   | hello memo      |
      | 6d05   | my profile text |

  Scenario Outline: Memo Broadcast - 2 a txid-referencing action broadcasts each field as its own push
    Given the Memo action prefix is "<prefix>"
    And the action has the referenced txid "<txid>" as its first field
    And the action has the UTF-8 text "<text>" as its second field
    When the command broadcasts the Memo action
    Then the broadcast has 3 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "<prefix>"
    And broadcast push 2 is the referenced txid "<txid>" in little-endian wire order
    And broadcast push 3 is the UTF-8 text "<text>"

    Examples:
      | prefix | txid                                                             | text        |
      | 6d03   | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | hello reply |
      | 6d13   | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff | an option   |

  Scenario Outline: Memo Broadcast - 3 a create-poll action broadcasts each field as its own push
    Given the Memo action prefix is "<prefix>"
    And the action has the poll type <poll_type> as its first field
    And the action has the option count <option_count> as its second field
    And the action has the UTF-8 question "<question>" as its third field
    When the command broadcasts the Memo action
    Then the broadcast has 4 OP_RETURN pushes
    And broadcast push 1 is the Memo prefix "<prefix>"
    And broadcast push 2 is the poll type <poll_type>
    And broadcast push 3 is the option count <option_count>
    And broadcast push 4 is the UTF-8 question "<question>"

    Examples:
      | prefix | poll_type | option_count | question         |
      | 6d10   | 1         | 2            | which is better? |
      | 6d10   | 1         | 3            | what next?       |

  Scenario Outline: Memo Broadcast - 4 a successful broadcast reports the transaction id and explorer link
    Given the wallet returns the transaction id "<txid>"
    When the command broadcasts the Memo action and reports the result
    Then the reported transaction id is "<txid>"
    And the reported explorer link is "https://bch.loping.net/tx/<txid>"

    Examples:
      | txid                                                             |
      | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef |
      | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff |

  Scenario Outline: Memo Broadcast - 5 a rejected broadcast reports the wallet's error
    Given the wallet rejects the broadcast with the error "<error>"
    When the command broadcasts the Memo action and reports the result
    Then the reported error is "<error>"

    Examples:
      | error               |
      | insufficient funds  |
      | transaction rejected |
