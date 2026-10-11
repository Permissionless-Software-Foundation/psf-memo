# File Host (FH2): the psf-memo-cli command that uploads a local file to the
# bch-file-hosting REST API (POST /files, multipart field "file"), pays the
# quote from a resolved wallet (-n <wallet> or --wif <wif>), then polls
# check-payment (10 attempts, 3000 ms apart, sleep injected) until the payment
# confirms. It reports the CID, download/view/gateway URLs, and the payment
# txid. An already-hosted upload short-circuits without paying. A missing -f
# flag or wallet source is a usage error (exit 2) with no payment; a missing
# local file, an API rejection, or an unconfirmed payment is a runtime error
# (exit 1). The API base URL comes from HOSTING_API_URL (default
# http://localhost:5050). Adopts the shared F5 output contract, so --json prints
# one JSON object to stdout. Payment goes through minimal-slp-wallet send(),
# which adds the 2,000-sat PSF donation; this task also upgrades psf-memo-cli to
# the latest minimal-slp-wallet (7.1.5).
#
# Scenarios: File Host - 1, File Host - 2, File Host - 3, File Host - 4, File Host - 5, File Host - 6, File Host - 7, File Host - 8
Feature: File Host

  Background:
    Given a file-host command

  Scenario Outline: File Host - 1 an upload, payment, and confirmation print the hosted result
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the payment as unpaid at first
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <api_download_url>
    And the hosting API reports the view URL <api_view_url>
    And the hosting API reports the gateway URL <api_gateway_url>
    And a signing wallet that records payments
    And the wallet returns the transaction id "<api_txid>"
    When the file-host command runs for the file ./photo.jpg with the wallet payer
    Then the exit code is 0
    And the wallet paid <sent_sats> satoshis to <sent_address>
    And the command polled the payment 2 times
    And the command waited 3000 milliseconds between payment polls
    And the command prints the CID <printed_cid>
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>
    And the command prints the gateway URL <printed_gateway_url>
    And the command prints the transaction <printed_txid>

    Examples:
      | api_sats | api_address                                            | paid_cid                                                     | api_download_url                                                                   | api_view_url                                                                                 | api_gateway_url                                                                      | api_txid                                                         | sent_sats | sent_address                                           | printed_cid                                                  | printed_download_url                                                               | printed_view_url                                                                             | printed_gateway_url                                                                   | printed_txid                                                     |
      | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | 1111111111111111111111111111111111111111111111111111111111111111 | 2000      | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | 2222222222222222222222222222222222222222222222222222222222222222 | 62500     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario Outline: File Host - 2 an unconfirmed payment fails after the retries
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API never confirms the payment
    And a signing wallet that records payments
    When the file-host command runs for the file ./photo.jpg with the wallet payer
    Then the exit code is 1
    And the wallet paid <sent_sats> satoshis to <sent_address>
    And the command polled the payment 10 times
    And the command waited 3000 milliseconds between payment polls
    And stderr contains "Payment not confirmed."

    Examples:
      | api_sats | api_address                                            | sent_sats | sent_address                                           |
      | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | 2000      | bitcoincash:qinvoiceaddress00000000000000000000000000 |
      | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | 62500     | bitcoincash:qinvoiceaddress00000000000000000000000000 |

  Scenario Outline: File Host - 3 an already hosted file is not paid again
    Given the hosting API reports the file is already hosted at <api_download_url>
    And the hosting API reports the view URL <api_view_url>
    And a signing wallet that records payments
    When the file-host command runs for the file ./photo.jpg with the wallet payer
    Then the exit code is 0
    And the wallet made no payment
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>

    Examples:
      | api_download_url                                                                   | api_view_url                                                                                 | printed_download_url                                                               | printed_view_url                                                                              |
      | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario: File Host - 4 a missing file flag is a usage error
    Given a signing wallet that records payments
    When the file-host command runs with the wallet payer
    Then the exit code is 2
    And stderr contains "You must specify a file with the -f flag."

  Scenario: File Host - 5 a missing wallet source is a usage error
    When the file-host command runs for the file ./photo.jpg with no wallet
    Then the exit code is 2
    And stderr contains "You must specify a wallet name with the -n flag or a WIF with the --wif flag."

  Scenario: File Host - 6 a missing local file is a runtime error
    Given a signing wallet that records payments
    When the file-host command runs for the missing file ./absent.bin with the wallet payer
    Then the exit code is 1
    And stderr contains "Cannot read file"

  Scenario Outline: File Host - 7 an upload rejection is reported and the command fails
    Given the hosting API rejects the upload with error <api_error>
    And a signing wallet that records payments
    When the file-host command runs for the file ./photo.jpg with the wallet payer
    Then the exit code is 1
    And the wallet made no payment
    And stderr contains "<printed_error>"

    Examples:
      | api_error               | printed_error           |
      | File is too large       | File is too large       |
      | Invalid upload          | Invalid upload          |
      | Hosting API unavailable | Hosting API unavailable |

  Scenario Outline: File Host - 8 JSON output prints one JSON object with the hosted result
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <api_download_url>
    And a signing wallet that records payments
    And the wallet returns the transaction id "<api_txid>"
    When the file-host command runs with JSON output for the file ./photo.jpg with the wallet payer
    Then the exit code is 0
    And the wallet paid <sent_sats> satoshis to <sent_address>
    And stdout is a single JSON object
    And the JSON output has the CID <json_cid>
    And the JSON output has the download URL <json_download_url>
    And the JSON output has the transaction <json_txid>

    Examples:
      | api_sats | api_address                                            | paid_cid                                                     | api_download_url                                                                   | api_txid                                                         | sent_sats | sent_address                                           | json_cid                                                     | json_download_url                                                                  | json_txid                                                        |
      | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | 4444444444444444444444444444444444444444444444444444444444444444 | 2000      | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | 4444444444444444444444444444444444444444444444444444444444444444 |
      | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 5555555555555555555555555555555555555555555555555555555555555555 | 62500     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 5555555555555555555555555555555555555555555555555555555555555555 |
