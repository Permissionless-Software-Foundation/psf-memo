# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-27T16:58:51.862423444Z","feature_name":"Set Avatar URL","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/set-avatar-url.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Set Avatar URL - 2 an empty avatar URL is rejected on the set avatar page","scenario_hash":"297768a79c84fa3e7394112d688c046be75a3f9fef80ed784b745e7b637878ee","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-27T16:58:43.073982780Z"}]}
# acceptance-mutation-manifest-end

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
