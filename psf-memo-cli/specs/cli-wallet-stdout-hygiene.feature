# Scenarios: CLI Wallet Stdout Hygiene - 1, CLI Wallet Stdout Hygiene - 2, CLI Wallet Stdout Hygiene - 3
# Wallet-backed commands construct minimal-slp-wallet, whose adapter logs
# "Initializing minimal-slp-wallet routers with this interface: <interface>"
# with console.log during construction. That bypasses the reporter, so the
# banner lands on process stdout ahead of the command result and breaks the
# one-JSON-object contract (real runs failed `--json | jq`). The existing
# acceptance fakes never emit the banner, which is why the suite passed. This
# feature pins the wallet-construction boundary: in JSON mode the library
# banner is suppressed, keeping stdout to one JSON object and stderr to one
# JSON error on failure; in human mode the banner is routed to stderr so it
# remains observable without polluting the readable stdout result.
Feature: CLI Wallet Stdout Hygiene

  Background:
    Given a wallet-backed CLI command
    And the wallet library logs its initialization banner

  Scenario: CLI Wallet Stdout Hygiene - 1 JSON mode keeps stdout to one JSON object when the wallet library logs a banner
    When the command runs in JSON mode
    Then the exit code is 0
    And stdout is a single JSON object
    And stdout does not contain the wallet library initialization banner
    And stderr is empty

  Scenario: CLI Wallet Stdout Hygiene - 2 human mode keeps the readable result on stdout and the wallet banner on stderr
    When the command runs in human mode
    Then the exit code is 0
    And stdout contains the result message
    And stdout does not contain the wallet library initialization banner
    And stderr contains the wallet library initialization banner

  Scenario: CLI Wallet Stdout Hygiene - 3 a wallet library failure in JSON mode reports one JSON error on stderr
    Given the wallet library fails
    When the command runs in JSON mode
    Then the exit code is 1
    And stdout is empty
    And stderr is a single JSON object
    And the JSON error has the wallet library error message
