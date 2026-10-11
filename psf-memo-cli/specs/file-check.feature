# mutation-stamp: sha256=5bde6823f1af6e0f55bad93213c8c77209159b095f7e20d77f9b5ee95948599b
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T17:42:35.861158545Z","feature_name":"File Check","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-cli/specs/file-check.feature","background_hash":"a80d27f0a19990e909bb15deb1441781b2fe827e060af29693a494063e7826b1","implementation_hash":"unknown","scenarios":[{"index":0,"name":"File Check - 1 a paid invoice prints the CID and links","scenario_hash":"e45e29448d4e21ef5a5e67c3e06822a7a030ec3d4d6a76ac05615749f33f28de","mutation_count":20,"result":{"Total":20,"Killed":20,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:42:35.861158545Z"},{"index":1,"name":"File Check - 2 an unpaid invoice prints the amounts received and required","scenario_hash":"93c58d95d2d13cf03ec2d34a133c598887293717de3c30a5fca262d15244f156","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:42:35.861158545Z"},{"index":4,"name":"File Check - 5 an API error is reported and the command fails","scenario_hash":"9e1530899aa3e01d53e39241a862099cd309134aa20eee536b23d463d4116ac5","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:42:35.861158545Z"},{"index":5,"name":"File Check - 6 JSON output prints one JSON object with the status","scenario_hash":"c5ecad60c1efc0c06d0e67f9a38a402c74125d0f19c6ee550c2952a60660812b","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-11T17:42:35.861158545Z"}]}
# acceptance-mutation-manifest-end

# File Check (FH4): the psf-memo-cli command that looks up a hosting payment by
# address (-a) through the bch-file-hosting REST API (POST /files/check-payment)
# and reports the result: paid (CID and download/view/gateway links), unpaid
# (received and required satoshis and the quote expiry), or expired. This is how
# a caller who kept only the payment address recovers the hosted file's links,
# closing the URL asymmetry of GET /files/:cid (FH3). No wallet and no payment.
# A missing -a flag is a usage error (exit 2); an unknown address or an API error
# is a runtime error (exit 1). The API base URL comes from HOSTING_API_URL
# (default http://localhost:5050). Adopts the shared F5 output contract, so
# --json prints one JSON object to stdout.
#
# Scenarios: File Check - 1, File Check - 2, File Check - 3, File Check - 4, File Check - 5, File Check - 6
Feature: File Check

  Background:
    Given a file-check command

  Scenario Outline: File Check - 1 a paid invoice prints the CID and links
    Given the hosting API reports a paid invoice with CID <api_cid>
    And the hosting API reports the download URL <api_download_url>
    And the hosting API reports the view URL <api_view_url>
    And the hosting API reports the gateway URL <api_gateway_url>
    When the file-check command runs for the address <address>
    Then the exit code is 0
    And the hosting API received the address <received_address>
    And the command prints the CID <printed_cid>
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>
    And the command prints the gateway URL <printed_gateway_url>

    Examples:
      | address                                                 | received_address                                        | api_cid                                                      | api_download_url                                                                   | api_view_url                                                                                 | api_gateway_url                                                                       | printed_cid                                                  | printed_download_url                                                               | printed_view_url                                                                             | printed_gateway_url                                                                   |
      | bitcoincash:qrequestaddress1000000000000000000000000000 | bitcoincash:qrequestaddress1000000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | bitcoincash:qrequestaddress2000000000000000000000000000 | bitcoincash:qrequestaddress2000000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario Outline: File Check - 2 an unpaid invoice prints the amounts received and required
    Given the hosting API reports an unpaid invoice with <api_received> received and <api_required> required
    And the hosting API reports the quote expiry <api_expiry>
    When the file-check command runs for the address <address>
    Then the exit code is 0
    And the hosting API received the address <received_address>
    And the command prints the received amount <printed_received> satoshis
    And the command prints the required amount <printed_required> satoshis
    And the command prints the quote expiry <printed_expiry>

    Examples:
      | address                                                 | received_address                                        | api_received | api_required | api_expiry               | printed_received | printed_required | printed_expiry           |
      | bitcoincash:qrequestaddress1000000000000000000000000000 | bitcoincash:qrequestaddress1000000000000000000000000000 | 0            | 2000         | 2026-10-10T00:00:00.000Z | 0                | 2000             | 2026-10-10T00:00:00.000Z |
      | bitcoincash:qrequestaddress2000000000000000000000000000 | bitcoincash:qrequestaddress2000000000000000000000000000 | 1500         | 62500        | 2026-10-11T12:00:00.000Z | 1500             | 62500            | 2026-10-11T12:00:00.000Z |

  Scenario: File Check - 3 an expired invoice prints the expired status
    Given the hosting API reports an expired invoice
    When the file-check command runs for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 0
    And the command prints the expired status

  Scenario: File Check - 4 a missing address is a usage error
    When the file-check command runs without an address
    Then the exit code is 2
    And stderr contains "You must specify a payment address with the -a flag."

  Scenario Outline: File Check - 5 an API error is reported and the command fails
    Given the hosting API rejects the check with error <api_error>
    When the file-check command runs for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | api_error               | printed_error           |
      | Invoice not found       | Invoice not found       |
      | Hosting API unavailable | Hosting API unavailable |

  Scenario Outline: File Check - 6 JSON output prints one JSON object with the status
    Given the hosting API reports a paid invoice with CID <api_cid>
    And the hosting API reports the download URL <api_download_url>
    When the file-check command runs with JSON output for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the status <json_status>
    And the JSON output has the CID <json_cid>
    And the JSON output has the download URL <json_download_url>

    Examples:
      | api_cid                                                      | api_download_url                                                                   | json_status | json_cid                                                     | json_download_url                                                                  |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | paid        | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | paid        | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
