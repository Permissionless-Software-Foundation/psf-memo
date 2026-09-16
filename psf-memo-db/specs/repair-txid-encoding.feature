# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-16T22:24:03.359920055Z","feature_name":"Repair txid encoding","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-db/specs/repair-txid-encoding.feature","background_hash":"102ec6cf98fcd7e4ef6107baa6284bd1b425d2a2e9716f86bbff8aa3ecf39273","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Repair txid encoding - 3 the repair utility corrects reversed poll option and vote references","scenario_hash":"87dcb9d331d2293c81385b9fa3e26b445626a94f2780b50d3dfa36264d062901","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-09-16T22:24:03.359920055Z"},{"index":3,"name":"Repair txid encoding - 4 the repair utility leaves correctly-encoded references unchanged","scenario_hash":"bd644eb959c765fa80d54b8d4bc2a413b87e5d125f3491cddb129f9754846e96","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-16T22:24:03.359920055Z"},{"index":4,"name":"Repair txid encoding - 5 the repair utility leaves an unknown reference unchanged","scenario_hash":"e8fcfddce1ae48596f7ef21e6de50d7962fea6eb2a37313ce69a1e22c2a08aaa","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-16T22:24:03.359920055Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Repair txid encoding - 1, Repair txid encoding - 2, Repair txid encoding - 3, Repair txid encoding - 4, Repair txid encoding - 5, Repair txid encoding - 6
#
# Older psf-memo-client broadcasts embedded a referenced txid in big-endian
# display order. The indexer expected little-endian wire order, so it stored a
# byte-reversed reference in the likes, postLikes, postParents, postChildren,
# pollOptions, and pollVotes stores. The txid repair utility rewrites a
# reversed reference to display order and rebuilds the affected secondary
# index. It leaves correctly-encoded records untouched, leaves references whose
# target is unknown in either byte order untouched, and is idempotent.
Feature: Repair txid encoding

  Background:
    Given a psf-memo-db instance with posts, likes, postLikes, postParents, postChildren, polls, pollOptions, and pollVotes stores
    Given the fixture "db-with-reversed-txid-references" is loaded

  Scenario Outline: Repair txid encoding - 1 the repair utility corrects a reversed like reference
    When the txid repair utility is run
    Then the likes store maps like <likeTxid> to post <postTxid>
    Then the postLikes store contains 1 entry whose key starts with <postTxid> and ends with <likeTxid>
    Then the postLikes store contains 0 entry whose key starts with <reversedPostTxid> and ends with <likeTxid>

    Examples:
      | likeTxid | postTxid                                                         | reversedPostTxid                                                 |
      | like-1   | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301 |

  Scenario Outline: Repair txid encoding - 2 the repair utility corrects a reversed reply reference
    When the txid repair utility is run
    Then the postParents store maps reply <replyTxid> to parent <postTxid>
    Then the postChildren store contains 1 entry whose key starts with <postTxid> and ends with <replyTxid>
    Then the postChildren store contains 0 entry whose key starts with <reversedPostTxid> and ends with <replyTxid>

    Examples:
      | replyTxid | postTxid                                                         | reversedPostTxid                                                 |
      | reply-1   | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301 |

  Scenario Outline: Repair txid encoding - 3 the repair utility corrects reversed poll option and vote references
    When the txid repair utility is run
    Then the pollOptions store maps option <optionTxid> to poll <pollTxid>
    Then the pollVotes store maps vote <voteTxid> to poll <pollTxid>

    Examples:
      | optionTxid | voteTxid | pollTxid                                                         |
      | option-1   | vote-1   | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff |

  Scenario Outline: Repair txid encoding - 4 the repair utility leaves correctly-encoded references unchanged
    When the txid repair utility is run
    Then the likes store maps like <likeTxid> to post <postTxid>
    Then the postParents store maps reply <replyTxid> to parent <postTxid>
    Then the pollOptions store maps option <optionTxid> to poll <pollTxid>
    Then the pollVotes store maps vote <voteTxid> to poll <pollTxid>

    Examples:
      | likeTxid | replyTxid | optionTxid | voteTxid | postTxid                                                         | pollTxid                                                         |
      | like-2   | reply-2   | option-2   | vote-2   | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff |

  Scenario Outline: Repair txid encoding - 5 the repair utility leaves an unknown reference unchanged
    When the txid repair utility is run
    Then the likes store maps like <likeTxid> to post <postTxid>

    Examples:
      | likeTxid | postTxid                                                         |
      | like-3   | deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef |

  Scenario Outline: Repair txid encoding - 6 the repair utility is idempotent
    When the txid repair utility is run
    And the txid repair utility is run again
    Then the postLikes store contains 1 entry whose key starts with <postTxid> and ends with <likeTxid>
    Then the postLikes store contains 0 entry whose key starts with <reversedPostTxid> and ends with <likeTxid>
    Then the postChildren store contains 1 entry whose key starts with <postTxid> and ends with <replyTxid>
    Then the postChildren store contains 0 entry whose key starts with <reversedPostTxid> and ends with <replyTxid>

    Examples:
      | likeTxid | replyTxid | postTxid                                                         | reversedPostTxid                                                 |
      | like-1   | reply-1   | 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301 |
