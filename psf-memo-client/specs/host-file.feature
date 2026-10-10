# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-10T03:05:39.003165309Z","feature_name":"Host File","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/host-file.feature","background_hash":"12fbdded241357f187a94e8ac9637048a085e4f588708a502d95d541132afa51","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Host File - 1 a selected file shows the hosting quote","scenario_hash":"cae75c5494f21b5e3adb651d0f3596126b020a0fcc04f32bd031e9e1b07b426d","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":1,"name":"Host File - 2 an already hosted file shows the download link","scenario_hash":"36ce77779e532a1f4df6028ead980fe5af6862ba443757d9c3ffd811fc574115","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":3,"name":"Host File - 4 an API rejection shows the error","scenario_hash":"a641ffd464ea3257cac5937ae6f435b28972d090a875a812c84e8265eb2b9de0","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":4,"name":"Host File - 5 the quote shows the file size and a separate billed size","scenario_hash":"3b1df45d68b714a52300ebc70e9e45693daa28a31578b1a179dd69ca1ef82fa7","mutation_count":20,"result":{"Total":20,"Killed":20,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":5,"name":"Host File - 6 a file at or above the billing minimum shows no separate billed size","scenario_hash":"d50a4cbdbb21b26374fd26cd291943cd6c7325a3e593b8825f6ede1f849deb58","mutation_count":18,"result":{"Total":18,"Killed":18,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":6,"name":"Host File - 7 the quote shows a QR code and an expiry countdown","scenario_hash":"90f5d4f38202eb7deff19cd2b3b3d4f968fe767abbfdc5218e51cecacb8eef5f","mutation_count":18,"result":{"Total":18,"Killed":18,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":7,"name":"Host File - 8 Pay now sends the price to the payment address","scenario_hash":"edb2fe7d21e8935ca1f48804eb31a55cd0952eeed6020309123f4829777bfa16","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":8,"name":"Host File - 9 a confirmed payment shows the hosting result","scenario_hash":"d2dd08ff177c1b6fee48cbd14055d9e285fbb280700aabd92d27b54055ada416","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":10,"name":"Host File - 11 a wallet payment failure shows the error","scenario_hash":"7d3513f9d6de4a2da1aedf6570a16ab85c3fbbe133c0fea265799aa260857e87","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":12,"name":"Host File - 13 a check-payment failure shows the error","scenario_hash":"e696ed690dc20e73890933b644a5102d29af39f25314f90e907d231bde660dc0","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"},{"index":14,"name":"Host File - 15 the upload is posted to the configured hosting API URL","scenario_hash":"0ef01be245527c5eade69c3b969d8f4c2008fef98331b063b0ceff381e6cee27","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:39.003165309Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Host File - 1, Host File - 2, Host File - 3, Host File - 4, Host File - 5, Host File - 6, Host File - 7, Host File - 8, Host File - 9, Host File - 10, Host File - 11, Host File - 12, Host File - 13, Host File - 14, Host File - 15, Host File - 16, Host File - 17
#
# The /host page uploads a browser file to the bch-file-hosting API and pays
# the returned hosting quote from the app's BCH wallet. The API base URL is
# read from REACT_APP_FILE_HOSTING_URL and defaults to
# https://file-hosting-api.blippost.com. A chosen file is POSTed to
# <base>/files, which answers with a quote (priceSats + paymentAddress) or an
# already-hosted record; Pay now sends the quote amount to the payment address,
# then the page polls <base>/files/check-payment until the invoice is paid
# (showing the CID, download URL, gateway URLs, and payment txid) or expired.
# This is a client-only feature: it broadcasts no Memo action and changes no
# psf-memo-db data. The /status page is intentionally not ported, so the paid
# result links to no status page.
Feature: Host File

  Background:
    Given a fresh file hosting page

  Scenario Outline: Host File - 1 a selected file shows the hosting quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>

    Examples:
      | upload_name | api_sats | api_address                                            | shown_name  | shown_sats | shown_address                                          |
      | photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg   | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 |

  Scenario Outline: Host File - 2 an already hosted file shows the download link
    Given the hosting API reports the file is already hosted at <api_download_url>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the download URL <shown_download_url>

    Examples:
      | upload_name | api_download_url                                                                             | shown_name  | shown_download_url                                                                           |
      | photo.jpg   | https://file-hosting-api.blippost.com/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg   | https://file-hosting-api.blippost.com/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | archive.tar | https://file-hosting-api.blippost.com/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar | https://file-hosting-api.blippost.com/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario: Host File - 3 uploading without a file shows a prompt
    When the visitor uploads no file
    Then the page shows "Choose a file to upload."

  Scenario Outline: Host File - 4 an API rejection shows the error
    Given the hosting API rejects the upload with error <api_error>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows "<shown_error>"

    Examples:
      | upload_name | api_error               | shown_name  | shown_error             |
      | huge.bin    | File is too large       | huge.bin    | File is too large       |
      | broken.bin  | Invalid upload          | broken.bin  | Invalid upload          |
      | photo.jpg   | Hosting API unavailable | photo.jpg   | Hosting API unavailable |

  Scenario Outline: Host File - 5 the quote shows the file size and a separate billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the file is <api_size> bytes
    And the billed size is <api_billed> bytes
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>
    And the page shows the size <shown_size> bytes
    And the page shows the billed size <shown_billed> bytes

    Examples:
      | upload_name | api_sats | api_address                                            | api_size | api_billed | shown_name | shown_sats | shown_address                                          | shown_size | shown_billed |
      | photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 20000    | 100000     | photo.jpg  | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 | 20000      | 100000       |
      | small.txt   | 2000     | bitcoincash:qotheraddress00000000000000000000000000000 | 500      | 100000     | small.txt  | 2000       | bitcoincash:qotheraddress00000000000000000000000000000 | 500        | 100000       |

  Scenario Outline: Host File - 6 a file at or above the billing minimum shows no separate billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the file is <api_size> bytes
    And the billed size is <api_billed> bytes
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>
    And the page shows the size <shown_size> bytes
    And the page shows no billed size

    Examples:
      | upload_name | api_sats | api_address                                            | api_size | api_billed | shown_name  | shown_sats | shown_address                                          | shown_size |
      | photo.jpg   | 2500     | bitcoincash:qquoteaddress00000000000000000000000000000 | 1000000  | 1000000    | photo.jpg   | 2500       | bitcoincash:qquoteaddress00000000000000000000000000000 | 1000000    |
      | archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 25000000 | 25000000   | archive.tar | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 | 25000000   |

  Scenario Outline: Host File - 7 the quote shows a QR code and an expiry countdown
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the quote expires in <quote_minutes> minutes
    When the visitor uploads a file
    Then the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>
    And the page shows a payment QR code
    And the page shows a quote countdown of <shown_countdown>

    Examples:
      | api_sats | api_address                                            | quote_minutes | shown_sats | shown_address                                          | shown_countdown    |
      | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 1440          | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 | 24 hours           |
      | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 30            | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 | 30 minutes         |
      | 250000   | bitcoincash:qthirdaddress00000000000000000000000000000 | 90            | 250000     | bitcoincash:qthirdaddress00000000000000000000000000000 | 1 hour 30 minutes  |

  Scenario Outline: Host File - 8 Pay now sends the price to the payment address
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When the visitor uploads a file
    And the visitor pays the quote from the wallet
    Then the wallet paid <sent_amount> satoshis to <sent_address>

    Examples:
      | api_sats | api_address                                           | sent_amount | sent_address                                          |
      | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | 2000        | bitcoincash:qinvoiceaddress00000000000000000000000000 |
      | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | 62500       | bitcoincash:qinvoiceaddress00000000000000000000000000 |

  Scenario Outline: Host File - 9 a confirmed payment shows the hosting result
    Given an open hosting quote
    And the wallet will broadcast the transaction <api_txid>
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <paid_download_url>
    And the hosting API reports the gateway URL <paid_gateway_url>
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows the CID <shown_cid>
    And the page shows the download URL <shown_download_url>
    And the page shows the gateway URL <shown_gateway_url>
    And the page shows the payment transaction <shown_txid>

    Examples:
      | api_txid                                                     | paid_cid                                                     | paid_download_url                                                                                                   | paid_gateway_url                                                                                   | shown_cid                                                    | shown_download_url                                                                                                 | shown_gateway_url                                                                                 | shown_txid                                                   |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://file-hosting-api.blippost.com/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://file-hosting-api.blippost.com/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://file-hosting-api.blippost.com/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://file-hosting-api.blippost.com/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario: Host File - 10 an expired quote shows the expired message
    Given an open hosting quote
    And the hosting API reports the payment as expired
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "This quote has expired."

  Scenario Outline: Host File - 11 a wallet payment failure shows the error
    Given an open hosting quote
    And the wallet rejects the payment with error <wallet_error>
    When the visitor pays the quote from the wallet
    Then the page shows "<shown_error>"

    Examples:
      | wallet_error       | shown_error        |
      | Insufficient funds | Insufficient funds |
      | Wallet locked      | Wallet locked      |

  Scenario: Host File - 12 a payment that is never confirmed shows the pending message
    Given an open hosting quote
    And the hosting API reports the payment as unpaid
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "Payment not confirmed."

  Scenario Outline: Host File - 13 a check-payment failure shows the error
    Given an open hosting quote
    And the hosting API rejects the payment check with error <check_error>
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "<shown_error>"

    Examples:
      | check_error             | shown_error             |
      | Hosting API unavailable | Hosting API unavailable |
      | Payment check failed    | Payment check failed    |

  Scenario Outline: Host File - 14 an image gateway link opens in a new tab
    Given an open hosting quote
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the paid file name <paid_name>
    And the hosting API reports the gateway URL <paid_gateway_url>
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the gateway URL <shown_gateway_url> has link target <shown_target>

    Examples:
      | paid_name   | paid_cid                                                     | paid_gateway_url                                                                                                  | shown_gateway_url                                                                                                 | shown_target |
      | photo.jpg   | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg   | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg   | _blank       |
      | archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://gateway.lighthouse.storage/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | https://gateway.lighthouse.storage/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | none         |

  Scenario Outline: Host File - 15 the upload is posted to the configured hosting API URL
    Given an upload page whose API adapter uses the browser fetch transport at <api_base>
    And the browser transport replies to the upload with <api_sats> satoshis at <api_address>
    When the visitor uploads the file <upload_name>
    Then the browser transport received a POST to <sent_url> with the file <sent_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>

    Examples:
      | upload_name | api_base                              | api_sats | api_address                                            | sent_url                                     | sent_name   | shown_sats | shown_address                                          |
      | photo.jpg   | https://file-hosting-api.blippost.com | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | https://file-hosting-api.blippost.com/files  | photo.jpg   | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | archive.tar | http://localhost:5050                 | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | http://localhost:5050/files                  | archive.tar | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 |

  Scenario: Host File - 16 the paid result does not link to the status page
    Given an open hosting quote
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    When the visitor pays the quote from the wallet
    And the visitor waits for the payment to be confirmed
    Then the page does not link to the status page

  Scenario: Host File - 17 the navigation menu links to the host page
    Given I open the navigation menu
    Then the menu shows a link to the path /host
