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
