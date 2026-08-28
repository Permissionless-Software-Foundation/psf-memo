# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T05:15:33.889716973Z","feature_name":"Address and like indexing","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-indexer/specs/addr-and-like-indexing.feature","background_hash":"b101284b0969f57e8cd628a2b644538ae5a1d8c7466422ba3338457cbf8c4f79","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Address and like indexing - 1, Address and like indexing - 2, Address and like indexing - 3, Address and like indexing - 4
Feature: Address and like indexing

  Background:
    Given a psf-memo-db instance with posts, postHeights, addrPostHeights, likes, and postLikes stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Address and like indexing - 1 a top-level post is stored with an addrPostHeights index entry
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>"
    Then the addrPostHeights store contains <count> entry whose key starts with <addr> and ends with <txid>

    Examples:
      | txid     | addr                | height | text  | count |
      | post-abc | bitcoincash:qaddr1  | 600100 | hello | 1     |
      | post-def | bitcoincash:qaddr2  | 600200 | world | 1     |

  Scenario Outline: Address and like indexing - 2 a reply is stored with an addrPostHeights index entry for its reply body
    When the indexer processes a Memo reply transaction <txid> to parent <parentTxid> from <addr> at block height <height> with text "<text>"
    Then the addrPostHeights store contains <count> entry whose key starts with <addr> and ends with <txid>

    Examples:
      | txid      | parentTxid | addr                | height | text | count |
      | reply-abc | post-abc   | bitcoincash:qaddr1  | 600150 | hi   | 1     |

  Scenario Outline: Address and like indexing - 3 a like is stored with a postLikes index entry
    When the indexer processes a Memo like transaction <txid> for post <postTxid> from <addr> at block height <height>
    Then the postLikes store contains <count> entry whose key starts with <postTxid> and ends with <txid>

    Examples:
      | txid   | postTxid | addr                | height | count |
      | like-1 | post-abc | bitcoincash:liker1  | 600101 | 1     |
      | like-2 | post-def | bitcoincash:liker2  | 600201 | 1     |

  Scenario Outline: Address and like indexing - 4 reprocessing an existing post is idempotent
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>"
    And the indexer processes the same Memo post transaction <txid> again
    Then the addrPostHeights store contains <count> entry whose key starts with <addr> and ends with <txid>

    Examples:
      | txid     | addr                | height | text  | count |
      | post-ghi | bitcoincash:qaddr3  | 600300 | again | 1     |
