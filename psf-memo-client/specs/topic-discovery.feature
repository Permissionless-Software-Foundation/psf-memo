# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T15:47:49.672413738Z","feature_name":"Topic Discovery","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topic-discovery.feature","background_hash":"4fc484640e93176d3d99184676c1a1e3b8d9699815a6c7fb171a96a3284f269e","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Topic Discovery - 1 the topics page lists each topic with its post count","scenario_hash":"ac5c4f331488c4c438534e51f0e29ee3023245f542114e435cc631d8d59b57d9","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-08-28T15:47:49.672413738Z"}]}
# acceptance-mutation-manifest-end

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
