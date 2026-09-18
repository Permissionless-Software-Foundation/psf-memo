# mutation-stamp: sha256=94681f52139dc67ffd45a1ecf2c1e00204b78fb16fd0c8fa72606db0b32ed491
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T14:44:15.612974379Z","feature_name":"Topics Table Layout","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topics-table-layout.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Topics Table Layout - 2 each topic's fields appear in the matching columns","scenario_hash":"748c9fa260e4eb12f4aa6250cec2327e6b54483eb2efaa5adc192bd0b321c8ae","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-09-18T14:44:15.612974379Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Topics Table Layout - 1, Topics Table Layout - 2, Topics Table Layout - 3, Topics Table Layout - 4
#
# The topics page renders topics in a react-bootstrap Table so the four columns
# line up across rows. The header row labels the columns; each body row carries
# the topic name, the relative-time label, the post count, and the follower
# count in that order, so a value never drifts into another column. Rows stay
# navigable to the topic feed, and the table scrolls horizontally when the four
# columns do not fit on a narrow screen.
Feature: Topics Table Layout

  Scenario: Topics Table Layout - 1 the topics table labels its four columns
    Given the psf-memo-db API serves a topic named "bitcoin" with 5 posts
    When I open the topics page
    Then the topics table has the column headers "Topic", "Most recent post", "Posts", "Followers"

  Scenario Outline: Topics Table Layout - 2 each topic's fields appear in the matching columns
    Given the current time is 1800000000000
    And the psf-memo-db API serves a topic named "<room>" with <postCount> posts
    And the topic "<room>" has <followerCount> followers
    And the topic "<room>" was last posted at <lastSeen>
    When I open the topics page
    Then the topics table row for "<room>" has the cells "<displayName>", "<label>", "<displayPostCount> posts" and "<displayFollowerCount> followers"

    Examples:
      | room    | postCount | followerCount | lastSeen      | displayName | label      | displayPostCount | displayFollowerCount |
      | bitcoin | 5         | 3             | 1799996400000 | #bitcoin    | 1 hour ago | 5                | 3                    |
      | cash    | 12        | 8             | 1799827200000 | #cash       | 2 days ago | 12               | 8                    |

  Scenario: Topics Table Layout - 3 a table row links to the topic feed
    Given the psf-memo-db API serves a topic named "bitcoin" with 5 posts
    When I open the topics page
    Then the topics table links the topic "bitcoin" to "/topics/bitcoin"

  Scenario: Topics Table Layout - 4 the topics table scrolls horizontally on narrow screens
    Given the psf-memo-db API serves a topic named "bitcoin" with 5 posts
    When I open the topics page
    Then the topics table scrolls horizontally on narrow screens
