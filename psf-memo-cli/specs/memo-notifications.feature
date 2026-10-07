# Memo Notifications (R6): the psf-memo-cli read command for the wallet
# address's notifications. It resolves the signing wallet (-n <wallet> or
# --wif <wif>, shared F2 wallet-source) and reads GET /posts/notifications/:addr
# from psf-memo-db, reporting the returned notifications (type, action txid,
# actor address, and the optional replied/liked post txid and reply text) and
# the service pagination unchanged (limit, offset, total, hasMore; X6). The
# notification block-window semantics are owned by psf-memo-db (gotcha #21 /
# the notifications-query-performance spec). Read-only: it never broadcasts; a
# missing wallet source is a usage error (exit 2); a failed request is an error
# (exit 1). Adopts the shared F5 output contract, so --json prints one JSON
# object to stdout.
#
# Scenarios: Memo Notifications - 1, Memo Notifications - 2, Memo Notifications - 3, Memo Notifications - 4, Memo Notifications - 5, Memo Notifications - 6
Feature: Memo Notifications

  Background:
    Given a Memo notifications command
    And the Memo DB service serves the notifications feed

  Scenario: Memo Notifications - 1 a missing wallet source is a usage error
    When the memo-notifications command runs
    Then the memo-notifications command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario: Memo Notifications - 2 the command reads the wallet address's newest page by default
    Given the viewer wallet has the address "addrA"
    When the memo-notifications command runs
    Then the service received a notifications request for "addrA" with limit 50 and offset 0
    And the command reported the notification txids "notif-1, notif-2, notif-3, notif-4, notif-5"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Notifications - 3 the command returns the requested page
    Given the viewer wallet has the address "addrA"
    When the memo-notifications command runs with limit <limit> and offset <offset>
    Then the command reported the notification txids "<txids>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | txids                              | hasMore |
      | 2     | 0      | notif-1, notif-2                   | true    |
      | 2     | 2      | notif-3, notif-4                   | true    |
      | 2     | 4      | notif-5                            | false   |
      | 5     | 0      | notif-1, notif-2, notif-3, notif-4, notif-5 | false   |

  Scenario Outline: Memo Notifications - 4 each reported notification keeps its type and actor
    Given the viewer wallet has the address "addrA"
    When the memo-notifications command runs
    Then the command reported notification "<txid>" of type "<type>" from "<actor>"

    Examples:
      | txid    | type   | actor     |
      | notif-1 | follow | followerA |
      | notif-2 | reply  | replier   |
      | notif-3 | like   | liker     |

  Scenario: Memo Notifications - 5 an empty notifications feed reports no notifications
    Given the viewer wallet has the address "addrA"
    Given the notifications feed is empty
    When the memo-notifications command runs
    Then the command reported 0 notifications
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Notifications - 6 a failed request reports the error
    Given the viewer wallet has the address "addrA"
    Given the notifications request fails
    When the memo-notifications command runs
    Then the memo-notifications command reported an error
