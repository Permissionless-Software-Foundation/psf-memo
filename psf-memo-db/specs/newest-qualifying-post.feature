# mutation-stamp: sha256=0f17bb75cfb4aafe389e2752ad73384af9e34403a5302eeb2104ceda626c9442
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-25T17:29:33.789815821Z","feature_name":"Newest Qualifying Post","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/newest-qualifying-post.feature","background_hash":"9f29f1fd1af8398c20a9345845798f4d950d7074d138b4acd70ea111b8cf1017","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Newest Qualifying Post - 1 the newest confirmed qualifying post is returned","scenario_hash":"ff3f5722d287ac72dddb7bd353a53617fc881774ff422c844dacea515779dd76","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-25T17:29:33.789815821Z"}]}
# acceptance-mutation-manifest-end

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
