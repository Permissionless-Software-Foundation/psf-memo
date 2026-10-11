# File Upload (FH1): the psf-memo-cli command that uploads a local file to the
# bch-file-hosting REST API (POST /files, multipart field "file") and reports
# the price quote (file name, size, billed size when it differs, price, payment
# address, and expiry), or the already-hosted download/view links. Quote-only:
# no wallet and no payment, so a caller can pay from any external wallet and
# recover the links with file-check. The API base URL comes from HOSTING_API_URL
# (default http://localhost:5050). A missing -f flag is a usage error (exit 2)
# with no upload; a missing local file or an API rejection is a runtime error
# (exit 1). Adopts the shared F5 output contract, so --json prints one JSON
# object to stdout.
#
# Scenarios: File Upload - 1, File Upload - 2, File Upload - 3, File Upload - 4, File Upload - 5, File Upload - 6, File Upload - 7
Feature: File Upload

  Background:
    Given a file-upload command

  Scenario Outline: File Upload - 1 a successful upload prints the quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the billed size <api_billed>
    And the hosting API reports the quote expiry <api_expiry>
    When the file-upload command runs for the file ./photo.jpg
    Then the exit code is 0
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the billed size <printed_billed> bytes
    And the command prints the price <printed_sats> satoshis
    And the command prints the payment address <printed_address>
    And the command prints the quote expiry <printed_expiry>

    Examples:
      | api_sats | api_address                                            | api_filename | api_size | api_billed | api_expiry               | printed_filename | printed_size | printed_billed | printed_sats | printed_address                                        | printed_expiry           |
      | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg    | 20000    | 100000     | 2026-10-10T00:00:00.000Z | photo.jpg        | 20000        | 100000         | 2000         | bitcoincash:qquoteaddress00000000000000000000000000000 | 2026-10-10T00:00:00.000Z |
      | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar  | 500      | 100000     | 2026-11-11T12:00:00.000Z | archive.tar      | 500          | 100000         | 62500        | bitcoincash:qotheraddress00000000000000000000000000000 | 2026-11-11T12:00:00.000Z |

  Scenario Outline: File Upload - 2 an already hosted file prints the links and no payment address
    Given the hosting API reports the file is already hosted at <api_download_url>
    And the hosting API reports the view URL <api_view_url>
    When the file-upload command runs for the file ./photo.jpg
    Then the exit code is 0
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>
    And the command prints no payment address

    Examples:
      | api_download_url                                                                   | api_view_url                                                                                 | printed_download_url                                                               | printed_view_url                                                                              |
      | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario: File Upload - 3 a missing file flag is a usage error
    When the file-upload command runs without a file flag
    Then the exit code is 2
    And stderr contains "You must specify a file with the -f flag."

  Scenario Outline: File Upload - 4 an API rejection is reported and the command fails
    Given the hosting API rejects the upload with error <api_error>
    When the file-upload command runs for the file ./photo.jpg
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | api_error               | printed_error           |
      | File is too large       | File is too large       |
      | Invalid upload          | Invalid upload          |
      | Hosting API unavailable | Hosting API unavailable |

  Scenario: File Upload - 5 a missing local file is a runtime error
    When the file-upload command runs for the missing file ./absent.bin
    Then the exit code is 1
    And stderr contains "Cannot read file"

  Scenario Outline: File Upload - 6 JSON output prints one JSON object with the quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When the file-upload command runs with JSON output for the file ./photo.jpg
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the payment address <json_address>
    And the JSON output has the price <json_sats> satoshis

    Examples:
      | api_sats | api_address                                            | json_sats | json_address                                           |
      | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 2000      | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 62500     | bitcoincash:qotheraddress00000000000000000000000000000 |

  Scenario Outline: File Upload - 7 a file at or above the billing minimum prints no billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the billed size <api_billed>
    When the file-upload command runs for the file ./photo.jpg
    Then the exit code is 0
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints no billed size
    And the command prints the price <printed_sats> satoshis
    And the command prints the payment address <printed_address>

    Examples:
      | api_sats | api_address                                            | api_filename | api_size | api_billed | printed_filename | printed_size | printed_sats | printed_address                                        |
      | 2500     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg    | 1000000  | 1000000    | photo.jpg        | 1000000      | 2500         | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar  | 25000000 | 25000000   | archive.tar      | 25000000     | 62500        | bitcoincash:qotheraddress00000000000000000000000000000 |
