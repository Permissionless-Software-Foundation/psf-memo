# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-26T12:20:44.218305772Z","feature_name":"Reply to a Memo","feature_path":"../../specs/reply-memo.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Reply to a Memo - 2 an empty reply is rejected","scenario_hash":"573c450bfab01f83d24545535cdaa4b2bb4c5617c092ff4f1532afa8dc0c20d2","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-26T12:20:44.218305772Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Reply to a Memo - 1, Reply to a Memo - 2, Reply to a Memo - 3, Reply to a Memo - 4, Reply to a Memo - 5, Reply to a Memo - 6, Reply to a Memo - 7, Reply to a Memo - 8
Feature: Reply to a Memo

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Reply to a Memo - 1 a valid reply to a post is broadcast and shown in the thread
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the thread shows a new reply from my address with the text "<message>"

    Examples:
      | message |
      | hello memo |
      | a longer reply with several words. |

  Scenario Outline: Reply to a Memo - 2 an empty reply is rejected
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the thread shows a validation error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      |  |

  Scenario Outline: Reply to a Memo - 3 an over-long reply is rejected
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the thread shows a length error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: Reply to a Memo - 4 the byte counter counts down from the reply limit
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I type a reply with the text "<message>"
    Then the thread shows a remaining byte count of <count>

    Examples:
      | message | count |
      |         | 184   |
      | hello   | 179   |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0     |

  Scenario Outline: Reply to a Memo - 5 a reply to a nested reply is broadcast
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    And the thread shows a nested reply with the txid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    When I type a reply to the nested reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the thread shows a new reply from my address with the text "<message>"

    Examples:
      | message |
      | hello nested |
      | a longer nested reply. |

  Scenario: Reply to a Memo - 6 the comment icon opens the thread even when a post has zero replies
    Given a post with the txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa has no replies
    When I click the comment icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then the thread modal opens for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario: Reply to a Memo - 7 the thread modal shows a reply form
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then the thread modal shows a reply form

  Scenario Outline: Reply to a Memo - 8 a reply with the authenticated wallet is broadcast from the feed thread modal
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the thread shows a new reply from my address with the text "<message>"

    Examples:
      | message |
      | hello memo |
      | a wallet-backed reply |
