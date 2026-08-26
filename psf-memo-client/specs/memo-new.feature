# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-26T04:22:55.346096718Z","feature_name":"New Post Page","feature_path":"../../specs/memo-new.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"New Post Page - 2 an empty memo is rejected on the new post page","scenario_hash":"ac70dcf123f435da2b8a6c4953b0b22b8e7a5a8a74291547b954cb562cf9f339","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-26T03:34:47.703957423Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: New Post Page - 1, New Post Page - 2, New Post Page - 3, New Post Page - 4, New Post Page - 5, New Post Page - 6
Feature: New Post Page

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: New Post Page - 1 a valid memo is posted and the user lands on the feed
    Given I navigate to the path /posts/new
    When I type a memo with the text "<message>"
    When I click the post button
    Then the app broadcasts an OP_RETURN transaction with the Memo post prefix
    Then I navigate to the path /posts/recent
    Then the feed shows a new post from my address with the text "<message>"

    Examples:
      | message |
      | hello memo |
      | a longer memo with several words. |

  Scenario Outline: New Post Page - 2 an empty memo is rejected on the new post page
    Given I navigate to the path /posts/new
    When I type a memo with the text "<message>"
    When I click the post button
    Then the new post page shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | message |
      |  |

  Scenario Outline: New Post Page - 3 an over-long memo is rejected on the new post page
    Given I navigate to the path /posts/new
    When I type a memo with the text "<message>"
    When I click the post button
    Then the new post page shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | message |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: New Post Page - 4 the character counter counts down from the memo limit
    Given I navigate to the path /posts/new
    When I type a memo with the text "<message>"
    Then the new post page shows a remaining character count of <count>

    Examples:
      | message | count |
      |         | 217   |
      | hello   | 212   |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0    |

  Scenario: New Post Page - 5 the navigation menu links to the new post page
    Given I open the navigation menu
    Then the menu shows a link to the path /posts/new

  Scenario Outline: New Post Page - 6 a failed broadcast surfaces the real error and the user stays on the page
    Given I navigate to the path /posts/new
    And the wallet fails to broadcast with the error "<broadcast_error>"
    When I type a memo with the text "<message>"
    When I click the post button
    Then the app attempts to broadcast an OP_RETURN transaction with the Memo post prefix
    Then the new post page shows an error containing "<broadcast_error>"
    Then I remain on the path /posts/new

    Examples:
      | message | broadcast_error |
      | hello memo | BCH UTXO list is empty |
      | hello memo | Insufficient balance |
