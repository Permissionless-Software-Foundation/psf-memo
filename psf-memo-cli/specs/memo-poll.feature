# mutation-stamp: sha256=c5c54d7024ad0194b65a5336e96c943cd77391a89646de4d3df028b079d47c12
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T01:41:55.469687122Z","feature_name":"Memo Poll","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-poll.feature","background_hash":"e5b0bec85da2db1b65fc84c117ad1d53d6ead431a33cb711891c8e185eb4d8e0","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Memo Poll - 2 the command reads the poll and reports its question","scenario_hash":"7a7a547d7938f7eadac41bda0911a52aa7fc716feb2ff04070dae602bd149720","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-08T01:41:55.469687122Z"},{"index":2,"name":"Memo Poll - 3 the command reports each option's text and author","scenario_hash":"8868994f872f62fc7b6faaa2a46ae5af4e8a3419b7ee4d94e22a16439ee4e707","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-08T01:41:55.469687122Z"},{"index":3,"name":"Memo Poll - 4 the command reports each vote's comment and voter","scenario_hash":"92ae959a5616447274b0be2e87e8c0c9e1aad33ead80127e03bd22bea4bc76d6","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-08T01:41:55.469687122Z"}]}
# acceptance-mutation-manifest-end

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
