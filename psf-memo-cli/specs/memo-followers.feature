# Memo Followers (R11b): the psf-memo-cli read command for the addresses that
# follow a target address. The followee address comes from the required -a
# flag; the command reads GET /follow/followers/:addr from psf-memo-db and
# reports the returned follower cash addresses. The list is unpaginated.
# Read-only: no wallet, no broadcast. A missing -a is a usage error (exit 2); a
# failed request is an error (exit 1). Adopts the shared F5 output contract, so
# --json prints one JSON object to stdout.
#
# Scenarios: Memo Followers - 1, Memo Followers - 2, Memo Followers - 3, Memo Followers - 4
Feature: Memo Followers

  Background:
    Given the Memo DB service serves the followers list

  Scenario: Memo Followers - 1 a missing address is a usage error
    When the memo-followers command runs without an address
    Then the memo-followers command reported the usage error "You must specify a followee address with the -a flag."

  Scenario: Memo Followers - 2 the command reads the address's followers list
    When the memo-followers command runs for "addrA"
    Then the service received a followers request for "addrA"
    And the command reported the follower addresses "addrD, addrE"

  Scenario: Memo Followers - 3 an empty followers list reports no addresses
    Given the followers list is empty
    When the memo-followers command runs for "addrA"
    Then the command reported 0 follower addresses

  Scenario: Memo Followers - 4 a failed request reports the error
    Given the followers request fails
    When the memo-followers command runs for "addrA"
    Then the memo-followers command reported an error
