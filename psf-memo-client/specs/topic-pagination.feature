# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-17T17:25:15.930044025Z","feature_name":"Topic Pagination","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topic-pagination.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Topic Pagination - 2 the topics page can load a later page","scenario_hash":"1d76d7c408593ae66f0f1551b1d583ccdceb0931d1dae35f5d02f8a0cb9636e9","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-17T17:25:15.930044025Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Pagination - 1, Topic Pagination - 2
#
# The topics page loads topics in pages of 50 and can move to a later page. The
# page reports whether more topics are available.
Feature: Topic Pagination

  Scenario Outline: Topic Pagination - 1 the topics page loads 50 topics per page
    Given the psf-memo-db API serves <count> topics
    When I open the topics page
    Then the topics page shows <shown> topics
    And the topics page can load more topics

    Examples:
      | count | shown |
      | 60    | 50    |
      | 70    | 50    |

  Scenario Outline: Topic Pagination - 2 the topics page can load a later page
    Given the psf-memo-db API serves <count> topics
    When I open the topics page at offset <offset>
    Then the topics page shows <shown> topics
    And the topics page has no more topics

    Examples:
      | count | offset | shown |
      | 60    | 50     | 10    |
      | 70    | 50     | 20    |
