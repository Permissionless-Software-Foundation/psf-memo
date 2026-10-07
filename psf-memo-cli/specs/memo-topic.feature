# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T23:40:52.919673766Z","feature_name":"Memo Topic","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-topic.feature","background_hash":"ce77df1dd981cf2973a0ef24cd14b455bf9df3e48b258099cabcc02014c92205","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Memo Topic - 3 the command returns the requested page","scenario_hash":"940b06018c94ddc5aa9323457fe4a95eecb36c34e11e031cb1165e9565e2ea2c","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-07T23:40:52.919673766Z"},{"index":3,"name":"Memo Topic - 4 each reported post keeps its text, reply count, and like count","scenario_hash":"100ffd8dc61c599d21415c5ba782dee3ad824ecc0ddd02bd3d89aca3aa4854d1","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-07T23:40:52.919673766Z"}]}
# acceptance-mutation-manifest-end

# Memo Topic (R8): the psf-memo-cli read command for a single topic's posts. It
# reads one page of GET /topics/:room/posts (newest first) and reports the
# returned posts (txid, author address, text, seen, block height, reply count,
# like count) and the service pagination unchanged (limit, offset, total,
# hasMore; X6). The topic name comes from the required -r flag; an optional
# --viewer address scopes the page to the viewer's mute filter. Read-only: no
# wallet, no broadcast. A missing -r is a usage error (exit 2); a failed request
# is an error (exit 1). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout.
#
# Scenarios: Memo Topic - 1, Memo Topic - 2, Memo Topic - 3, Memo Topic - 4, Memo Topic - 5, Memo Topic - 6, Memo Topic - 7
Feature: Memo Topic

  Background:
    Given the Memo DB service serves topic posts for "general"

  Scenario: Memo Topic - 1 a missing room is a usage error
    When the memo-topic command runs without a room
    Then the memo-topic command reported the usage error "You must specify a topic room with the -r flag."

  Scenario: Memo Topic - 2 the command reads the topic's newest page by default
    When the memo-topic command runs for "general"
    Then the service received a topic-posts request for "general" with limit 50 and offset 0
    And the service received no viewer query parameter
    And the command reported the post txids "alpha, bravo, charlie, delta, echo"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Topic - 3 the command returns the requested page
    When the memo-topic command runs for "general" with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | alpha, bravo                       | true    |
      | 2     | 2      | charlie, delta                     | true    |
      | 2     | 4      | echo                               | false   |
      | 5     | 0      | alpha, bravo, charlie, delta, echo | false   |

  Scenario Outline: Memo Topic - 4 each reported post keeps its text, reply count, and like count
    When the memo-topic command runs for "general"
    Then the command reported the post "<txid>" with text "<text>", reply count <replyCount>, and like count <likeCount>

    Examples:
      | txid    | text       | replyCount | likeCount |
      | alpha   | first memo | 2          | 3         |
      | charlie | third memo | 0          | 1         |

  Scenario Outline: Memo Topic - 5 the viewer address is sent to the service
    When the memo-topic command runs for "general" with viewer "<viewer>"
    Then the service received the viewer query parameter "<viewer>"

    Examples:
      | viewer                                                 |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario: Memo Topic - 6 an empty topic reports no posts
    When the memo-topic command runs for "quiet"
    Then the command reported 0 posts
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Topic - 7 a failed request reports the error
    Given the topic-posts request fails
    When the memo-topic command runs for "general"
    Then the memo-topic command reported an error
