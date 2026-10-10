# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-10T03:05:29.667496252Z","feature_name":"Hosted Files","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/hosted-files.feature","background_hash":"12fbdded241357f187a94e8ac9637048a085e4f588708a502d95d541132afa51","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Hosted Files - 1 lists the hosted files in a table in feed order","scenario_hash":"463cbbbc7d8ee3e98b89424e11366a1d01cda4d6f08ebb6b91debcf419316e0a","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:29.667496252Z"},{"index":4,"name":"Hosted Files - 5 an API error shows the error","scenario_hash":"76d33d0773557ef746a91e4d8695f6e0b6e2e813ad17207c54545e14642a5bb4","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-10T03:05:29.667496252Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Hosted Files - 1, Hosted Files - 2, Hosted Files - 3, Hosted Files - 4, Hosted Files - 5, Hosted Files - 6, Hosted Files - 7, Hosted Files - 8
#
# The /dashboard page lists the files hosted through the bch-file-hosting API
# as a Bootstrap table. It loads the public feed from <base>/files (base read
# from REACT_APP_FILE_HOSTING_URL, default
# https://file-hosting-api.blippost.com), one page of 20 at a time, and shows
# each file's name, size, paid time, hosting expiry, truncated CID with a copy
# control, a download link built from the same base URL, and a gateway view
# link. Refresh reloads the first page; Load more appends the next page. This is
# a client-only read feature: it broadcasts no Memo action and changes no
# psf-memo-db data.
Feature: Hosted Files

  Background:
    Given a fresh file hosting page

  Scenario Outline: Hosted Files - 1 lists the hosted files in a table in feed order
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor opens the dashboard
    Then the dashboard shows a table with the columns File Name, Size, Paid, Hosted Until, CID, Download, View
    And the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Hosted Files - 2 shows the CID, download, and view of each hosted file in its row
    Given the hosting API base URL is <api_base>
    And the hosting API feed lists a pinned file <cid> named <filename> with the gateway URL <api_gateway_url>
    When the visitor opens the dashboard
    Then the CID cell of row <cid> holds <shown_cid>
    And row <cid> offers a copy control
    And the download cell of row <cid> links <shown_download>
    And the view cell of row <cid> opens <shown_view_url> in a new tab

    Examples:
      | api_base                              | cid                                                          | filename    | api_gateway_url                                                                                  | shown_cid           | shown_download                                                                                                     | shown_view_url                                                                                   |
      | https://file-hosting-api.blippost.com | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg   | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg       | bafybeig...y55fbzdi | https://file-hosting-api.blippost.com/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg       |
      | http://localhost:5050                 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt   | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt | bafybeia...aaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa               | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt |
      | https://file-hosting-api.blippost.com | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | archive.tar | https://ipfs.io/ipfs/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc/archive.tar | bafybeic...cccccccc | https://file-hosting-api.blippost.com/download/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | https://ipfs.io/ipfs/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc/archive.tar |

  Scenario Outline: Hosted Files - 3 formats the size and dates of a hosted file
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg of <api_size> bytes paid at <api_paid_at> until <api_hosted_until>
    When the visitor opens the dashboard
    Then the size cell of row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi measures <shown_size>
    And row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi shows the paid time <shown_paid>
    And row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi shows the hosting end <shown_until>

    Examples:
      | api_size | api_paid_at              | api_hosted_until         | shown_size | shown_paid           | shown_until          |
      | 999      | 2026-01-02T00:00:00.000Z | 2027-01-02T00:00:00.000Z | 999 bytes  | 2026-01-02 00:00 UTC | 2027-01-02 00:00 UTC |
      | 1024     | 2026-02-15T13:45:00.000Z | 2027-02-15T13:45:00.000Z | 1.02 KB    | 2026-02-15 13:45 UTC | 2027-02-15 13:45 UTC |
      | 1000000  | 2026-03-20T06:07:00.000Z | 2027-03-20T06:07:00.000Z | 1.00 MB    | 2026-03-20 06:07 UTC | 2027-03-20 06:07 UTC |

  Scenario: Hosted Files - 4 an empty feed shows a message
    When the visitor opens the dashboard
    Then the page shows "No files are hosted yet."

  Scenario Outline: Hosted Files - 5 an API error shows the error
    Given the hosting API rejects the feed with error <api_error>
    When the visitor opens the dashboard
    Then the page shows "<shown_error>"

    Examples:
      | api_error        | shown_error      |
      | Hosting API down | Hosting API down |
      | Feed unavailable | Feed unavailable |

  Scenario: Hosted Files - 6 loads more files from the next page
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed has a next page
    And the hosting API feed's next page lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor opens the dashboard
    And the visitor loads more of the dashboard
    Then the dashboard lists the file names photo.jpg,notes.txt

  Scenario: Hosted Files - 7 refresh reloads the feed
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    When the visitor opens the dashboard
    And the hosting API feed is replaced with a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor refreshes the dashboard
    Then the dashboard lists the file names notes.txt

  Scenario Outline: Hosted Files - 8 the navigation menu shows File Dashboard below File Upload
    Given I open the navigation menu
    Then the menu shows a link to the path /dashboard with the label <label>
    And the menu shows the entries Account, File Upload, File Dashboard, BCH in order

    Examples:
      | label          |
      | File Dashboard |
