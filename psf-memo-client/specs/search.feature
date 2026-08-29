# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-29T15:42:33.013729780Z","feature_name":"Search","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/search.feature","background_hash":"9e7fd3c0f7630e1c8dbe0201df1c30b7b45c1e9a208ab42cf7ff005bdb7881a6","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Search - 1, Search - 2, Search - 3, Search - 4, Search - 5
#
# Search is a public read-only feature; it does not require a wallet and does
# not broadcast any Memo action. The psf-memo-db /search endpoint matches
# case-insensitively (substring) against top-level post text and against the
# profile name and bio. Empty queries and queries with no matches both return
# no results rather than an error.
Feature: Search

  Background:
    Given the psf-memo-db API has a post with the text "hello world from psf memo"
    Given the psf-memo-db API has a post with the text "bitcoin cash meets lightning"
    Given the psf-memo-db API has a profile named "Alice Trout" with the bio "bitcoin cash enthusiast"
    Given the psf-memo-db API has a profile named "Bob Builder" with the bio "building on BCH"

  Scenario Outline: Search - 1 searching by text returns matching posts
    When I open the Search page
    And I submit a search for <query>
    Then the search results include a post with the text <post_text>

    Examples:
      | query     | post_text                     |
      | hello     | hello world from psf memo     |
      | PSF       | hello world from psf memo     |
      | memo      | hello world from psf memo     |
      | lightning | bitcoin cash meets lightning  |

  Scenario Outline: Search - 2 searching a profile name returns that profile
    When I open the Search page
    And I submit a search for <query>
    Then the search results include a profile named <name>

    Examples:
      | query | name        |
      | Alice | Alice Trout |
      | trout | Alice Trout |
      | bob   | Bob Builder |

  Scenario Outline: Search - 3 searching a profile bio returns that profile
    When I open the Search page
    And I submit a search for <query>
    Then the search results include a profile named <name>

    Examples:
      | query      | name        |
      | enthusiast | Alice Trout |
      | building   | Bob Builder |

  Scenario: Search - 4 a query with no matches returns empty results
    When I open the Search page
    And I submit a search for "zzzqqq"
    Then the search results include no posts
    And the search results include no profiles

  Scenario: Search - 5 an empty query returns no results
    When I open the Search page
    And I submit a search for ""
    Then the search results include no posts
    And the search results include no profiles
