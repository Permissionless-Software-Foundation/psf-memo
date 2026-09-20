# Scenarios: Recent Profile Ordering - 1, Recent Profile Ordering - 2, Recent Profile Ordering - 3, Recent Profile Ordering - 4
#
# GET /profile/recent lists one row per profile address that has at least one
# confirmed qualifying post. Rows are ordered by the most recent qualifying
# post's block height descending, then that post's seen descending, then the
# address ascending. Each row reports the profile's text, provenance txid,
# display name, and avatar; its Block and Seen columns report the most recent
# qualifying post's blockHeight and seen, not the set-profile transaction's.
# A profile with no qualifying post is omitted and does not count toward
# pagination.total.
#
# The page is served from the profileRecency index plus per-page profile
# lookups, so it never scans the addrPostHeights store and never sorts every
# profile to find the page.
#
# Fixture "profiles-with-post-recency":
#   profiles store (the set-profile records; their own blockHeight/seen differ
#   from the recency values so the two cannot be confused):
#     bitcoincash:qaddr-alice { text: alice bio, txid: profile-alice, blockHeight: 600010, seen: 10 }
#     bitcoincash:qaddr-bob   { text: bob bio,   txid: profile-bob,   blockHeight: 600020, seen: 20 }
#     bitcoincash:qaddr-erin  { text: erin bio,  txid: profile-erin,  blockHeight: 600030, seen: 30 }
#     bitcoincash:qaddr-carol { text: carol bio, txid: profile-carol, blockHeight: 600040, seen: 40 }
#     bitcoincash:qaddr-dave  { text: dave bio,  txid: profile-dave,  blockHeight: 600050, seen: 50 }
#   profileRecency store (the newest qualifying post per profile):
#     bitcoincash:qaddr-alice at 600300 seen 300
#     bitcoincash:qaddr-bob   at 600300 seen 200
#     bitcoincash:qaddr-erin  at 600300 seen 200
#     bitcoincash:qaddr-carol at 600200 seen 400
#     (bitcoincash:qaddr-dave has never posted, so it has no recency record)
Feature: Recent Profile Ordering

  Background:
    Given a psf-memo-db instance with profiles and profileRecency stores
    Given the fixture "profiles-with-post-recency" is loaded into the profiles and profileRecency stores

  Scenario Outline: Recent Profile Ordering - 1 GET /profile/recent orders profiles by their most recent post
    When the client requests /profile/recent with limit <limit> and offset <offset>
    Then the response lists profiles in order (<expected_addrs>)
    And the response pagination shows total <total> and hasMore <hasMore>

    Examples:
      | limit | offset | expected_addrs                                        | total | hasMore |
      | 2     | 0      | bitcoincash:qaddr-alice,bitcoincash:qaddr-bob          | 4     | true    |
      | 2     | 2      | bitcoincash:qaddr-erin,bitcoincash:qaddr-carol         | 4     | false   |
      | 1     | 1      | bitcoincash:qaddr-bob                                  | 4     | true    |
      | 5     | 0      | bitcoincash:qaddr-alice,bitcoincash:qaddr-bob,bitcoincash:qaddr-erin,bitcoincash:qaddr-carol | 4 | false |

  Scenario Outline: Recent Profile Ordering - 2 each row reports the most recent post's block and seen
    When the client requests /profile/recent with limit 5 and offset 0
    Then the response profile for <addr> has block height <height> and seen <seen>

    Examples:
      | addr                    | height | seen |
      | bitcoincash:qaddr-alice | 600300 | 300  |
      | bitcoincash:qaddr-bob   | 600300 | 200  |
      | bitcoincash:qaddr-carol | 600200 | 400  |

  Scenario: Recent Profile Ordering - 3 a profile with no qualifying post is omitted
    When the client requests /profile/recent with limit 5 and offset 0
    Then the response lists profiles in order (bitcoincash:qaddr-alice,bitcoincash:qaddr-bob,bitcoincash:qaddr-erin,bitcoincash:qaddr-carol)
    And the response does not list bitcoincash:qaddr-dave

  Scenario: Recent Profile Ordering - 4 the read does not iterate addrPostHeights
    When the client requests /profile/recent with limit 5 and offset 0
    Then the addrPostHeights store was not iterated
