# mutation-stamp: sha256=96cc1c932d3556df1cfd4394c26a57cb332a3add26204189b432de06205994c4
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T01:14:47.777210962Z","feature_name":"Memo Followers","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-followers.feature","background_hash":"181bdfdb5e953b81db531fe6ea90e5353924881272d1c525e68e81d816dc0487","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

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
