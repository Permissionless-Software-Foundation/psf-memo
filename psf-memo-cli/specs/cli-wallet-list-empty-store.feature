# Scenarios: CLI Wallet List Empty Store - 1, CLI Wallet List Empty Store - 2, CLI Wallet List Empty Store - 3
# When the wallet directory holds no `*.json`, wallet-list's shelljs `ls` over
# the glob path prints "ls: no such file or directory: .../.wallets/*.json" to
# stderr before it reports "No wallets found." The leak is cosmetic (it is on
# stderr, so JSON parsing still works) but it exposes an implementation detail
# on the first-run path. This feature pins a clean empty-store result in both
# output modes, including when the wallet directory has never been created.
Feature: CLI Wallet List Empty Store

  Scenario: CLI Wallet List Empty Store - 1 human mode reports no wallets without a shell error
    Given a wallet store with no wallets
    When wallet-list runs in human mode
    Then the exit code is 0
    And stdout contains "No wallets found."
    And stderr is empty

  Scenario: CLI Wallet List Empty Store - 2 JSON mode reports no wallets without a shell error
    Given a wallet store with no wallets
    When wallet-list runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the message "No wallets found."
    And the JSON output lists no wallets
    And stderr is empty

  Scenario: CLI Wallet List Empty Store - 3 a missing wallet store directory reports no wallets without a shell error
    Given the wallet store directory does not exist
    When wallet-list runs in human mode
    Then the exit code is 0
    And stdout contains "No wallets found."
    And stderr is empty
