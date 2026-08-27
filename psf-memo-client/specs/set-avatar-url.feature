# Scenarios: Set Avatar URL - 1, Set Avatar URL - 2, Set Avatar URL - 3, Set Avatar URL - 4, Set Avatar URL - 5
Feature: Set Avatar URL

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Set Avatar URL - 1 a valid avatar URL is broadcast and the user lands on the account page
    Given I navigate to the path /memo/set-avatar-url
    When I type an avatar URL with the text "<url>"
    When I submit the avatar URL
    Then the app broadcasts an OP_RETURN transaction with the Memo set-profile-picture prefix
    Then I navigate to the path /account
    Then the account page shows my avatar URL as "<url>"

    Examples:
      | url |
      | https://example.com/avatar.png |
      | https://cdn.example.com/pics/me.jpg |

  Scenario Outline: Set Avatar URL - 2 an empty avatar URL is rejected on the set avatar page
    Given I navigate to the path /memo/set-avatar-url
    When I type an avatar URL with the text "<url>"
    When I submit the avatar URL
    Then the set avatar page shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | url |
      |  |

  Scenario Outline: Set Avatar URL - 3 an over-long avatar URL is rejected on the set avatar page
    Given I navigate to the path /memo/set-avatar-url
    When I type an avatar URL with the text "<url>"
    When I submit the avatar URL
    Then the set avatar page shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | url |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: Set Avatar URL - 4 the byte counter counts down from the avatar URL limit
    Given I navigate to the path /memo/set-avatar-url
    When I type an avatar URL with the text "<url>"
    Then the set avatar page shows a remaining byte count of <count>

    Examples:
      | url | count |
      |      | 217   |
      | https://a.io/p.png | 199 |
      | é    | 215   |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0 |

  Scenario: Set Avatar URL - 5 the account page links to the set avatar page
    Given I navigate to the path /account
    Then the account page shows a Set Avatar URL button
    When I click the Set Avatar URL button
    Then I navigate to the path /memo/set-avatar-url
