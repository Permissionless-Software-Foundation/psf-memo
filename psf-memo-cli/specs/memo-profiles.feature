# Memo Profiles (R10): the psf-memo-cli read command for the recently active
# profile list. It reads one page of GET /profile/recent and reports the
# returned profiles (address, bio text, display name, avatar URL, provenance
# txid, and the most recent qualifying post's block height and seen) in the
# service's order (most recent qualifying post first: block height descending,
# seen descending, address ascending) and the service pagination unchanged
# (limit, offset, total, hasMore; X6). A profile with no name record reports a
# null display name, and a profile with no picture record reports a null avatar
# URL; the CLI reports the raw service values rather than substituting a
# truncated address or an identicon (that presentation belongs to the web
# client). Read-only: no wallet, no broadcast. A failed request is an error
# (exit 1). Adopts the shared F5 output contract, so --json prints one JSON
# object to stdout.
#
# Scenarios: Memo Profiles - 1, Memo Profiles - 2, Memo Profiles - 3, Memo Profiles - 4, Memo Profiles - 5, Memo Profiles - 6
Feature: Memo Profiles

  Background:
    Given the Memo DB service serves the recent profiles list

  Scenario: Memo Profiles - 1 the command reads the first page by default
    When the memo-profiles command runs
    Then the service received a recent-profiles request with limit 50 and offset 0
    And the command reported the profile addresses "addrA, addrB, addrC, addrD, addrE"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Profiles - 2 the command returns the requested page
    When the memo-profiles command runs with limit <limit> and offset <offset>
    Then the command reported the profile addresses "<addrs>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | addrs                            | hasMore |
      | 2     | 0      | addrA, addrB                     | true    |
      | 2     | 2      | addrC, addrD                     | true    |
      | 2     | 4      | addrE                            | false   |
      | 5     | 0      | addrA, addrB, addrC, addrD, addrE | false   |

  Scenario Outline: Memo Profiles - 3 each reported profile keeps its display name and avatar
    When the memo-profiles command runs
    Then the command reported the profile "<addr>" with name "<name>" and avatar "<avatar>"

    Examples:
      | addr  | name  | avatar                        |
      | addrA | alice | https://example.com/alice.png |
      | addrB |       | https://example.com/bob.jpg   |
      | addrC | carol |                               |

  Scenario Outline: Memo Profiles - 4 each reported profile keeps its bio and post recency
    When the memo-profiles command runs
    Then the command reported the profile "<addr>" with bio "<bio>", block height <blockHeight>, and seen <seen>

    Examples:
      | addr  | bio       | blockHeight | seen |
      | addrA | alice bio | 600300      | 300  |
      | addrC | carol bio | 600200      | 400  |

  Scenario: Memo Profiles - 5 an empty profile list reports no profiles
    Given the recent profiles list is empty
    When the memo-profiles command runs
    Then the command reported 0 profiles
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Profiles - 6 a failed request reports the error
    Given the recent-profiles request fails
    When the memo-profiles command runs
    Then the memo-profiles command reported an error
