# mutation-stamp: sha256=44dcefb46c7eea5ee1dc75123375996606d3dbc50341b1ea8c7f58e6b8b675ba
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T00:41:48.071719683Z","feature_name":"Poll Read","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/poll-read.feature","background_hash":"bbf9fc6b796218c8b0b26ac54761d2c3c3ba2c5d3e072f1656869a4ef0e37bef","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Poll Read - 1 the poll endpoint returns the poll with its question, options, and votes","scenario_hash":"66e706477b03825fa38975fb9c0bc06e2e9c5ba94298422d728e3980f0aea444","mutation_count":5,"result":{"Total":5,"Killed":5,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.071719683Z"},{"index":1,"name":"Poll Read - 2 the options endpoint returns the poll's options","scenario_hash":"883550e26e7aa9163d5a0eed635378489cd8dd86c8d08e5026ea28b346446467","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.071719683Z"},{"index":2,"name":"Poll Read - 3 the votes endpoint returns the poll's votes","scenario_hash":"8ab121a13c0e8fb344725981e75ce410701ee713d36b33cce6d95a3ad66ae555","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-08-29T00:41:48.071719683Z"}]}
# acceptance-mutation-manifest-end

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
