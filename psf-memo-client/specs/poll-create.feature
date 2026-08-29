# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T00:37:49.079587425Z","feature_name":"Poll Create","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/poll-create.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Poll Create - 2 an empty question is rejected","scenario_hash":"5a79d6ea8c9094ac2604abc469208209595bed749d9ca791a61084a8095ae5cd","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:37:04.929072464Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Poll Create - 1, Poll Create - 2, Poll Create - 3, Poll Create - 4
#
# The poll composer broadcasts a Memo create-poll action (0x6d10). The
# payload is a poll_type byte, an option_count byte, and the question text.
# The question is limited to 209 bytes. The composer counts bytes (not
# characters) so the remaining count reflects the question text. Options are
# added by separate add-poll-option actions (0x6d13).
Feature: Poll Create

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Poll Create - 1 a valid poll is broadcast with the question and option count
    When I compose a poll with the question "<question>" and <option_count> options
    When I submit the poll
    Then the app broadcasts an OP_RETURN transaction with the Memo create-poll prefix for the question "<question>"
    Then the app broadcasts an OP_RETURN transaction with the Memo create-poll prefix carrying <option_count> options

    Examples:
      | question | option_count |
      | which is better? | 2 |
      | what should we build next? | 3 |
      | a valid question with several words and punctuation. | 2 |

  Scenario Outline: Poll Create - 2 an empty question is rejected
    When I compose a poll with the question "<question>" and 2 options
    When I submit the poll
    Then the poll composer shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | question |
      |  |

  Scenario Outline: Poll Create - 3 an over-long question is rejected
    When I compose a poll with the question "<question>" and 2 options
    When I submit the poll
    Then the poll composer shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | question |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: Poll Create - 4 the byte counter counts down from the question limit
    When I compose a poll with the question "<question>" and 2 options
    Then the poll composer shows a remaining byte count of <count>

    Examples:
      | question | count |
      |  | 209 |
      | hello | 204 |
      | é | 207 |
