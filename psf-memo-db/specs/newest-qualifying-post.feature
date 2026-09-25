# Scenarios: Newest Qualifying Post - 1, Newest Qualifying Post - 2
#
# psf-memo-db exposes a read API that returns the newest confirmed qualifying
# post for one profile address. psf-memo-indexer uses it to establish a
# profile's recency when a set-profile transaction (0x6d05) arrives after the
# address has already posted, so the indexer no longer scans the
# addrPostHeights store across the REST boundary.
#
# A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
# A reply (tracked in postParents) and a poll creation (tracked in polls) do
# not qualify. A post above status.chainBlockHeight is unconfirmed and does not
# qualify. The newest confirmed qualifying post wins; at equal heights the
# greater seen wins. The read API returns that post's addr, blockHeight, and
# seen, or an empty response when the address has no qualifying post.
#
# Fixture "profiles-with-post-history" (defined in
# backfill-profile-recency.feature) holds profiles for alice, bob, and nopost.
# Alice's newest indexed entry is a reply and she also has a poll; bob's newest
# entry is above the chain tip; nopost has no indexed posts.
Feature: Newest Qualifying Post

  Background:
    Given a psf-memo-db instance with profiles, posts, addrPostHeights, postParents, polls, status, and profileRecency stores
    Given the fixture "profiles-with-post-history" is loaded into the profiles, posts, addrPostHeights, postParents, polls, status, and profileRecency stores

  Scenario Outline: Newest Qualifying Post - 1 the newest confirmed qualifying post is returned
    When the client requests the newest qualifying post for <addr>
    Then the newest qualifying post response is at block height <height> seen at <seen>

    Examples:
      | addr                    | height | seen |
      | bitcoincash:qaddr-alice | 600100 | 100  |
      | bitcoincash:qaddr-bob   | 600400 | 200  |

  Scenario: Newest Qualifying Post - 2 an address with no indexed post has no newest post
    When the client requests the newest qualifying post for bitcoincash:qaddr-nopost
    Then the newest qualifying post response is empty
