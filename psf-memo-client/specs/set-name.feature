# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-26T04:22:57.360768955Z","feature_name":"Set Name","feature_path":"../../specs/set-name.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Set Name - 2 an empty name is rejected on the set name page","scenario_hash":"a4fbf28bd1afbffeff2f24f685299663df57e3cc4332a115fea84c08db634670","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-08-26T03:34:50.405131105Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Set Name - 1, Set Name - 2, Set Name - 3, Set Name - 4, Set Name - 5
Feature: Set Name

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Set Name - 1 a valid name is broadcast and the user lands on the account page
    Given I navigate to the path /memo/set-name
    When I type a name with the text "<name>"
    When I submit the name
    Then the app broadcasts an OP_RETURN transaction with the Memo set-name prefix
    Then I navigate to the path /account
    Then the account page shows my name as "<name>"

    Examples:
      | name |
      | trout |
      | a longer name with spaces |

  Scenario Outline: Set Name - 2 an empty name is rejected on the set name page
    Given I navigate to the path /memo/set-name
    When I type a name with the text "<name>"
    When I submit the name
    Then the set name page shows a validation error
    Then the app does not broadcast any transaction

    Examples:
      | name |
      |  |

  Scenario Outline: Set Name - 3 an over-long name is rejected on the set name page
    Given I navigate to the path /memo/set-name
    When I type a name with the text "<name>"
    When I submit the name
    Then the set name page shows a length error
    Then the app does not broadcast any transaction

    Examples:
      | name |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |
      | 😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀 |

  Scenario Outline: Set Name - 4 the byte counter counts down from the name limit
    Given I navigate to the path /memo/set-name
    When I type a name with the text "<name>"
    Then the set name page shows a remaining byte count of <count>

    Examples:
      | name | count |
      |      | 77    |
      | trout | 72   |
      | é    | 75    |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0    |

  Scenario: Set Name - 5 the account page links to the set name page
    Given I navigate to the path /account
    Then the account page shows a Set Name button
    When I click the Set Name button
    Then I navigate to the path /memo/set-name
