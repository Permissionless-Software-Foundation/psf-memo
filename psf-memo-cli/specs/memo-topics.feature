# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-07T20:56:12.080571941Z","feature_name":"Memo Topics","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-topics.feature","background_hash":"71d1a7cddb2cf113a7b2bdc7995c6b6b50649a24083e20f4c36d4783594e39c9","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Memo Topics - 3 each reported topic keeps its metadata","scenario_hash":"23016291c6091e970813dcca1007d8a2e219b47441c56b64960bbe14c0927756","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-07T20:56:12.080571941Z"}]}
# acceptance-mutation-manifest-end

# Memo Topics (R7): the psf-memo-cli read command for the topic list. It reads
# one page of GET /topics and reports the returned topics (room, post count,
# last-post time as the epoch-ms lastSeen, and follower count) in the service's
# order (most recent post first, follow-only rooms last) and the service
# pagination unchanged (limit, offset, total, hasMore; X6). Read-only: no
# wallet, no broadcast. A failed request is an error (exit 1). Adopts the shared
# F5 output contract, so --json prints one JSON object to stdout.
#
# Scenarios: Memo Topics - 1, Memo Topics - 2, Memo Topics - 3, Memo Topics - 4, Memo Topics - 5
Feature: Memo Topics

  Background:
    Given the Memo DB service serves the topics list

  Scenario: Memo Topics - 1 the command reads the newest topics by default
    When the memo-topics command runs
    Then the service received a topics request with limit 50 and offset 0
    And the command reported the topic rooms "memo, cash, dance, anime, lone"
    And the command reported pagination total 5 and hasMore false

  Scenario Outline: Memo Topics - 2 the command returns the requested page
    When the memo-topics command runs with limit <limit> and offset <offset>
    Then the command reported the topic rooms "<rooms>"
    And the command reported pagination total 5 and hasMore <hasMore>

    Examples:
      | limit | offset | rooms                          | hasMore |
      | 2     | 0      | memo, cash                     | true    |
      | 2     | 2      | dance, anime                   | true    |
      | 2     | 4      | lone                           | false   |
      | 5     | 0      | memo, cash, dance, anime, lone | false   |

  Scenario Outline: Memo Topics - 3 each reported topic keeps its metadata
    When the memo-topics command runs
    Then the command reported the topic "<room>" with lastSeen <lastSeen>, post count <postCount>, and follower count <followerCount>

    Examples:
      | room | lastSeen      | postCount | followerCount |
      | memo | 1700020000000 | 5         | 12            |
      | cash | 1700010000000 | 2         | 4             |
      | lone | 0             | 0         | 7             |

  Scenario: Memo Topics - 4 an empty topic list reports no topics
    Given the topics list is empty
    When the memo-topics command runs
    Then the command reported 0 topics
    And the command reported pagination total 0 and hasMore false

  Scenario: Memo Topics - 5 a failed request reports the error
    Given the topics request fails
    When the memo-topics command runs
    Then the memo-topics command reported an error
