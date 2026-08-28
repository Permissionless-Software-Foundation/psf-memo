# Scenarios: Poll Read - 1, Poll Read - 2, Poll Read - 3
#
# The psf-memo-db REST API exposes the read side of Memo polls:
#   - GET /polls/:txid returns the poll with its question, options, and votes
#   - GET /polls/:txid/options returns the poll's options
#   - GET /polls/:txid/votes returns the poll's votes
Feature: Poll Read

  Background:
    Given the psf-memo-db API serves a poll with the txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa with the question "which is better?"
    Given the psf-memo-db API serves the option "yes" for the poll aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Given the psf-memo-db API serves the option "no" for the poll aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Given the psf-memo-db API serves a vote with the comment "yes" for the poll aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario Outline: Poll Read - 1 the poll endpoint returns the poll with its question, options, and votes
    When I request the poll with txid <txid>
    Then the response shows the question "<question>"
    Then the response shows the options "<option1>" and "<option2>"
    Then the response shows <vote_count> vote

    Examples:
      | txid | question | option1 | option2 | vote_count |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | which is better? | yes | no | 1 |

  Scenario Outline: Poll Read - 2 the options endpoint returns the poll's options
    When I request the options for the poll with txid <txid>
    Then the response shows the options "<option1>" and "<option2>"

    Examples:
      | txid | option1 | option2 |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes | no |

  Scenario Outline: Poll Read - 3 the votes endpoint returns the poll's votes
    When I request the votes for the poll with txid <txid>
    Then the response shows <vote_count> vote with the comment "<comment>"

    Examples:
      | txid | comment | vote_count |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | yes | 1 |
