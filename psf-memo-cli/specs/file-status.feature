# mutation-stamp: sha256=946622d97e7be196f78f99fc331ab0aafdd4089c7d17032aff84eb05a112e438
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T17:42:36.370490130Z","feature_name":"File Status","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/file-status.feature","background_hash":"4532bdc66f992abe5930c0376ccd499521812e4d776e08133cfb0879359263f6","implementation_hash":"unknown","scenarios":[{"index":0,"name":"File Status - 1 a found file prints its details and pins","scenario_hash":"0f6e371c721be3ecd740ddfeeb00b56213fe34687378128d519def5c66fb64aa","mutation_count":28,"result":{"Total":28,"Killed":28,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:31:12.243432307Z"},{"index":1,"name":"File Status - 2 a staged file prints its details and no hosting window","scenario_hash":"8a66fd8c2be41ca4a951e1ca2001f3732641c10b6bf1a704d323fa7152c96df9","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:31:12.243432307Z"},{"index":3,"name":"File Status - 4 an API error is reported and the command fails","scenario_hash":"d331f55c1278f13eff1f0b3fda549dbe3b9d0af9d6b3aaa1fa3fdd7c66009cf5","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:31:12.243432307Z"},{"index":4,"name":"File Status - 5 JSON output prints one JSON object","scenario_hash":"7760ad52fa6e36ddc2ff7cafdd5e60002a6aeeb4f445ebd456ab967a11cf7575","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:31:12.243432307Z"}]}
# acceptance-mutation-manifest-end

# File Status (FH3): the psf-memo-cli command that looks up a file record by CID
# (-c) through the bch-file-hosting REST API (GET /files/:cid) and reports its
# CID, name, size, status, hosting window, and pins. No wallet and no payment.
# GET /files/:cid intentionally returns metadata and pins but no download/view
# URLs; those come from check-payment/alreadyHosted and are surfaced by
# file-check (FH4). The API returns the file it looked up (the requested CID).
# A missing -c flag is a usage error (exit 2); an unknown CID or an API error is
# a runtime error (exit 1). The API base URL comes from HOSTING_API_URL (default
# http://localhost:5050). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout.
#
# Scenarios: File Status - 1, File Status - 2, File Status - 3, File Status - 4, File Status - 5
Feature: File Status

  Background:
    Given a file-status command

  Scenario Outline: File Status - 1 a found file prints its details and pins
    Given the hosting API reports a file with name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    And the hosting API reports the hosting window <api_hosted_until>
    And the hosting API reports a pin for provider <api_provider> with status <api_pin_status>
    When the file-status command runs for the CID <cid>
    Then the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the file status <printed_status>
    And the command prints the hosting window <printed_hosted_until>
    And the command prints the pin <printed_provider> <printed_pin_status>

    Examples:
      | cid                                                          | api_filename | api_size | api_status | api_hosted_until         | api_provider | api_pin_status | printed_cid                                                  | printed_filename | printed_size | printed_status | printed_hosted_until     | printed_provider | printed_pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | 1024     | pinned     | 2027-10-09T00:00:00.000Z | local-helia  | pinned         | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg        | 1024         | pinned         | 2027-10-09T00:00:00.000Z | local-helia      | pinned             |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar  | 2048     | pinFailed  | 2027-10-10T00:00:00.000Z | lighthouse   | failed         | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar      | 2048         | pinFailed      | 2027-10-10T00:00:00.000Z | lighthouse       | failed             |

  Scenario Outline: File Status - 2 a staged file prints its details and no hosting window
    Given the hosting API reports a file with name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    And the hosting API reports no hosting window
    When the file-status command runs for the CID <cid>
    Then the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the file status <printed_status>
    And the command prints the hosting window <printed_hosted_until>

    Examples:
      | cid                                                          | api_filename | api_size | api_status | printed_cid                                                  | printed_filename | printed_size | printed_status | printed_hosted_until |
      | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt    | 500      | staged     | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt        | 500          | staged         | not paid             |

  Scenario: File Status - 3 a missing CID is a usage error
    When the file-status command runs without a CID
    Then the exit code is 2
    And stderr contains "You must specify a CID with the -c flag."

  Scenario Outline: File Status - 4 an API error is reported and the command fails
    Given the hosting API rejects the status with error <api_error>
    When the file-status command runs for the CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | api_error        | printed_error    |
      | File not found   | File not found   |
      | Hosting API down | Hosting API down |

  Scenario Outline: File Status - 5 JSON output prints one JSON object
    Given the hosting API reports a file with name <api_filename>
    And the hosting API reports the file status <api_status>
    When the file-status command runs with JSON output for the CID <cid>
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the status <json_status>
    And the JSON output has the CID <json_cid>
    And the JSON output has the file name <json_filename>

    Examples:
      | cid                                                          | api_filename | api_status | json_status | json_cid                                                     | json_filename |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | pinned     | pinned      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg     |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar  | pinFailed  | pinFailed   | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar   |
