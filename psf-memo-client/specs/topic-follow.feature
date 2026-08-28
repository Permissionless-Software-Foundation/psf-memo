# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-28T20:08:33.247012122Z","feature_name":"Topic Follow","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/topic-follow.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Topic Follow - 1, Topic Follow - 2, Topic Follow - 3, Topic Follow - 4
#
# The topic feed page has a Follow/Unfollow button that broadcasts a Memo
# topic follow (0x6d0d) or topic unfollow (0x6d0e) action. Unlike user
# follows, the topic payload is plain UTF-8 text (the topic name); no
# cashaddr conversion is needed.
Feature: Topic Follow

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Topic Follow - 1 the topic feed page shows a Follow button when I do not follow the topic
    Given the psf-memo-db API reports that I do not follow the topic <topic>
    Given I open the topic feed for the topic <topic>
    Then the topic feed page shows a Follow button

    Examples:
      | topic |
      | bitcoin |
      | cash |

  Scenario Outline: Topic Follow - 2 clicking Follow broadcasts the topic follow action and shows Unfollow
    Given I open the topic feed for the topic <topic>
    When I click the Follow button
    Then the app broadcasts an OP_RETURN transaction with the Memo topic-follow prefix for the topic <topic>
    Then the topic feed page shows an Unfollow button

    Examples:
      | topic |
      | bitcoin |

  Scenario Outline: Topic Follow - 3 clicking Unfollow broadcasts the topic unfollow action and shows Follow
    Given the psf-memo-db API reports that I follow the topic <topic>
    Given I open the topic feed for the topic <topic>
    When I click the Unfollow button
    Then the app broadcasts an OP_RETURN transaction with the Memo topic-unfollow prefix for the topic <topic>
    Then the topic feed page shows a Follow button

    Examples:
      | topic |
      | bitcoin |

  Scenario Outline: Topic Follow - 4 the topic feed page shows Unfollow when I already follow the topic
    Given the psf-memo-db API reports that I follow the topic <topic>
    Given I open the topic feed for the topic <topic>
    Then the topic feed page shows an Unfollow button

    Examples:
      | topic |
      | bitcoin |
      | cash |
