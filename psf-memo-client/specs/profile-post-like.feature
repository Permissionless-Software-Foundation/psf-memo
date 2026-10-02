# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-02T15:21:33.218135738Z","feature_name":"Profile Post Like / Tip","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/profile-post-like.feature","background_hash":"1714896143ae0425b1c9938c1bc926ef61183ee3e842aa76d8bfd0ec751fcc9c","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Profile Post Like / Tip - 3 a like from the profile page broadcasts the Memo like action","scenario_hash":"9cc56309677cba3ddc69640db328c3dece2fb6e03be34f9ca8ea8eb4b253d2e0","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-02T15:21:33.218135738Z"}]}
# acceptance-mutation-manifest-end

# The heart on a /profile/:addr post card is an interactive like control, the
# same as the heart on the /posts/recent feed post card. Clicking it opens the
# like/tip modal for that post; submitting a like broadcasts the Memo like
# action (0x6d04) with an optional tip to the post author; the post's like
# count and heart reflect the like; and the same broadcast-result modal stays
# open with the success message, like transaction id, and block-explorer link
# until dismissed. This is a client-only behavior in psf-memo-client: it
# broadcasts the normal Memo like transaction and changes no other DB data.
#
# Scenarios: Profile Post Like / Tip - 1, Profile Post Like / Tip - 2, Profile Post Like / Tip - 3, Profile Post Like / Tip - 4, Profile Post Like / Tip - 5
Feature: Profile Post Like / Tip

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has a spendable balance of 100000 sats

  Scenario Outline: Profile Post Like / Tip - 1 the profile post shows an interactive like button
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with a like count of 17
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile post with txid <txid> shows an interactive like button

    Examples:
      | txid |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario Outline: Profile Post Like / Tip - 2 clicking the profile post like button opens the like/tip modal
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with a like count of 17
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the heart icon on the post with txid <txid>
    Then a like/tip modal opens for the post with txid <txid>

    Examples:
      | txid |
      | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Profile Post Like / Tip - 3 a like from the profile page broadcasts the Memo like action
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with a like count of 0
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the heart icon on the post with txid <txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>
    Then the wallet sends no tip
    Then the like count on the post increases by one
    Then the heart icon on the post shows as filled

    Examples:
      | txid |
      | 5555555555555555555555555555555555555555555555555555555555555555 |
      | 6666666666666666666666666666666666666666666666666666666666666666 |

  Scenario Outline: Profile Post Like / Tip - 4 a like with a tip from the profile page pays the author
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with a like count of 0
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the heart icon on the post with txid <txid>
    When I enter a tip of <tip>
    When I submit the like
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>
    Then the wallet sends a tip of <tip> to the author address
    Then the like count on the post increases by one

    Examples:
      | txid | tip |
      | 7777777777777777777777777777777777777777777777777777777777777777 | 600 |
      | 8888888888888888888888888888888888888888888888888888888888888888 | 25000 |

  Scenario Outline: Profile Post Like / Tip - 5 the profile page shows the like broadcast result and dismisses it
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with a like count of 0
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the heart icon on the post with txid <txid>
    When I submit the like without a tip
    Then the like/tip modal remains open
    And the like/tip modal shows a broadcast success message
    And the like/tip modal shows the like transaction id
    And the like/tip modal shows a link to the block explorer for the like transaction
    When I dismiss the like result
    Then the like/tip modal closes

    Examples:
      | txid |
      | 9999999999999999999999999999999999999999999999999999999999999999 |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
