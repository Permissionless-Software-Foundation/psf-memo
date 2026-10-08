# Memo Poll (R13): the psf-memo-cli read command for a single Memo poll. The
# poll is identified by its transaction id via the required -t flag. It reads
# GET /polls/:txid, which returns the poll together with its options and votes,
# and reports the question, the options (each option's text and author address),
# and the current votes (each vote's comment and voter address). A txid with no
# poll is reported as a not-found failure (exit 1). Read-only: no wallet, no
# broadcast. Adopts the shared F5 output contract, so --json prints one JSON
# object to stdout. The poll write commands (W11-W13) are not yet specified.
#
# Scenarios: Memo Poll - 1, Memo Poll - 2, Memo Poll - 3, Memo Poll - 4, Memo Poll - 5, Memo Poll - 6
Feature: Memo Poll

  Background:
    Given the Memo DB service serves the polls

  Scenario: Memo Poll - 1 a missing txid flag is a usage error
    When the memo-poll command runs without a txid
    Then the memo-poll command reported the usage error "You must specify a post txid with the -t flag."

  Scenario Outline: Memo Poll - 2 the command reads the poll and reports its question
    When the memo-poll command runs for "<txid>"
    Then the service received a poll request for "<txid>"
    And the command reported the poll question "<question>"

    Examples:
      | txid   | question         |
      | poll-a | which is better? |
      | poll-b | tea or coffee?   |

  Scenario Outline: Memo Poll - 3 the command reports each option's text and author
    When the memo-poll command runs for "poll-a"
    Then the command reported the option "<option>" from "<addr>"

    Examples:
      | option | addr             |
      | yes    | bitcoincash:qyes |
      | no     | bitcoincash:qno  |

  Scenario Outline: Memo Poll - 4 the command reports each vote's comment and voter
    When the memo-poll command runs for "poll-a"
    Then the command reported the vote from "<addr>" with comment "<comment>"

    Examples:
      | addr                | comment |
      | bitcoincash:qvoter1 | yes     |
      | bitcoincash:qvoter2 | no      |

  Scenario: Memo Poll - 5 a txid with no poll reports not found
    Given the Memo DB service has no poll for "poll-missing"
    When the memo-poll command runs for "poll-missing"
    Then the memo-poll command reported not found

  Scenario: Memo Poll - 6 a failed request reports the error
    Given the Memo DB service fails the poll request
    When the memo-poll command runs for "poll-a"
    Then the memo-poll command reported an error
