# Memo Following (R11a): the psf-memo-cli read command for the addresses the
# signing wallet follows. It resolves the wallet (-n <wallet> or --wif <wif>,
# shared F2 wallet-source), reads GET /follow/following/:addr from psf-memo-db,
# and reports the returned followee cash addresses. The list is unpaginated.
# Read-only: no broadcast. A missing wallet source is a usage error (exit 2); a
# failed request is an error (exit 1). Adopts the shared F5 output contract, so
# --json prints one JSON object to stdout.
#
# Scenarios: Memo Following - 1, Memo Following - 2, Memo Following - 3, Memo Following - 4
Feature: Memo Following

  Background:
    Given a Memo following command
    And the Memo DB service serves the following list

  Scenario: Memo Following - 1 a missing wallet source is a usage error
    When the memo-following command runs
    Then the memo-following command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario: Memo Following - 2 the command reads the wallet address's following list
    Given the following wallet has the address "addrA"
    When the memo-following command runs
    Then the service received a following request for "addrA"
    And the command reported the following addresses "addrB, addrC"

  Scenario: Memo Following - 3 an empty following list reports no addresses
    Given the following wallet has the address "addrA"
    Given the following list is empty
    When the memo-following command runs
    Then the command reported 0 following addresses

  Scenario: Memo Following - 4 a failed request reports the error
    Given the following wallet has the address "addrA"
    Given the following request fails
    When the memo-following command runs
    Then the memo-following command reported an error
