# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-02T16:11:06.838604755Z","feature_name":"Account Page Layout","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/account-page-layout.feature","background_hash":"b56d0ab67b08480cf94095f23e8dc15cc25e0a789e74b1cf80fc2cc7750b6522","implementation_hash":"unknown","scenarios":[{"index":9,"name":"Account Page Layout - 10 a token with a mutable-data icon shows that image","scenario_hash":"1317e716fc2fc049858d55dc158725f5aab4e3fc22824c8c925a37afbd6b78b7","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-02T16:11:06.838604755Z"},{"index":13,"name":"Account Page Layout - 14 each account control has a description above it","scenario_hash":"33eb2aa17a9ad776c11c78a533939222ca821e6cb01fe713bca420291f1912d7","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-02T16:11:06.838604755Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Account Page Layout - 1, Account Page Layout - 2, Account Page Layout - 3, Account Page Layout - 4, Account Page Layout - 5, Account Page Layout - 6, Account Page Layout - 7, Account Page Layout - 8, Account Page Layout - 9, Account Page Layout - 10, Account Page Layout - 11, Account Page Layout - 12, Account Page Layout - 13, Account Page Layout - 14, Account Page Layout - 15, Account Page Layout - 16
#
# The /account page renders the authenticated wallet's identity the same way
# the /profile/:addr page does: a left sidebar with the avatar, bio, a Profile
# link to the account's own /profile/:addr page, the copyable BCH address, and
# the SLP token icons, and a right column containing the existing
# Set Name, Set Bio, and Set Avatar URL controls. Each control is preceded by
# a short description of what it does. This is a client-only rendering feature:
# it broadcasts no Memo action and changes no DB data. Account avatar rendering
# is specified by account-avatar-display.feature; the full SLP token-icon
# internals (mutable-data image, genesis-name tooltip, Tokentiger link, size)
# are specified by profile-token-icons.feature, and this feature asserts that
# the account page wires that same sidebar behavior to the authenticated
# address.
#
# Fixture "profile-tokens" (the SLP tokens held by each address):
#   bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy holds four tokens
#   (one with a mutable-data image, one with no mutable data); the other
#   addresses hold none.
Feature: Account Page Layout

  Background:
    Given a wallet authenticated for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the wallet serves the SLP token fixture "profile-tokens"

  Scenario: Account Page Layout - 1 the account page shows the account address
    Given I open the account page
    Then the account page shows the account address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy

  Scenario: Account Page Layout - 2 clicking the account address copies it to the clipboard
    Given I open the account page
    When I click the account address
    Then the clipboard contains bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy

  Scenario: Account Page Layout - 3 clicking the account address shows the copy confirmation
    Given I open the account page
    Then the account page does not show an address copy confirmation
    When I click the account address
    Then the account page shows an address copy confirmation with the text "Copied to clipboard"

  Scenario: Account Page Layout - 4 the copy confirmation disappears after a short delay
    Given I open the account page
    When I click the account address
    Then the account page shows an address copy confirmation
    When the account address copy confirmation timeout elapses
    Then the account page does not show an address copy confirmation

  Scenario Outline: Account Page Layout - 5 the account page shows the bio when set
    Given the authenticated account has a bio "<bio>"
    When I open the account page
    Then the account page shows my bio as "<bio>"

    Examples:
      | bio |
      | Building the future on Bitcoin Cash |
      | a longer bio with spaces and punctuation |

  Scenario: Account Page Layout - 6 the account page shows a no-bio message when no bio is set
    Given I open the account page
    Then the account page shows the text "No profile text"

  Scenario Outline: Account Page Layout - 7 the account page shows the display name
    Given the authenticated account has a name "<name>"
    When I open the account page
    Then the account page shows my name as "<name>"

    Examples:
      | name |
      | trout |
      | a longer name with spaces |

  Scenario: Account Page Layout - 8 the account page falls back to the truncated address when no name is set
    Given I open the account page
    Then the account page shows the truncated address bitcoincas...4y0qverfuy

  Scenario: Account Page Layout - 9 the account page shows an icon for every SLP token the account holds
    Given I open the account page
    Then the account page shows 4 token icons

  Scenario Outline: Account Page Layout - 10 a token with a mutable-data icon shows that image
    Given I open the account page
    When the account token data is retrieved
    Then the account page shows a token icon for the SLP token <token_id> with the image <icon>

    Examples:
      | token_id | icon |
      | 1111111111111111111111111111111111111111111111111111111111111111 | https://example.com/icons/alpha.png |
      | 3333333333333333333333333333333333333333333333333333333333333333 | https://example.com/icons/gamma-full.png |

  Scenario: Account Page Layout - 11 a token without a mutable-data icon shows a jdenticon
    Given I open the account page
    Then the account page shows a jdenticon token icon for the SLP token 2222222222222222222222222222222222222222222222222222222222222222

  Scenario: Account Page Layout - 12 the account page shows no token icons when it holds no SLP tokens
    Given a wallet authenticated for the address bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r
    Given I open the account page
    Then the account page shows no token icons

  Scenario: Account Page Layout - 13 a token list that fails to load shows no token icons
    Given the SLP token lookup for the profile address fails
    Given I open the account page
    Then the account page shows no token icons

  Scenario Outline: Account Page Layout - 14 each account control has a description above it
    Given I open the account page
    Then the account page shows the description "<description>" above the "<label>" button

    Examples:
      | label | description |
      | Set Name | Set the name shown next to your posts and on your profile. |
      | Set Bio | Write the profile text shown on your profile page. |
      | Set Avatar URL | Set the URL of the image used as your profile picture. |

  Scenario: Account Page Layout - 15 the account sidebar shows the profile sections in order
    Given the authenticated account has a bio "Building on BCH"
    Given the authenticated account has an avatar URL "https://example.com/avatar.png"
    Given I open the account page
    Then the account page shows the sidebar sections in the order avatar, bio, profile, address, tokens

  Scenario: Account Page Layout - 16 the account sidebar links to the account's profile page
    Given I open the account page
    Then the account sidebar shows a Profile link to /profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the account sidebar Profile link
    Then I navigate to the path /profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
