# Scenarios: Profile Token Icons - 1, Profile Token Icons - 2, Profile Token Icons - 3, Profile Token Icons - 4, Profile Token Icons - 5, Profile Token Icons - 6, Profile Token Icons - 7, Profile Token Icons - 8, Profile Token Icons - 9
#
# The /profile/:addr sidebar lists the profile's BCH cash address and the
# Follow/Mute controls, and below them a row of small SLP token icons for the
# SLP tokens held by that profile address. Each icon is the token's
# mutable-data icon when one exists (the full-sized URL wins when the mutable
# data carries an http fullSizedUrl), otherwise a jdenticon derived from the
# token ID. Hovering a token icon shows the token ID as a native tooltip;
# clicking it opens the Tokentiger explorer for the token in a new tab. Token
# icons are about 30 pixels wide and wrap to multiple rows. A profile that
# holds no SLP tokens, or whose token list cannot be loaded, shows no token
# icons and does not error. This is a read-only rendering feature in
# psf-memo-client: it broadcasts no Memo action and changes no DB data.
#
# Fixture "profile-tokens" (the SLP tokens held by each profile address, with
# the mutable data used to choose each icon):
#   bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy holds:
#     1111111111111111111111111111111111111111111111111111111111111111
#       ticker ALPHA, name "Alpha Token",
#       mutable data tokenIcon https://example.com/icons/alpha.png
#     2222222222222222222222222222222222222222222222222222222222222222
#       ticker BETA, name "Beta Token",
#       no mutable data
#     3333333333333333333333333333333333333333333333333333333333333333
#       ticker GAMMA, name "Gamma Token",
#       mutable data tokenIcon https://example.com/icons/gamma.png and
#       fullSizedUrl https://example.com/icons/gamma-full.png
#   bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r holds no SLP tokens.
Feature: Profile Token Icons

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet serves the SLP token fixture "profile-tokens"

  Scenario: Profile Token Icons - 1 the profile page shows an icon for every SLP token the profile holds
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows 3 token icons

  Scenario Outline: Profile Token Icons - 2 a token with a mutable-data icon shows that image
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows a token icon for the SLP token <token_id> with the image <icon>

    Examples:
      | token_id | icon |
      | 1111111111111111111111111111111111111111111111111111111111111111 | https://example.com/icons/alpha.png |
      | 3333333333333333333333333333333333333333333333333333333333333333 | https://example.com/icons/gamma-full.png |

  Scenario: Profile Token Icons - 3 a token without a mutable-data icon shows a jdenticon
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows a jdenticon token icon for the SLP token 2222222222222222222222222222222222222222222222222222222222222222

  Scenario Outline: Profile Token Icons - 4 a token icon shows the token ID as a tooltip
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> has the tooltip <token_id>

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |
      | 3333333333333333333333333333333333333333333333333333333333333333 |

  Scenario Outline: Profile Token Icons - 5 a token icon links to the Tokentiger explorer in a new tab
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> links to https://explorer.tokentiger.com/?tokenid=<token_id> in a new tab

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |
      | 3333333333333333333333333333333333333333333333333333333333333333 |

  Scenario Outline: Profile Token Icons - 6 a token icon has an accessible label
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> has the accessible label "<label>"

    Examples:
      | token_id | label |
      | 1111111111111111111111111111111111111111111111111111111111111111 | ALPHA |
      | 2222222222222222222222222222222222222222222222222222222222222222 | BETA |
      | 3333333333333333333333333333333333333333333333333333333333333333 | GAMMA |

  Scenario Outline: Profile Token Icons - 7 a token icon is small
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> is 30 pixels wide

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario: Profile Token Icons - 8 a profile that holds no SLP tokens shows no token icons
    Given I open the profile page for the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r
    Then the profile page shows no token icons

  Scenario: Profile Token Icons - 9 a token list that fails to load shows no token icons
    Given the SLP token lookup for the profile address fails
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows no token icons
