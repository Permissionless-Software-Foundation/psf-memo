# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-27T15:07:16.579432218Z","feature_name":"Set Bio","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/set-bio.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Set Bio - 2 an empty bio is rejected on the set bio page","scenario_hash":"13afeec034e9b128e3e2c2c82f392648a11407b917c33c53d13185cc9d8bf2b7","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-27T15:06:58.731115193Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Set Bio - 1, Set Bio - 2, Set Bio - 3, Set Bio - 4, Set Bio - 5
Feature: Set Bio

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Set Bio - 1 a valid bio is broadcast and the user lands on the account page
    Given I navigate to the path /memo/set-bio
    When I type a bio with the text "<text>"
    When I submit the bio
    Then the app broadcasts an OP_RETURN transaction with the Memo set-profile prefix
    Then I navigate to the path /account
    Then the account page shows my bio as "<text>"

    Examples:
      | text |
      | Building the future on Bitcoin Cash |
      | a longer bio with spaces and punctuation |

  Scenario Outline: Set Bio - 2 an empty bio is rejected on the set bio page
    Given I navigate to the path /memo/set-bio
    When I type a bio with the text "<text>"
    When I submit the bio
    Then the set bio page shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | text |
      |  |

  Scenario Outline: Set Bio - 3 an over-long bio is rejected on the set bio page
    Given I navigate to the path /memo/set-bio
    When I type a bio with the text "<text>"
    When I submit the bio
    Then the set bio page shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | text |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀 |

  Scenario Outline: Set Bio - 4 the byte counter counts down from the bio limit
    Given I navigate to the path /memo/set-bio
    When I type a bio with the text "<text>"
    Then the set bio page shows a remaining byte count of <count>

    Examples:
      | text | count |
      |      | 217   |
      | hello | 212  |
      | é    | 215   |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0 |

  Scenario: Set Bio - 5 the account page links to the set bio page
    Given I navigate to the path /account
    Then the account page shows a Set Bio button
    When I click the Set Bio button
    Then I navigate to the path /memo/set-bio
