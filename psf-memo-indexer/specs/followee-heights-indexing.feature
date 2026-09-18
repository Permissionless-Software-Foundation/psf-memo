# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T17:46:08.065872032Z","feature_name":"Followee Heights Indexing","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/followee-heights-indexing.feature","background_hash":"0e27f59e6c58a7ab6e2ed4bddb0aa2546262d29a4486edae02633b8a48a62c48","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Followee Heights Indexing - 1, Followee Heights Indexing - 2, Followee Heights Indexing - 3
#
# GET /posts/notifications/:addr lists the follows of the viewer. The follows
# store is keyed <followerAddr>:<followeePkHash>, so finding the viewer's
# followers requires scanning the whole follows store. This feature adds a
# followee-keyed, height-ordered index that the read side can range-scan for
# only the viewer's recent follows:
#
#   followeeHeights key   = <followeePkHash>:<padded blockHeight>:<followerAddr>
#   followeeHeights value = { followerAddr, followeePkHash, unfollow, txid, seen, blockHeight }
#
# Every follow action (follow or unfollow) writes one entry at its block
# height. The read side takes the newest entry per follower and ignores
# unfollows, so an unfollow removes the notification without deleting the
# event history. The follows store remains the source of truth for the
# current follow graph; followeeHeights is a notification read index.
Feature: Followee Heights Indexing

  Background:
    Given a psf-memo-db instance with follows and followeeHeights stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Followee Heights Indexing - 1 a follow records an entry for the followee
    When the indexer processes a Memo follow of <followee> from <follower> at block height <height>
    Then the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <height> marked unfollow false

    Examples:
      | follower                                             | followee                                             | height | count |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 690100 | 1     |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 690200 | 1     |

  Scenario Outline: Followee Heights Indexing - 2 an unfollow records a second entry marked unfollow
    When the indexer processes a Memo follow of <followee> from <follower> at block height <height>
    And the indexer processes a Memo unfollow of <followee> from <follower> at block height <unfollowHeight>
    Then the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <height> marked unfollow false
    And the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <unfollowHeight> marked unfollow true

    Examples:
      | follower                                             | followee                                             | height | unfollowHeight | count |
      | bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 690100 | 690900         | 1     |

  Scenario Outline: Followee Heights Indexing - 3 reprocessing a follow is idempotent
    When the indexer processes a Memo follow of <followee> from <follower> at block height <height>
    And the indexer processes the same Memo follow of <followee> from <follower> again
    Then the followeeHeights store contains <count> entry for followee <followee> from <follower> at block height <height> marked unfollow false

    Examples:
      | follower                                             | followee                                             | height | count |
      | bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | 690300 | 1     |
