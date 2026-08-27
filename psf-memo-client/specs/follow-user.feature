# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-08-27T18:18:35.249787308Z","feature_name":"Follow User","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/follow-user.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Follow User - 1, Follow User - 2, Follow User - 3, Follow User - 4, Follow User - 5
#
# The follow/unfollow OP_RETURN payload is the followee's 20-byte hash160.
# Convert the followee's cash address with bch-js Address.toHash160() (available
# through the minimal-slp-wallet embedded bch-js) before broadcasting 0x6d06 /
# 0x6d07. Do not add a separate cashaddr dependency.
Feature: Follow User

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Follow User - 1 viewing another user's profile shows a Follow button
    Given I open the profile page for the address <addr>
    Then the profile page shows a Follow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Follow User - 2 clicking Follow broadcasts the follow action and shows Unfollow
    Given I open the profile page for the address <addr>
    When I click the Follow button
    Then the app broadcasts an OP_RETURN transaction with the Memo follow prefix for the address <addr>
    Then the profile page shows an Unfollow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario Outline: Follow User - 3 clicking Unfollow broadcasts the unfollow action and shows Follow
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the profile page for the address <addr>
    When I click the Unfollow button
    Then the app broadcasts an OP_RETURN transaction with the Memo unfollow prefix for the address <addr>
    Then the profile page shows a Follow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |

  Scenario: Follow User - 4 viewing my own profile does not show a Follow button
    Given I open the profile page for my own address
    Then the profile page does not show a Follow button

  Scenario Outline: Follow User - 5 the profile page shows Unfollow when I already follow the user
    Given the psf-memo-db API reports that I follow the address <addr>
    Given I open the profile page for the address <addr>
    Then the profile page shows an Unfollow button

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |
