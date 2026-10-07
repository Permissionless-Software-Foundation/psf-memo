# Memo Thread (R2): the psf-memo-cli command that reads a Memo post and its
# nested reply tree with per-node like counts from psf-memo-db
# (GET /posts/:txid/thread). The post is identified by its transaction id via
# the required -t flag. The service's reply order (oldest first: block height,
# then seen) and each node's direct-reply count and like count are preserved.
# A txid that is not an indexed post is reported as a not-found failure (exit
# 1) so callers can poll for it (R16 memo-wait). Read-only: no wallet, no
# broadcast.
#
# Scenarios: Memo Thread - 1, Memo Thread - 2, Memo Thread - 3, Memo Thread - 4, Memo Thread - 5, Memo Thread - 6, Memo Thread - 7
Feature: Memo Thread

  Background:
    Given the Memo DB service serves the thread for "thread-root"

  Scenario: Memo Thread - 1 a missing txid flag is a usage error
    When the memo-thread command runs without a txid
    Then the memo-thread command reported the usage error "You must specify a post txid with the -t flag."

  Scenario: Memo Thread - 2 the command reports the root post and its counts
    When the memo-thread command runs for "thread-root"
    Then the command reported the root post "thread-root" with like count 2 and reply count 3

  Scenario: Memo Thread - 3 the command reports the root's direct replies oldest first
    When the memo-thread command runs for "thread-root"
    Then the command reported the reply order "thread-reply-1, thread-reply-2, thread-reply-3"

  Scenario Outline: Memo Thread - 4 the command reports each reply's like count
    When the memo-thread command runs for "thread-root"
    Then the command reported the reply "<txid>" with like count <likeCount>

    Examples:
      | txid           | likeCount |
      | thread-reply-1 | 1         |
      | thread-reply-2 | 0         |
      | thread-reply-3 | 2         |

  Scenario: Memo Thread - 5 a nested reply is reported under its parent
    When the memo-thread command runs for "thread-root"
    Then the command reported the reply "thread-reply-2" with a nested reply "thread-reply-2-a"
    And the command reported the nested reply "thread-reply-2-a" with like count 3

  Scenario: Memo Thread - 6 a txid with no indexed thread reports not found
    Given the Memo DB service has no thread for "thread-missing"
    When the memo-thread command runs for "thread-missing"
    Then the memo-thread command reported not found

  Scenario: Memo Thread - 7 a failed request reports the error
    Given the Memo DB service fails the thread request
    When the memo-thread command runs for "thread-root"
    Then the memo-thread command reported an error
