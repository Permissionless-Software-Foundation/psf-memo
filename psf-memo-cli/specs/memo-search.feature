# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T00:28:02.246819219Z","feature_name":"Memo Search","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-search.feature","background_hash":"d03eb672603848efda577c102f44188ff9fba3c6cb58fa078af96a89e5dfe937","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Memo Search - 3 the command returns the requested page","scenario_hash":"30ddf40cb001f294288734bd254ff2e786a6503723dc6f53439d559c5fb21080","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-08T00:28:02.246819219Z"},{"index":4,"name":"Memo Search - 5 each reported result keeps its service fields","scenario_hash":"444ec66ae8a59c6891d2c9d08160c07220fda6b07562ceae3831eac83b92c2bc","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-08T00:28:02.246819219Z"}]}
# acceptance-mutation-manifest-end

# Memo Search (R9): the psf-memo-cli full-text search read command. It reads one
# page of GET /search -- a case-insensitive substring match over top-level post
# text and profile name/bio -- and reports the matching posts and profiles with
# the service pagination unchanged (limit, offset, total, hasMore; X6). The
# query comes from the required -q flag; an optional --viewer address scopes the
# posts to the viewer's mute filter (profiles are not mute-filtered). A missing
# -q is a usage error (exit 2); a provided but blank query returns an empty
# result (exit 0); a failed request is an error (exit 1). Read-only: no wallet,
# no broadcast. Adopts the shared F5 output contract, so --json prints one JSON
# object to stdout.
#
# Scenarios: Memo Search - 1, Memo Search - 2, Memo Search - 3, Memo Search - 4, Memo Search - 5, Memo Search - 6, Memo Search - 7
Feature: Memo Search

  Background:
    Given the Memo DB service serves search results

  Scenario: Memo Search - 1 a missing query is a usage error
    When the memo-search command runs without a query
    Then the memo-search command reported the usage error "You must specify a search query with the -q flag."

  Scenario: Memo Search - 2 the command reads the first page by default
    When the memo-search command runs for "memo"
    Then the service received a search request for "memo" with limit 50 and offset 0
    And the service received no viewer query parameter
    And the command reported the post txids "alpha, bravo"
    And the command reported the profile addresses "bitcoincash:qcarol"
    And the command reported pagination total 3 and hasMore false

  Scenario Outline: Memo Search - 3 the command returns the requested page
    Given the Memo DB service serves a five-post search result
    When the memo-search command runs for "memo" with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | alpha, bravo                       | true    |
      | 2     | 2      | charlie, delta                     | true    |
      | 2     | 4      | echo                               | false   |
      | 5     | 0      | alpha, bravo, charlie, delta, echo | false   |

  Scenario Outline: Memo Search - 4 the viewer address is sent to the service
    When the memo-search command runs for "memo" with viewer "<viewer>"
    Then the service received the viewer query parameter "<viewer>"

    Examples:
      | viewer                                                 |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Memo Search - 5 each reported result keeps its service fields
    When the memo-search command runs for "memo"
    Then the command reported the post "<txid>" with text "<postText>"
    And the command reported the profile "<profileAddr>" with name "<name>"

    Examples:
      | txid  | postText   | profileAddr        | name         |
      | alpha | first memo | bitcoincash:qcarol | Carol Search |

  Scenario: Memo Search - 6 a blank query returns no results
    When the memo-search command runs with a blank query
    Then the command reported 0 posts
    And the command reported 0 profiles
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Search - 7 a failed request reports the error
    Given the search request fails
    When the memo-search command runs for "memo"
    Then the memo-search command reported an error
