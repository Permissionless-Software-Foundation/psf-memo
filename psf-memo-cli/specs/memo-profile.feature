# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T19:46:53.594446339Z","feature_name":"Memo Profile","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-profile.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Memo Profile (R4): the psf-memo-cli composed profile read command. For a
# target address (-a <addr>) it reports the address's Memo name (0x6d01),
# profile text (0x6d05), and avatar URL (0x6d0a) from /level/name|profile|
# profilepic, plus one page of the address's top-level posts (GET
# /posts/by/:addr) and the service pagination unchanged (X6). When an optional
# --viewer <addr> is supplied, it also reports whether that viewer follows the
# address (GET /follow/state); without a viewer the follow state is not-followed,
# mirroring the web client. SLP token balances are not available from
# psf-memo-db (it exposes no token route), so they are out of scope here; the
# wallet-relative memo-identity (R15) reports the wallet's own tokens.
# Read-only: it never broadcasts. A missing -a is a usage error (exit 2); a
# failed request is an error (exit 1). Adopts the shared F5 output contract, so
# --json prints one JSON object to stdout.
#
# Scenarios: Memo Profile - 1, Memo Profile - 2, Memo Profile - 3, Memo Profile - 4, Memo Profile - 5, Memo Profile - 6, Memo Profile - 7
Feature: Memo Profile

  Scenario: Memo Profile - 1 a missing profile address is a usage error
    When the memo-profile command runs without an address
    Then the memo-profile command reported the usage error "You must specify a profile address with the -a flag."

  Scenario Outline: Memo Profile - 2 the command reports the profile identity
    Given the Memo DB service serves the profile "<addr>" with name "<name>", bio "<bio>", and avatar "<url>"
    When the memo-profile command runs for "<addr>"
    Then the command reported the profile identity name "<name>", bio "<bio>", and avatar "<url>"

    Examples:
      | addr  | name  | bio        | url                   |
      | addrA | alice | hello memo | https://example/a.png |
      | addrB | bob   | second bio | https://example/b.png |

  Scenario: Memo Profile - 3 a missing profile reports empty identity fields
    Given the Memo DB service has no profile for "addrC"
    When the memo-profile command runs for "addrC"
    Then the command reported empty identity fields

  Scenario Outline: Memo Profile - 4 the command reports the address's recent posts
    Given the Memo DB service serves posts by "addrA"
    When the memo-profile command runs for "addrA" with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | alpha, bravo                       | true    |
      | 2     | 2      | charlie, delta                     | true    |
      | 2     | 4      | echo                               | false   |
      | 5     | 0      | alpha, bravo, charlie, delta, echo | false   |

  Scenario Outline: Memo Profile - 5 the command reports the viewer's follow state
    Given the Memo DB service reports the follow state <following>
    When the memo-profile command runs for "addrA" with viewer "viewerB"
    Then the command reported that the profile is <followedState>

    Examples:
      | following | followedState |
      | true      | followed      |
      | false     | not followed  |

  Scenario: Memo Profile - 6 without a viewer the profile is reported as not followed
    When the memo-profile command runs for "addrA"
    Then the command reported that the profile is not followed

  Scenario: Memo Profile - 7 a failed request reports the error
    Given the profile request fails
    When the memo-profile command runs for "addrA"
    Then the memo-profile command reported an error
