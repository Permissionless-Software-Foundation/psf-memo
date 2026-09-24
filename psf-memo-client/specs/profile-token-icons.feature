# mutation-stamp: sha256=6318b2c3c83c2ef097a3c638aba478f04d4a0dd661aafcb2d407c210ea3f2e84
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-24T03:09:04.905471306Z","feature_name":"Profile Token Icons","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/profile-token-icons.feature","background_hash":"d8a0e7580e4bc24402465f0e9f7b1baa97c45efc0c33c5afb612cdf2fee0a156","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Profile Token Icons - 2 a token with a mutable-data icon shows that image","scenario_hash":"9f2be54d3bf22c6012f15a7ec0582e67493acbe5066d39d102c7101c43ecc229","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"},{"index":3,"name":"Profile Token Icons - 4 before the token data is retrieved, the tooltip is the token ID","scenario_hash":"4e23acb6ea910093ae78f5d812d030e3973631e1926ef98420df1e868b4fa39f","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"},{"index":4,"name":"Profile Token Icons - 5 once the token data is retrieved, the tooltip is the token name","scenario_hash":"bed64bae59911e81c1d00742c4d2213a2f553f55d46f6595f2929955f70404d5","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"},{"index":5,"name":"Profile Token Icons - 6 a token icon links to the Tokentiger explorer in a new tab","scenario_hash":"d3edb85e6b837fa57c4fd480012509244591ff44f97d3e9c6ec436532b05a2b0","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"},{"index":6,"name":"Profile Token Icons - 7 a token icon has an accessible label","scenario_hash":"d8f59bd1b0a07fc5636195bd6da7f8c89b99fe77d0a725bbc71ec74ff246d25c","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"},{"index":7,"name":"Profile Token Icons - 8 a token icon is small","scenario_hash":"fc6a5b25c8ef4c434d6d4736fd639b01ef63cf40ae3724917b6eb5c71be86253","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-09-24T03:09:04.905471306Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Profile Token Icons - 1, Profile Token Icons - 2, Profile Token Icons - 3, Profile Token Icons - 4, Profile Token Icons - 5, Profile Token Icons - 6, Profile Token Icons - 7, Profile Token Icons - 8, Profile Token Icons - 9, Profile Token Icons - 10, Profile Token Icons - 11, Profile Token Icons - 12
#
# The /profile/:addr sidebar lists the profile's BCH cash address and the
# Follow/Mute controls, and below them a row of small SLP token icons for the
# SLP tokens held by that profile address. Each icon is the token's
# mutable-data icon when one exists (the full-sized URL wins when the mutable
# data carries an http fullSizedUrl), otherwise a jdenticon derived from the
# token ID. The mutable data is the token's IPFS mutable-data record, resolved
# the same way the /slp-tokens page resolves it. The icons render as soon as
# the profile's token list loads, with the token ID as the native tooltip. The
# token data (the mutable-data record and the genesis record) is then retrieved
# asynchronously; once it resolves, the tooltip is replaced by the token's
# genesis name, falling back to the token ID when the genesis record has no
# name or the token data cannot be retrieved. Clicking a token icon opens the
# Tokentiger explorer for the token in a new tab. Token icons are about 30
# pixels wide and wrap to multiple rows. A profile that holds no SLP tokens, or
# whose token list cannot be loaded, shows no token icons and does not error.
# This is a read-only rendering feature in psf-memo-client: it broadcasts no
# Memo action and changes no DB data.
#
# Fixture "profile-tokens" (the SLP tokens held by each profile address, with
# the token data used to choose each icon and tooltip):
#   bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy holds:
#     1111111111111111111111111111111111111111111111111111111111111111
#       ticker ALPHA, genesis name "Alpha Token",
#       mutable data tokenIcon https://example.com/icons/alpha.png
#     2222222222222222222222222222222222222222222222222222222222222222
#       ticker BETA, genesis name "Beta Token",
#       no mutable data
#     3333333333333333333333333333333333333333333333333333333333333333
#       ticker GAMMA, genesis name "Gamma Token",
#       mutable data tokenIcon https://example.com/icons/gamma.png and
#       fullSizedUrl https://example.com/icons/gamma-full.png
#     4444444444444444444444444444444444444444444444444444444444444444
#       ticker DELTA, no genesis name, no mutable data
#   bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r holds no SLP tokens.
Feature: Profile Token Icons

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet serves the SLP token fixture "profile-tokens"

  Scenario: Profile Token Icons - 1 the profile page shows an icon for every SLP token the profile holds
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows 4 token icons

  Scenario Outline: Profile Token Icons - 2 a token with a mutable-data icon shows that image
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When the token data is retrieved
    Then the profile page shows a token icon for the SLP token <token_id> with the image <icon>

    Examples:
      | token_id | icon |
      | 1111111111111111111111111111111111111111111111111111111111111111 | https://example.com/icons/alpha.png |
      | 3333333333333333333333333333333333333333333333333333333333333333 | https://example.com/icons/gamma-full.png |

  Scenario: Profile Token Icons - 3 a token without a mutable-data icon shows a jdenticon
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows a jdenticon token icon for the SLP token 2222222222222222222222222222222222222222222222222222222222222222

  Scenario Outline: Profile Token Icons - 4 before the token data is retrieved, the tooltip is the token ID
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> has the token ID as its tooltip

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |
      | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Profile Token Icons - 5 once the token data is retrieved, the tooltip is the token name
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When the token data is retrieved
    Then the token icon for the SLP token <token_id> has the tooltip "<name>"

    Examples:
      | token_id | name |
      | 1111111111111111111111111111111111111111111111111111111111111111 | Alpha Token |
      | 2222222222222222222222222222222222222222222222222222222222222222 | Beta Token |
      | 3333333333333333333333333333333333333333333333333333333333333333 | Gamma Token |

  Scenario Outline: Profile Token Icons - 6 a token icon links to the Tokentiger explorer in a new tab
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> links to https://explorer.tokentiger.com/?tokenid=<token_id> in a new tab

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |
      | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Profile Token Icons - 7 a token icon has an accessible label
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the token icon for the SLP token <token_id> has the accessible label "<label>"

    Examples:
      | token_id | label |
      | 1111111111111111111111111111111111111111111111111111111111111111 | ALPHA |
      | 2222222222222222222222222222222222222222222222222222222222222222 | BETA |
      | 3333333333333333333333333333333333333333333333333333333333333333 | GAMMA |
      | 4444444444444444444444444444444444444444444444444444444444444444 | DELTA |

  Scenario Outline: Profile Token Icons - 8 a token icon is small
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When the token data is retrieved
    Then the token icon for the SLP token <token_id> is 30 pixels wide

    Examples:
      | token_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario: Profile Token Icons - 9 a profile that holds no SLP tokens shows no token icons
    Given I open the profile page for the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r
    Then the profile page shows no token icons

  Scenario: Profile Token Icons - 10 a token list that fails to load shows no token icons
    Given the SLP token lookup for the profile address fails
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows no token icons

  Scenario: Profile Token Icons - 11 a token whose genesis data has no name keeps the token ID tooltip
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When the token data is retrieved
    Then the token icon for the SLP token 4444444444444444444444444444444444444444444444444444444444444444 has the token ID as its tooltip

  Scenario: Profile Token Icons - 12 a token whose token data cannot be retrieved keeps the token ID tooltip
    Given the token data for the SLP token 2222222222222222222222222222222222222222222222222222222222222222 cannot be retrieved
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When the token data is retrieved
    Then the token icon for the SLP token 2222222222222222222222222222222222222222222222222222222222222222 has the token ID as its tooltip
