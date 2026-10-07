# mutation-stamp: sha256=d23bd0eda967aae482aaa69943ef301befebb099c95d979ef0e2f2151e540a4f
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T03:30:44.816097186Z","feature_name":"Memo Get Post","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-get-post.feature","background_hash":"10e54e08cb2026861764a698bd5655ea4a12941a8c1523a23cb6d47352ba8a6b","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Memo Get Post - 2 the command reports the stored post fields","scenario_hash":"400dfbe844fec0f19c6b671286064fb8cf734876f32fd325f8ce0767a7c786d3","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-07T03:30:44.816097186Z"}]}
# acceptance-mutation-manifest-end

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
