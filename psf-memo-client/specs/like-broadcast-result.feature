# Scenarios: Like Broadcast Result - 1, Like Broadcast Result - 2, Like Broadcast Result - 3
#
# After a like is broadcast from the like/tip modal, the modal no longer closes
# automatically. Instead it shows a broadcast result: a success message, the
# like transaction id, and a link to that transaction on the block explorer
# (https://bch.loping.net/tx/<txid>) that opens in a new tab. The like count and
# filled heart are still reflected on the post while the result is shown. The
# user must manually dismiss the result, which closes the like/tip modal. This
# mirrors the New Post page's post-broadcast result modal and applies to the
# shared like/tip modal used by every post card. This is a client-only behavior
# in psf-memo-client: it broadcasts no additional Memo action and changes no DB
# data.
Feature: Like Broadcast Result

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has a spendable balance of 100000 sats

  Scenario Outline: Like Broadcast Result - 1 a successful like keeps the modal open and shows the broadcast result
    Given a post with the txid <liked_txid> authored by the author address
    When I click the heart icon on the post with txid <liked_txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <liked_txid>
    Then the like/tip modal remains open
    And the like/tip modal shows a broadcast success message
    And the like/tip modal shows the like transaction id
    And the like/tip modal shows a link to the block explorer for the like transaction
    And the like count on the post increases by one
    And the heart icon on the post shows as filled

    Examples:
      | liked_txid |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario Outline: Like Broadcast Result - 2 a successful like with a tip keeps the modal open and shows the broadcast result
    Given a post with the txid <liked_txid> authored by the author address
    When I click the heart icon on the post with txid <liked_txid>
    When I enter a tip of <tip>
    When I submit the like
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <liked_txid>
    Then the wallet sends a tip of <tip> to the author address
    Then the like/tip modal remains open
    And the like/tip modal shows a broadcast success message
    And the like/tip modal shows the like transaction id

    Examples:
      | liked_txid | tip |
      | 1111111111111111111111111111111111111111111111111111111111111111 | 600 |
      | 2222222222222222222222222222222222222222222222222222222222222222 | 25000 |

  Scenario Outline: Like Broadcast Result - 3 dismissing the broadcast result closes the like/tip modal
    Given a post with the txid <liked_txid> authored by the author address
    When I click the heart icon on the post with txid <liked_txid>
    When I submit the like without a tip
    Then the like/tip modal remains open
    When I dismiss the like result
    Then the like/tip modal closes

    Examples:
      | liked_txid |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
