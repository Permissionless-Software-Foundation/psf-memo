# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-20T22:26:28.547784872Z","feature_name":"Profile Recency Indexing","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/profile-recency-indexing.feature","background_hash":"2b6c5e5cbd326861a7a295e201fdba1c1dbf847d7b65909821167cdb138f47ef","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Profile Recency Indexing - 1, Profile Recency Indexing - 2, Profile Recency Indexing - 3, Profile Recency Indexing - 4, Profile Recency Indexing - 5, Profile Recency Indexing - 6, Profile Recency Indexing - 7, Profile Recency Indexing - 8, Profile Recency Indexing - 9, Profile Recency Indexing - 10
#
# The indexer maintains a profileRecency store so the read side can list
# profiles by their author's most recent post without scanning every post or
# sorting every profile. profileRecency holds one record per profile address
# that has at least one qualifying post, carrying that post's blockHeight and
# seen.
#
# A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c).
# Replies (0x6d03) and poll creations (0x6d10) do not qualify. Recency is only
# written for addresses that have a set-profile record (0x6d05), so an address
# that has posted but never set a profile is absent.
#
# Recency reflects confirmed blocks only: a post first seen in the mempool does
# not create or change a profileRecency record, and the record is written when
# the block containing that post is indexed. Processing qualifying posts in any
# order converges on the greatest height, with seen as the tie-breaker at equal
# heights, so a replay never regresses a profile's recency.
Feature: Profile Recency Indexing

  Background:
    Given a psf-memo-db instance with profiles and profileRecency stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Profile Recency Indexing - 1 a confirmed top-level post records the author's recency
    Given the psf-memo-db stores a profile for <addr>
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>" seen at <seen>
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                | txid    | height | text  | seen |
      | bitcoincash:qaddr-a | post-a1 | 600100 | hello | 1000 |
      | bitcoincash:qaddr-b | post-b1 | 600250 | world | 2000 |

  Scenario Outline: Profile Recency Indexing - 2 a confirmed topic post records the author's recency
    Given the psf-memo-db stores a profile for <addr>
    When the indexer processes a Memo topic message <txid> in room "<room>" from <addr> at block height <height> with text "<text>" seen at <seen>
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                | txid     | room    | height | text | seen |
      | bitcoincash:qaddr-a | topic-a1 | bitcoin | 600300 | gm   | 3000 |
      | bitcoincash:qaddr-b | topic-b1 | cash    | 600150 | hi   | 1500 |

  Scenario Outline: Profile Recency Indexing - 3 the greatest height wins regardless of processing order
    Given the psf-memo-db stores a profile for <addr>
    When the indexer processes a Memo post transaction <firstTxid> from <addr> at block height <firstHeight> with text "first" seen at <firstSeen>
    And the indexer processes a Memo post transaction <secondTxid> from <addr> at block height <secondHeight> with text "second" seen at <secondSeen>
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                | firstTxid | firstHeight | firstSeen | secondTxid | secondHeight | secondSeen | height | seen |
      | bitcoincash:qaddr-a | post-a1   | 600100      | 100       | post-a2    | 600200       | 200        | 600200 | 200  |
      | bitcoincash:qaddr-b | post-b1   | 600200      | 100       | post-b2    | 600100       | 200        | 600200 | 100  |

  Scenario Outline: Profile Recency Indexing - 4 a reply does not change the recency
    Given the psf-memo-db stores a profile for <addr>
    When the indexer processes a Memo post transaction <postTxid> from <addr> at block height <postHeight> with text "root" seen at 100
    And the indexer processes a Memo reply transaction <replyTxid> to parent <postTxid> from <addr> at block height <replyHeight> with text "reply"
    Then the profileRecency store records <addr> at block height <postHeight> seen at 100

    Examples:
      | addr                | postTxid | postHeight | replyTxid | replyHeight |
      | bitcoincash:qaddr-a | post-a1  | 600100     | reply-a1  | 600200      |
      | bitcoincash:qaddr-b | post-b1  | 600300     | reply-b1  | 600400      |

  Scenario Outline: Profile Recency Indexing - 5 a poll creation does not change the recency
    Given the psf-memo-db stores a profile for bitcoincash:qaddr-a
    When the indexer processes a Memo post transaction <postTxid> from bitcoincash:qaddr-a at block height <postHeight> with text "root" seen at 100
    And the indexer processes a create-poll transaction with the question "<question>" and 2 options
    Then the profileRecency store records bitcoincash:qaddr-a at block height <postHeight> seen at 100

    Examples:
      | postTxid | postHeight | question   |
      | post-a1  | 600050     | best coin? |
      | post-a2  | 600070     | lunch?     |

  Scenario Outline: Profile Recency Indexing - 6 an author without a profile gets no recency record
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "hi" seen at 100
    Then the profileRecency store has no record for <addr>

    Examples:
      | addr                        | txid    | height |
      | bitcoincash:qaddr-noprofile | post-n1 | 600100 |
      | bitcoincash:qaddr-other     | post-o1 | 600200 |

  Scenario Outline: Profile Recency Indexing - 7 setting a profile after posting establishes the recency
    When the indexer processes a Memo post transaction <postTxid> from <addr> at block height <postHeight> with text "old post" seen at 100
    And the indexer processes a Memo reply transaction <replyTxid> to parent <postTxid> from <addr> at block height <replyHeight> with text "newer reply"
    And the indexer processes a set-profile transaction for <addr> with text "my bio"
    Then the profileRecency store records <addr> at block height <postHeight> seen at 100

    Examples:
      | addr                | postTxid | postHeight | replyTxid | replyHeight |
      | bitcoincash:qaddr-a | post-a1  | 600100     | reply-a1  | 600300      |
      | bitcoincash:qaddr-b | post-b1  | 600200     | reply-b1  | 600250      |

  Scenario Outline: Profile Recency Indexing - 8 setting a profile with no qualifying post creates no recency record
    When the indexer processes a set-profile transaction for <addr> with text "my bio"
    Then the profileRecency store has no record for <addr>

    Examples:
      | addr                |
      | bitcoincash:qaddr-a |
      | bitcoincash:qaddr-b |

  Scenario Outline: Profile Recency Indexing - 9 an unconfirmed post does not affect recency until its block is indexed
    Given the psf-memo-db stores a profile for <addr>
    When the transaction indexer sees a Memo post transaction <txid> from <addr> at block height <height> with text "mempool"
    Then the profileRecency store has no record for <addr>
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "mempool" seen at <seen>
    Then the profileRecency store records <addr> at block height <height> seen at <seen>

    Examples:
      | addr                | txid    | height | seen |
      | bitcoincash:qaddr-a | post-a1 | 600100 | 1000 |
      | bitcoincash:qaddr-b | post-b1 | 600400 | 4000 |

  Scenario Outline: Profile Recency Indexing - 10 reprocessing a qualifying post is idempotent
    Given the psf-memo-db stores a profile for <addr>
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "hi" seen at 100
    And the indexer processes the same Memo post transaction <txid> again
    Then the profileRecency store records <addr> at block height <height> seen at 100

    Examples:
      | addr                | txid    | height |
      | bitcoincash:qaddr-a | post-a1 | 600100 |
      | bitcoincash:qaddr-b | post-b1 | 600200 |
