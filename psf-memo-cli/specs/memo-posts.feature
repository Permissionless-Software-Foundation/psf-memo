# mutation-stamp: sha256=d5c29e2e5b49def2227f451bdc022603083aa7035732bdbda97c7f038c155b4a
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T20:44:09.632079823Z","feature_name":"Memo Posts","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-posts.feature","background_hash":"ad735f2ac4782d3b85c04118d5178f3b0d35cc11ea5e9ccab191e2b48d4a159e","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Memo Posts - 3 the command returns the requested page","scenario_hash":"6597c58aead648631d3a761a756ae45170960b12cb7940d3e8c0a15d64dbbb62","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-07T20:44:09.632079823Z"},{"index":3,"name":"Memo Posts - 4 each reported post keeps its text and reply count","scenario_hash":"d50333323eebc2708378dc5f57ba08710ebe9e29b572ebb3a69cd9583659a4d2","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-07T20:44:09.632079823Z"}]}
# acceptance-mutation-manifest-end

# Memo Posts (R5): the psf-memo-cli read command for the top-level posts
# authored by an address. It reads one page of GET /posts/by/:addr (newest
# first; replies excluded) and reports the returned posts (txid, author
# address, text, seen, block height, reply count) and the service pagination
# unchanged (limit, offset, total, hasMore; X6). The target address comes from
# the required -a flag. Read-only: no wallet, no broadcast. A missing -a is a
# usage error (exit 2); a failed request is an error (exit 1). Adopts the shared
# F5 output contract, so --json prints one JSON object to stdout. This is the
# standalone posts-by-address list; R4 memo-profile composes the same page with
# the address's identity.
#
# Scenarios: Memo Posts - 1, Memo Posts - 2, Memo Posts - 3, Memo Posts - 4, Memo Posts - 5, Memo Posts - 6
Feature: Memo Posts

  Background:
    Given the Memo DB service serves posts by "addrA"

  Scenario: Memo Posts - 1 a missing address is a usage error
    When the memo-posts command runs without an address
    Then the memo-posts command reported the usage error "You must specify an author address with the -a flag."

  Scenario: Memo Posts - 2 the command reads the address's newest page by default
    When the memo-posts command runs for "addrA"
    Then the service received an address-posts request for "addrA" with limit 50 and offset 0
    And the command reported the post txids "alpha, bravo, charlie, delta, echo"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Posts - 3 the command returns the requested page
    When the memo-posts command runs for "addrA" with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | alpha, bravo                       | true    |
      | 2     | 2      | charlie, delta                     | true    |
      | 2     | 4      | echo                               | false   |
      | 5     | 0      | alpha, bravo, charlie, delta, echo | false   |

  Scenario Outline: Memo Posts - 4 each reported post keeps its text and reply count
    When the memo-posts command runs for "addrA"
    Then the command reported the post "<txid>" with text "<text>" and reply count <replyCount>

    Examples:
      | txid    | text       | replyCount |
      | alpha   | first memo | 2          |
      | charlie | third memo | 0          |

  Scenario: Memo Posts - 5 an address with no posts reports an empty page
    Given the Memo DB service has no posts for "addrB"
    When the memo-posts command runs for "addrB"
    Then the command reported 0 posts
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Posts - 6 a failed request reports the error
    Given the Memo DB service fails the address-posts request
    When the memo-posts command runs for "addrA"
    Then the memo-posts command reported an error
