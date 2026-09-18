# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T13:25:09.808780081Z","feature_name":"Topic Metadata Columns","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topic-metadata-columns.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Metadata Columns - 1, Topic Metadata Columns - 2, Topic Metadata Columns - 3
#
# The topics page renders one row per topic with four columns: the topic name,
# the time since the topic's most recent post, the post count, and the follower
# count. The relative time is computed from the API's lastSeen timestamp (epoch
# milliseconds) against the current time:
#   - no posts           -> "No posts"
#   - less than an hour  -> "Less than an hour ago"
#   - under 24 hours     -> "N hours ago" (1 hour ago when singular)
#   - 24 hours or more   -> "N days ago" (1 day ago when singular)
Feature: Topic Metadata Columns

  Scenario Outline: Topic Metadata Columns - 1 the topics page shows each topic's post count and follower count
    Given the psf-memo-db API serves a topic named "<room>" with <postCount> posts
    And the topic "<room>" has <followerCount> followers
    When I open the topics page
    Then the topics page shows the topic "<room>" with <expectedPostCount> posts
    And the topics page shows the topic "<room>" with <expectedFollowerCount> followers

    Examples:
      | room    | postCount | followerCount | expectedPostCount | expectedFollowerCount |
      | bitcoin | 42        | 17            | 42                | 17                    |
      | cash    | 7         | 3             | 7                 | 3                     |

  Scenario Outline: Topic Metadata Columns - 2 the topics page shows the most recent post in hours or days
    Given the current time is 1800000000000
    And the psf-memo-db API serves a topic named "<room>" with 1 post
    And the topic "<room>" was last posted at <lastSeen>
    When I open the topics page
    Then the topics page shows the most recent post for the topic "<room>" as "<label>"

    Examples:
      | room    | lastSeen      | label                 |
      | bitcoin | 1799998200000 | Less than an hour ago |
      | cash    | 1799996400000 | 1 hour ago            |
      | dance   | 1799982000000 | 5 hours ago           |
      | dev     | 1799917200000 | 23 hours ago          |
      | anime   | 1799913600000 | 1 day ago             |
      | music   | 1799827200000 | 2 days ago            |

  Scenario: Topic Metadata Columns - 3 a topic with no posts shows "No posts"
    Given the psf-memo-db API serves a topic named "lone" with 0 posts
    When I open the topics page
    Then the topics page shows the most recent post for the topic "lone" as "No posts"
