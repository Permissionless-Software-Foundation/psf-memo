# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T16:08:47.722675869Z","feature_name":"Pagination Fidelity","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/pagination-fidelity.feature","background_hash":"8ec63aa94461d0b21ff2fd5f064bfe5c652530b00cd17a224d1326ca021e747a","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Pagination Fidelity - 1, Pagination Fidelity - 2, Pagination Fidelity - 3
#
# X6: every paginated read command exposes --limit/--offset and reports the
# service pagination object unchanged (limit, offset, total, hasMore). Each
# command's own feature already pins its small-fixture passthrough; this feature
# pins the properties those fixtures cannot exercise: the documented recent-feed
# total cap of 500 (min(actual, 500); gotcha #21) is passed through and never
# raised, the returned page count is independent of the service total, and the
# service hasMore is echoed rather than recomputed from offset + limit.
Feature: Pagination Fidelity

  Background:
    Given the Memo DB service serves the recent feed

  Scenario: Pagination Fidelity - 1 the recent feed reports the capped total unchanged
    Given the service reports pagination limit 50, offset 0, total 500, and hasMore true
    When the memo-feed command runs
    Then the command reported pagination limit 50, offset 0, total 500, and hasMore true

  Scenario Outline: Pagination Fidelity - 2 the page count is independent of the service total
    Given the service reports pagination limit <limit>, offset <offset>, total <total>, and hasMore <hasMore>
    When the memo-feed command runs with limit <limit> and offset <offset>
    Then the command reported <posts> posts
    And the command reported pagination limit <limit>, offset <offset>, total <total>, and hasMore <hasMore>

    Examples:
      | limit | offset | total | hasMore | posts |
      | 50    | 0      | 500   | true    | 5     |
      | 2     | 4      | 5     | false   | 1     |

  Scenario Outline: Pagination Fidelity - 3 the service hasMore is echoed, not recomputed
    Given the service reports pagination limit <limit>, offset <offset>, total <total>, and hasMore <hasMore>
    When the memo-feed command runs with limit <limit> and offset <offset>
    Then the command reported pagination limit <limit>, offset <offset>, total <total>, and hasMore <hasMore>

    Examples:
      | limit | offset | total | hasMore |
      | 2     | 0      | 10    | false   |
      | 3     | 499    | 500   | false   |
      | 50    | 0      | 500   | true    |
