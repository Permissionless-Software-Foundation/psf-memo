# Scenarios: Topic Discovery - 1, Topic Discovery - 2
#
# The topics page lists the topics served by the psf-memo-db /topics endpoint
# and links each one to its feed.
Feature: Topic Discovery

  Background:
    Given the psf-memo-db API serves a topic named "bitcoin" with 2 posts
    Given the psf-memo-db API serves a topic named "cash" with 1 post
    Given the psf-memo-db API serves a topic named "dev" with 1 post

  Scenario Outline: Topic Discovery - 1 the topics page lists each topic with its post count
    When I open the topics page
    Then the topics page shows the topic <topic> with <count> posts

    Examples:
      | topic | count |
      | bitcoin | 2 |
      | cash | 1 |
      | dev | 1 |

  Scenario Outline: Topic Discovery - 2 clicking a topic opens its feed
    Given I open the topics page
    When I click the topic <topic>
    Then the app navigates to the topic feed for <topic>

    Examples:
      | topic |
      | bitcoin |
      | cash |
