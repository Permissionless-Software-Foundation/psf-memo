# Scenarios: Efficient post indexing with postHeights secondary index - 1, Efficient post indexing with postHeights secondary index - 2, Efficient post indexing with postHeights secondary index - 3
Feature: Efficient post indexing with postHeights secondary index

  Background:
    Given a psf-memo-db instance with posts and postHeights stores
    Given a psf-memo-indexer configured to write to that database

  Scenario Outline: Efficient post indexing with postHeights secondary index - 1 a top-level post is stored with a postHeights index entry
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>"
    Then the posts store contains <count> post document for <txid>
    And the postHeights store contains <count> entry whose key starts with the block height <height> and ends with <txid>

    Examples:
      | txid     | addr                  | height | text  | count |
      | post-abc | bitcoincash:qaddr1   | 600100 | hello | 1     |
      | post-def | bitcoincash:qaddr2   | 600200 | world | 1     |

  Scenario Outline: Efficient post indexing with postHeights secondary index - 2 a reply is stored with a postHeights index entry for its reply body
    When the indexer processes a Memo reply transaction <txid> to parent <parentTxid> from <addr> at block height <height> with text "<text>"
    Then the posts store contains <count> post document for <txid>
    And the postHeights store contains <count> entry whose key starts with the block height <height> and ends with <txid>
    And the postParents store contains a link from <txid> to <parentTxid>
    And the postChildren store contains a link from <parentTxid> to <txid>

    Examples:
      | txid      | parentTxid | addr                  | height | text  | count |
      | reply-abc | post-abc   | bitcoincash:qaddr1   | 600150 | hi    | 1     |
      | reply-def | post-def   | bitcoincash:qaddr2   | 600250 | there | 1     |

  Scenario Outline: Efficient post indexing with postHeights secondary index - 3 reprocessing an existing post is idempotent
    When the indexer processes a Memo post transaction <txid> from <addr> at block height <height> with text "<text>"
    And the indexer processes the same Memo post transaction <txid> again
    Then the posts store contains <count> post document for <txid>
    And the postHeights store contains <count> entry whose key starts with the block height <height> and ends with <txid>

    Examples:
      | txid     | addr                  | height | text  | count |
      | post-ghi | bitcoincash:qaddr3   | 600300 | again | 1     |
