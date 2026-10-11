# Memo Following Feed (AF1/R17): the psf-memo-cli read command for the viewer's
# Following feed — the top-level posts (replies excluded, the viewer's own posts
# excluded) authored by the profiles the viewer follows, newest first. It
# resolves the signing wallet (-n <wallet> or --wif <wif>, shared F2
# wallet-source) to identify the viewer, then reads GET /posts/following/:addr
# from psf-memo-db and reports the returned posts and the service pagination
# unchanged (limit, offset, total, hasMore; X6). This is the CLI mirror of the
# web client's "Following" feed tab; psf-memo-db owns the follow-join, the
# reply/own-post exclusion, and the ordering. The single-author feed already
# exists as memo-posts (-a <addr>); this command is the aggregate across the
# viewer's follows. Read-only: never broadcasts; a missing wallet source is a
# usage error (exit 2); a failed request is an error (exit 1). Adopts the shared
# F5 output contract, so --json prints one JSON object to stdout.
#
# Scenarios: Memo Following Feed - 1, Memo Following Feed - 2, Memo Following Feed - 3, Memo Following Feed - 4, Memo Following Feed - 5, Memo Following Feed - 6
Feature: Memo Following Feed

  Background:
    Given a Memo following feed command
    And the Memo DB service serves the following feed

  Scenario: Memo Following Feed - 1 a missing wallet source is a usage error
    When the memo-following-feed command runs
    Then the memo-following-feed command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario: Memo Following Feed - 2 the command reads the wallet address's newest page by default
    Given the following feed viewer wallet has the address "addrA"
    When the memo-following-feed command runs
    Then the service received a following feed request for "addrA" with limit 50 and offset 0
    And the command reported the post txids "feed-1, feed-2, feed-3, feed-4, feed-5"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Following Feed - 3 the command returns the requested page
    Given the following feed viewer wallet has the address "addrA"
    When the memo-following-feed command runs with limit <limit> and offset <offset>
    Then the command reported the post txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                                      | hasMore |
      | 2     | 0      | feed-1, feed-2                             | true    |
      | 2     | 2      | feed-3, feed-4                             | true    |
      | 2     | 4      | feed-5                                     | false   |
      | 5     | 0      | feed-1, feed-2, feed-3, feed-4, feed-5     | false   |

  Scenario Outline: Memo Following Feed - 4 each reported post keeps its author and text
    Given the following feed viewer wallet has the address "addrA"
    When the memo-following-feed command runs
    Then the command reported post "<txid>" authored by "<addr>" with text "<text>"

    Examples:
      | txid   | addr    | text         |
      | feed-1 | authorA | first memo   |
      | feed-2 | authorB | second memo  |
      | feed-3 | authorC | third memo   |
      | feed-4 | authorD | fourth memo  |
      | feed-5 | authorE | fifth memo   |

  Scenario: Memo Following Feed - 5 an empty following feed reports no posts
    Given the following feed viewer wallet has the address "addrA"
    And the following feed is empty
    When the memo-following-feed command runs
    Then the command reported 0 posts
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Following Feed - 6 a failed request reports the error
    Given the following feed viewer wallet has the address "addrA"
    And the following feed request fails
    When the memo-following-feed command runs
    Then the memo-following-feed command reported an error
