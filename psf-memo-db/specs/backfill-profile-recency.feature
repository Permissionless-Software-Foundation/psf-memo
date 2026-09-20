# mutation-stamp: sha256=010763f046b5bdd82c95d9992d35c34fa82155245f35148808d945fcef2a7d72
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-20T22:26:06.447781649Z","feature_name":"Backfill profile recency","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/backfill-profile-recency.feature","background_hash":"9f29f1fd1af8398c20a9345845798f4d950d7074d138b4acd70ea111b8cf1017","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Backfill profile recency - 1 backfill records each profile's newest confirmed qualifying post","scenario_hash":"7926ea450d3754a5bfe456b5c8e61648d7ac7d1ada17288cb4c97b937e9c127a","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-20T22:26:06.447781649Z"},{"index":2,"name":"Backfill profile recency - 3 backfill is idempotent","scenario_hash":"594c743f466022e0ff0008efce7f2134cfe2c12845c8da4eaebab2da510c4f6a","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-20T22:26:06.447781649Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Backfill profile recency - 1, Backfill profile recency - 2, Backfill profile recency - 3
#
# The profile recency backfill builds the profileRecency store from existing
# data so the read side can serve /profile/recent without a reindex. For each
# profile address it finds the newest confirmed qualifying post from the
# addrPostHeights index, using the posts store for the post's seen time and
# the postParents and polls stores to exclude replies and poll creations.
# Entries above status.chainBlockHeight are unconfirmed and ignored. Addresses
# with no qualifying post get no record. Running the backfill twice is
# idempotent.
#
# Fixture "profiles-with-post-history":
#   profiles store:
#     bitcoincash:qaddr-alice   { text: alice bio,  txid: profile-alice }
#     bitcoincash:qaddr-bob     { text: bob bio,    txid: profile-bob }
#     bitcoincash:qaddr-nopost  { text: nopost bio, txid: profile-nopost }
#   posts store:
#     post-a1  { addr: bitcoincash:qaddr-alice, seen: 100, blockHeight: 600100 }
#     reply-a1 { addr: bitcoincash:qaddr-alice, seen: 150, blockHeight: 600300 }
#     post-b1  { addr: bitcoincash:qaddr-bob,   seen: 200, blockHeight: 600400 }
#     post-b2  { addr: bitcoincash:qaddr-bob,   seen: 250, blockHeight: 600500 }
#   addrPostHeights store:
#     bitcoincash:qaddr-alice:post-a1   at 600100
#     bitcoincash:qaddr-alice:reply-a1  at 600300
#     bitcoincash:qaddr-alice:poll-a1   at 600200
#     bitcoincash:qaddr-bob:post-b1     at 600400
#     bitcoincash:qaddr-bob:post-b2     at 600500
#   postParents store: reply-a1 -> post-a1
#   polls store: poll-a1
#   status store: chainBlockHeight 600450 (post-b2 is above it and unconfirmed)
Feature: Backfill profile recency

  Background:
    Given a psf-memo-db instance with profiles, posts, addrPostHeights, postParents, polls, status, and profileRecency stores
    Given the fixture "profiles-with-post-history" is loaded into the profiles, posts, addrPostHeights, postParents, polls, status, and profileRecency stores

  Scenario Outline: Backfill profile recency - 1 backfill records each profile's newest confirmed qualifying post
    When the profile recency backfill utility is run
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                    | height | seen |
      | bitcoincash:qaddr-alice | 600100 | 100  |
      | bitcoincash:qaddr-bob   | 600400 | 200  |

  Scenario: Backfill profile recency - 2 a profile with no qualifying post gets no recency record
    When the profile recency backfill utility is run
    Then the profileRecency store has no record for bitcoincash:qaddr-nopost

  Scenario Outline: Backfill profile recency - 3 backfill is idempotent
    When the profile recency backfill utility is run
    And the profile recency backfill utility is run again
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                    | height | seen |
      | bitcoincash:qaddr-alice | 600100 | 100  |
      | bitcoincash:qaddr-bob   | 600400 | 200  |
