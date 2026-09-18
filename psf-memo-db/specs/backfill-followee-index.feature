# mutation-stamp: sha256=e4975e801aef2d680b216193bd14f8f719343cb7cf525518c49683acaae271a3
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T17:46:01.076189292Z","feature_name":"Backfill Followee Index","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/backfill-followee-index.feature","background_hash":"86bc340dd67bafdfccd84ee0e6abb21c72432d6bf3290a717227beffaeb06ab9","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Backfill Followee Index - 1 backfill indexes every follow record at its height","scenario_hash":"d66467adef27e9f41639f94cf6ddc0f4f3948dc8031dc0f9484dd6b9cd5300eb","mutation_count":15,"result":{"Total":15,"Killed":15,"Survived":0,"Errors":0},"tested_at":"2026-09-18T17:46:01.076189292Z"},{"index":1,"name":"Backfill Followee Index - 2 backfill is idempotent","scenario_hash":"17d3d2c5e211167141fc6d9fb3b087cdd71ed1ba1aaee5e279b75c628e53abc7","mutation_count":5,"result":{"Total":5,"Killed":5,"Survived":0,"Errors":0},"tested_at":"2026-09-18T17:46:01.076189292Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Backfill Followee Index - 1, Backfill Followee Index - 2
#
# followeeHeights is a new notification read index. Existing follows store
# records predate it, so the backfill utility writes one followeeHeights entry
# per follows record at that record's latest block height. It rebuilds from the
# follows store only, is idempotent, and leaves the follows store unchanged.
#
# Fixture "follows-by-followee":
#   viewer   = bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue
#   follows: followerA:viewer unfollow false at 690400
#            followerB:viewer unfollow true  at 690600
#            followerC:other  unfollow false at 690200
Feature: Backfill Followee Index

  Background:
    Given a psf-memo-db instance with follows and followeeHeights stores
    Given the fixture "follows-by-followee" is loaded into the follows store

  Scenario Outline: Backfill Followee Index - 1 backfill indexes every follow record at its height
    When the followee index backfill utility is run
    Then the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <height> marked unfollow <unfollow>

    Examples:
      | followee                                             | follower                                             | height | unfollow | count |
      | bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue | bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf | 690400 | false    | 1     |
      | bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue | bitcoincash:qqenxvenxvenxvenxvenxvenxvenxvenxvn254yg3p | 690600 | true     | 1     |
      | bitcoincash:qpzyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs7fn3s6pt | bitcoincash:qp24242424242424242424242424242425wtjflljr | 690200 | false    | 1     |

  Scenario Outline: Backfill Followee Index - 2 backfill is idempotent
    When the followee index backfill utility is run
    And the followee index backfill utility is run again
    Then the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <height> marked unfollow <unfollow>

    Examples:
      | followee                                             | follower                                             | height | unfollow | count |
      | bitcoincash:qqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zye3kwllue | bitcoincash:qq3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygrg4dtdzf | 690400 | false    | 1     |
