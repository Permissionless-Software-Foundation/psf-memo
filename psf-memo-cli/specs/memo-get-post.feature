# Memo Get Post (R3): the psf-memo-cli command that reads a single stored Memo
# post document from psf-memo-db (GET /level/post/:txid). The post is identified
# by its transaction id via the required -t flag. The stored fields (text,
# author address, block height, seen) are reported alongside the txid. A txid
# with no stored post is reported as a not-found failure (exit 1) so callers can
# poll for it. Read-only: no wallet, no broadcast. The write command that
# broadcasts a new 0x6d02 post is `memo-post` (W1); this read command is
# `memo-get-post`.
#
# Scenarios: Memo Get Post - 1, Memo Get Post - 2, Memo Get Post - 3, Memo Get Post - 4
Feature: Memo Get Post

  Background:
    Given the Memo DB service serves the posts store

  Scenario: Memo Get Post - 1 a missing txid flag is a usage error
    When the memo-get-post command runs without a txid
    Then the memo-get-post command reported the usage error "You must specify a post txid with the -t flag."

  Scenario Outline: Memo Get Post - 2 the command reports the stored post fields
    When the memo-get-post command runs for "<txid>"
    Then the command reported the post "<txid>" with text "<text>" and address "<addr>"
    And the command reported block height <blockHeight> and seen <seen> for the post

    Examples:
      | txid     | text        | addr                | blockHeight | seen |
      | post-abc | hello memo  | bitcoincash:qaddr-a | 600001      | 1000 |
      | post-def | second post | bitcoincash:qaddr-b | 600050      | 2000 |

  Scenario: Memo Get Post - 3 a txid with no stored post reports not found
    Given the Memo DB service has no post for "post-missing"
    When the memo-get-post command runs for "post-missing"
    Then the memo-get-post command reported not found

  Scenario: Memo Get Post - 4 a failed request reports the error
    Given the Memo DB service fails the post request
    When the memo-get-post command runs for "post-abc"
    Then the memo-get-post command reported an error
