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
