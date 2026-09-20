# mutation-stamp: sha256=a9cdc032be8bad4a0ec047df3de8eb08b8ef47e305626e5e0f979d84f159d257
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-20T22:26:26.477694996Z","feature_name":"Recent Profile Identity","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/recent-profile-identity.feature","background_hash":"f3df644832c7ba4bfe29da14ebe7c26c7ebc3d0e15db0b39854f6b69c593b670","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Recent Profile Identity - 1 GET /profile/recent returns each profile's display name and avatar","scenario_hash":"ed4ba1b33ac244e193e9fb24bfd845d351f00cabe5bd507dfe735d73055ecece","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-09-20T22:26:26.477694996Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Recent Profile Identity - 1
#
# GET /profile/recent returns each recent profile's current display name and
# avatar URL alongside the profile text and provenance it already returns. The
# names store (newest setName, 0x6d01) and the profilePics store (newest
# setProfilePic, 0x6d0a) are keyed by address, so the route joins each record
# into its profile by address. A profile with no name record reports a null
# display name, and a profile with no picture record reports a null avatar URL.
# The join does not change the profile order or the pagination metadata.
#
# Fixture "profiles-with-identities" (profiles, names, profilePics, and
# profileRecency stores). The profileRecency entries make each profile
# eligible for the recent list; their values are irrelevant to this identity
# join:
#   profiles:
#     bitcoincash:qaddr-alice { text: alice bio, txid: profile-alice, blockHeight: 600300, seen: 3 }
#     bitcoincash:qaddr-bob   { text: bob bio,   txid: profile-bob,   blockHeight: 600200, seen: 2 }
#     bitcoincash:qaddr-carol { text: carol bio, txid: profile-carol, blockHeight: 600100, seen: 1 }
#   profileRecency:
#     bitcoincash:qaddr-alice at 600300 seen 3
#     bitcoincash:qaddr-bob   at 600200 seen 2
#     bitcoincash:qaddr-carol at 600100 seen 1
#   names:
#     bitcoincash:qaddr-alice { name: alice, txid: name-alice, blockHeight: 600250 }
#     bitcoincash:qaddr-carol { name: carol, txid: name-carol, blockHeight: 600050 }
#   profilePics:
#     bitcoincash:qaddr-alice { url: https://example.com/alice.png, txid: pic-alice, blockHeight: 600260 }
#     bitcoincash:qaddr-bob   { url: https://example.com/bob.jpg,   txid: pic-bob,   blockHeight: 600150 }
Feature: Recent Profile Identity

  Background:
    Given a psf-memo-db instance with profiles, names, profilePics, and profileRecency stores
    Given the fixture "profiles-with-identities" is loaded into the profiles, names, profilePics, and profileRecency stores

  Scenario Outline: Recent Profile Identity - 1 GET /profile/recent returns each profile's display name and avatar
    When the client requests /profile/recent
    Then the response profile for <addr> has display name "<name>"
    And the response profile for <addr> has avatar "<avatar>"

    Examples:
      | addr | name | avatar |
      | bitcoincash:qaddr-alice | alice | https://example.com/alice.png |
      | bitcoincash:qaddr-bob   |       | https://example.com/bob.jpg   |
      | bitcoincash:qaddr-carol | carol |                               |
