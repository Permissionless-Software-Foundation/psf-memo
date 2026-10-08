# Scenarios: New Topic - 1, New Topic - 2, New Topic - 3, New Topic - 4, New Topic - 5, New Topic - 6, New Topic - 7, New Topic - 8
#
# The topics page offers a "New Topic" entry point that opens /topics/new. The
# new topic page has a topic name field and a first message field; submitting
# broadcasts one Memo topic-message action (0x6d0c) carrying the room and the
# first message, then lands on the new topic's feed with the message shown.
# The topic name is normalized to a lowercase room with a leading "#" removed.
# Creating a topic is the same on-chain action as posting to a topic: there is
# no separate "create" action byte, and no indexer or DB change is needed. This
# is a client-only feature in psf-memo-client.
Feature: New Topic

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario: New Topic - 1 the topics page offers to create a new topic
    Given I open the topics page
    Then the topics page shows a New Topic button
    When I click the New Topic button
    Then I navigate to the path /topics/new

  Scenario: New Topic - 2 the new topic page has a topic name field and a first message field
    Given I navigate to the path /topics/new
    Then the new topic page shows a topic name field and a first message field

  Scenario Outline: New Topic - 3 creating a topic broadcasts its first message to the normalized room and shows it in the feed
    Given I navigate to the path /topics/new
    When I enter the topic name "<name>"
    When I enter the first message "<message>"
    When I submit the new topic
    Then the wallet broadcasts an OP_RETURN with the Memo topic-message prefix and 3 pushes
    And the second broadcast push is the UTF-8 topic "<room>"
    And the third broadcast push is the UTF-8 text "<message>"
    And the app navigates to the topic feed for <room>
    And the topic feed shows my first message "<message>"

    Examples:
      | name | room | message |
      | bitcoin | bitcoin | hello bitcoin |
      | cash | cash | first post in cash |
      | BCH | bch | a longer message with spaces and punctuation. |
      | #Cash | cash | hello again |
      | Déjà Vu | déjà vu | hello déjà vu |

  Scenario Outline: New Topic - 4 an empty topic name is rejected
    Given I navigate to the path /topics/new
    When I enter the topic name "<name>"
    When I enter the first message "hello"
    When I submit the new topic
    Then the new topic page shows a topic name validation error
    Then the app does not broadcast any transaction

    Examples:
      | name |
      |  |
      | # |

  Scenario Outline: New Topic - 5 an empty first message is rejected
    Given I navigate to the path /topics/new
    When I enter the topic name "bitcoin"
    When I enter the first message "<message>"
    When I submit the new topic
    Then the new topic page shows a first message validation error
    Then the app does not broadcast any transaction

    Examples:
      | message |
      |  |

  Scenario Outline: New Topic - 6 a topic whose name and first message exceed the combined limit is rejected
    Given I navigate to the path /topics/new
    When I enter the topic name "<name>"
    When I enter the first message "<message>"
    When I submit the new topic
    Then the new topic page shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | name | message |
      | bitcoin | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | hello |

  Scenario Outline: New Topic - 7 the remaining byte count counts the topic name and first message together
    Given I navigate to the path /topics/new
    When I enter the topic name "<name>"
    When I enter the first message "<message>"
    Then the new topic page shows a remaining byte count of <count>

    Examples:
      | name | message | count |
      | bitcoin |  | 207 |
      | bitcoin | hello | 202 |
      | bitcoin | é | 205 |
      | cash | hello | 205 |

  Scenario Outline: New Topic - 8 a rejected broadcast surfaces the real error
    Given the wallet fails to broadcast with the error "<broadcast_error>"
    Given I navigate to the path /topics/new
    When I enter the topic name "bitcoin"
    When I enter the first message "hello"
    When I submit the new topic
    Then the new topic page shows the broadcast error "<broadcast_error>"
    Then the app does not broadcast any transaction

    Examples:
      | broadcast_error |
      | Insufficient balance |
