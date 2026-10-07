# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T01:55:53.315105110Z","feature_name":"Memo Feed","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-feed.feature","background_hash":"8ec63aa94461d0b21ff2fd5f064bfe5c652530b00cd17a224d1326ca021e747a","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Memo Feed - 5 an empty feed reports no posts","scenario_hash":"cdcddb7031bf9f63fd2a0f789ef4c40f323ede11f0f6da2d90570a96d3bbe9b1","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-10-07T01:55:53.315105110Z"}]}
# acceptance-mutation-manifest-end

# Memo Feed (R1): the first psf-memo-cli read command. It reads one page of the
# recent top-level Memo feed from psf-memo-db (GET /posts/recent, newest first)
# and reports the returned posts and the service's pagination. Read commands
# never broadcast and need no wallet; an optional --viewer address scopes the
# page to the viewer's mute filter. The service pagination is reported
# unchanged, including the documented capped total (min(actual, 500)).
#
# Scenarios: Memo Feed - 1, Memo Feed - 2, Memo Feed - 3, Memo Feed - 4, Memo Feed - 5, Memo Feed - 6
Feature: Memo Feed

  Background:
    Given the Memo DB service serves the recent feed

  Scenario: Memo Feed - 1 the command reads the newest page by default
    When the memo-feed command runs
    Then the service received a recent-feed request with limit 50 and offset 0
    And the service received no viewer query parameter

  Scenario Outline: Memo Feed - 2 the command returns the requested page
    When the memo-feed command runs with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | alpha, bravo                       | true    |
      | 2     | 2      | charlie, delta                     | true    |
      | 2     | 4      | echo                               | false   |
      | 5     | 0      | alpha, bravo, charlie, delta, echo | false   |

  Scenario Outline: Memo Feed - 3 each reported post keeps its service fields
    When the memo-feed command runs with limit <limit> and offset <offset>
    Then the command reported the post "<txid>" with text "<text>", reply count <replyCount>, and like count <likeCount>

    Examples:
      | limit | offset | txid    | text       | replyCount | likeCount |
      | 1     | 0      | alpha   | first memo | 2          | 3         |
      | 2     | 2      | charlie | third memo | 0          | 1         |

  Scenario Outline: Memo Feed - 4 the viewer address is sent to the service
    When the memo-feed command runs with viewer "<viewer>"
    Then the service received the viewer query parameter "<viewer>"

    Examples:
      | viewer                                                 |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Memo Feed - 5 an empty feed reports no posts
    Given the recent feed is empty
    When the memo-feed command runs
    Then the command reported <posts> posts
    And the command reported pagination total <total> and hasMore <hasMore>

    Examples:
      | posts | total | hasMore |
      | 0     | 0     | false   |

  Scenario: Memo Feed - 6 a failed request reports the error
    Given the recent-feed request fails
    When the memo-feed command runs
    Then the memo-feed command reported an error
