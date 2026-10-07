# Memo Wait (R16): the psf-memo-cli command that polls until a broadcast post
# transaction is indexed, then reports it. It queries GET /level/post/:txid
# (the same post store memo-get-post reads) immediately, then re-queries every
# --interval milliseconds (default 5000) until the post appears or the --timeout
# budget (default 60000 ms) elapses. The required post txid comes from -t. When
# the post is stored, the command reports its fields and exits 0. A timeout is a
# runtime error (exit 1); a transport failure aborts immediately as a runtime
# error instead of retrying. A non-positive or non-integer --timeout/--interval
# is a usage error (exit 2). The command adopts the shared F5 output contract,
# so --json prints one JSON object to stdout. Read-only: no wallet, no
# broadcast. This makes the async write -> index -> read path scriptable (X7).
#
# Scenarios: Memo Wait - 1, Memo Wait - 2, Memo Wait - 3, Memo Wait - 4, Memo Wait - 5, Memo Wait - 6
Feature: Memo Wait

  Background:
    Given the Memo DB service serves the posts store

  Scenario: Memo Wait - 1 a missing txid flag is a usage error
    When the memo-wait command runs without a txid
    Then the memo-wait command reported the usage error "You must specify a post txid with the -t flag."

  Scenario: Memo Wait - 2 an already-indexed post is reported without waiting
    When the memo-wait command runs for "post-abc"
    Then the command polled the service 1 times
    And the command did not wait
    And the command reported the indexed post "post-abc" with text "hello memo" and address "bitcoincash:qaddr-a"

  Scenario: Memo Wait - 3 the command polls at the default interval until the post is indexed
    Given the Memo DB service will index the post "wait-post" with text "waited memo" and address "bitcoincash:qaddr-w" on poll 3
    When the memo-wait command runs for "wait-post"
    Then the command polled the service 3 times
    And the command waited 5000 milliseconds between polls
    And the command reported the indexed post "wait-post" with text "waited memo" and address "bitcoincash:qaddr-w"

  Scenario: Memo Wait - 4 the command gives up at the timeout and reports a timeout error
    Given the Memo DB service has no post for "post-missing"
    When the memo-wait command runs for "post-missing" with timeout 3000 and interval 1000
    Then the memo-wait command reported the timeout error "Timed out waiting for post post-missing after 3000 milliseconds."

  Scenario: Memo Wait - 5 a failed request is reported as an error without retrying
    Given the Memo DB service fails the post request
    When the memo-wait command runs for "post-abc" with timeout 3000 and interval 1000
    Then the command polled the service 1 times
    And the memo-wait command reported an error

  Scenario Outline: Memo Wait - 6 an invalid interval or timeout is a usage error
    When the memo-wait command runs for "post-abc" with timeout <timeout> and interval <interval>
    Then the memo-wait command reported the usage error "<error>"

    Examples:
      | timeout | interval | error                                                                  |
      | 0       | 1000     | The --timeout value must be a positive integer number of milliseconds. |
      | abc     | 1000     | The --timeout value must be a positive integer number of milliseconds. |
      | 60000   | 0        | The --interval value must be a positive integer number of milliseconds. |
      | 60000   | abc      | The --interval value must be a positive integer number of milliseconds. |
