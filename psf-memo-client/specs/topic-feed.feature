# Scenarios: Topic Feed - 1, Topic Feed - 2
#
# The topic feed page shows the posts served by the psf-memo-db
# /topics/:room/posts endpoint for a single topic.
Feature: Topic Feed

  Background:
    Given the psf-memo-db API serves a post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa in the topic "bitcoin" authored by the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d with text "hello bitcoin"
    Given the psf-memo-db API serves a post with txid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb in the topic "bitcoin" authored by a second address with text "bitcoin again"

  Scenario Outline: Topic Feed - 1 the topic feed shows the posts for the topic
    When I open the topic feed for <topic>
    Then the feed shows the post with txid <txid> with text <text>

    Examples:
      | topic | txid | text |
      | bitcoin | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | hello bitcoin |
      | bitcoin | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | bitcoin again |

  Scenario: Topic Feed - 2 a topic with no posts shows an empty message
    Given the psf-memo-db API serves no posts for the topic "lone"
    When I open the topic feed for "lone"
    Then the feed shows a message that there are no posts
