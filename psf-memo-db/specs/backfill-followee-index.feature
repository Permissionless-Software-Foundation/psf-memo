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
