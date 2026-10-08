# mutation-stamp: sha256=d35a79e0e4d4ae531e11bb374b6e7fdebd9c8fa46bd782c9789e71b6d2a82676
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T01:30:02.130263777Z","feature_name":"Memo Muted","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/memo-muted.feature","background_hash":"b9789bc8992d690351d31e7cf14883a1a905baa1620411e9d231e21fa0077e43","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Memo Muted - 2 the command reads the wallet address's muted list","scenario_hash":"a90afbe5170eb80173abf2769613477fd3212510daaf374fdc43740705f0b178","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-08T01:30:02.130263777Z"}]}
# acceptance-mutation-manifest-end

# Memo Muted (R12): the psf-memo-cli read command for the addresses the signing
# wallet has muted. It resolves the wallet (-n <wallet> or --wif <wif>, shared
# F2 wallet-source), reads GET /mute/muted/:addr from psf-memo-db, and reports
# the returned mutee cash addresses. The list is unpaginated. Read-only: no
# broadcast. A missing wallet source is a usage error (exit 2); a failed request
# is an error (exit 1). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout.
#
# Scenarios: Memo Muted - 1, Memo Muted - 2, Memo Muted - 3, Memo Muted - 4
Feature: Memo Muted

  Background:
    Given a Memo muted command
    And the Memo DB service serves the muted list

  Scenario: Memo Muted - 1 a missing wallet source is a usage error
    When the memo-muted command runs
    Then the memo-muted command reported the usage error "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario Outline: Memo Muted - 2 the command reads the wallet address's muted list
    Given the muted wallet has the address "<muter>"
    When the memo-muted command runs
    Then the service received a muted request for "<muter>"
    And the command reported the muted addresses "<muted>"

    Examples:
      | muter | muted        |
      | addrA | addrB, addrC |
      | addrD | addrE        |

  Scenario: Memo Muted - 3 an empty muted list reports no addresses
    Given the muted wallet has the address "addrF"
    Given the muted list is empty
    When the memo-muted command runs
    Then the command reported 0 muted addresses

  Scenario: Memo Muted - 4 a failed request reports the error
    Given the muted wallet has the address "addrA"
    Given the muted request fails
    When the memo-muted command runs
    Then the memo-muted command reported an error
