# Scenarios: Recent Profile Identity - 1
#
# GET /profile/recent returns each recent profile's current display name and
# avatar URL alongside the profile text and provenance it already returns. The
# names store (newest setName, 0x6d01) and the profilePics store (newest
# setProfilePic, 0x6d0a) are keyed by address, so the route joins each record
# into its profile by address. A profile with no name record reports a null
# display name, and a profile with no picture record reports a null avatar URL.
# The join does not change the profile order (block height descending) or the
# pagination metadata.
#
# Fixture "profiles-with-identities" (profiles, names, and profilePics stores):
#   profiles:
#     bitcoincash:qaddr-alice { text: alice bio, txid: profile-alice, blockHeight: 600300, seen: 3 }
#     bitcoincash:qaddr-bob   { text: bob bio,   txid: profile-bob,   blockHeight: 600200, seen: 2 }
#     bitcoincash:qaddr-carol { text: carol bio, txid: profile-carol, blockHeight: 600100, seen: 1 }
#   names:
#     bitcoincash:qaddr-alice { name: alice, txid: name-alice, blockHeight: 600250 }
#     bitcoincash:qaddr-carol { name: carol, txid: name-carol, blockHeight: 600050 }
#   profilePics:
#     bitcoincash:qaddr-alice { url: https://example.com/alice.png, txid: pic-alice, blockHeight: 600260 }
#     bitcoincash:qaddr-bob   { url: https://example.com/bob.jpg,   txid: pic-bob,   blockHeight: 600150 }
Feature: Recent Profile Identity

  Background:
    Given a psf-memo-db instance with profiles, names, and profilePics stores
    Given the fixture "profiles-with-identities" is loaded into the profiles, names, and profilePics stores

  Scenario Outline: Recent Profile Identity - 1 GET /profile/recent returns each profile's display name and avatar
    When the client requests /profile/recent
    Then the response profile for <addr> has display name "<name>"
    And the response profile for <addr> has avatar "<avatar>"

    Examples:
      | addr | name | avatar |
      | bitcoincash:qaddr-alice | alice | https://example.com/alice.png |
      | bitcoincash:qaddr-bob   |       | https://example.com/bob.jpg   |
      | bitcoincash:qaddr-carol | carol |                               |
