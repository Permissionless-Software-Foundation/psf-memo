# mutation-stamp: sha256=7a4add0ddfb90df56071a317562aba69f01720c8bfb6e7d9ca896739d9fedd79
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T15:47:56.749204947Z","feature_name":"Topic Feed","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topic-feed.feature","background_hash":"212981bdafb4c09397640bcc310003bd3ab68af4e8ae79f203de06ea583943bd","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Topic Feed - 1 the topic feed shows the posts for the topic","scenario_hash":"171aaf428a3afe5bb0371738bff19f2a3a4bf8240a90241504740d9586979659","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-08-28T15:47:56.749204947Z"}]}
# acceptance-mutation-manifest-end

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
