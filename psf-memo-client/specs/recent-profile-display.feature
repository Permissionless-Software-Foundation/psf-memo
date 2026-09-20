# Scenarios: Recent Profile Display - 1, Recent Profile Display - 2, Recent Profile Display - 3, Recent Profile Display - 4, Recent Profile Display - 5
#
# The /profile/recent page renders each recent profile in a table. A new
# leftmost "Account" column shows the profile's display name and avatar, ahead
# of the existing Address, Bio, Block, Seen, and TXID columns. The display name
# and avatar link to the profile. When a profile has no display name the account
# shows the truncated address; when it has no avatar the account shows an
# identicon. This is a read-only rendering feature: it broadcasts no Memo action
# and writes no DB data.
#
# Fixture "recent-profiles-identities" (the GET /profile/recent response: each
# profile carries the display name and avatar URL joined from the names and
# profilePics stores, as null when absent):
#   bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy (alice) { text: alice bio, name: alice, profilePicUrl: https://example.com/alice.png }
#   bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r (bob)   { text: bob bio,   name: bob,   profilePicUrl: https://example.com/bob.jpg }
#   bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a (carol) { text: carol bio, name: carol, profilePicUrl: null }
#   bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d (dave)  { text: dave bio,  name: null,  profilePicUrl: https://example.com/dave.png }
Feature: Recent Profile Display

  Background:
    Given the psf-memo-db API serves the recent profiles fixture "recent-profiles-identities"

  Scenario Outline: Recent Profile Display - 1 the account column shows each profile's display name and avatar
    When I open the recent profiles page
    Then the recent profiles account for the address <addr> shows the display name "<name>"
    And the recent profiles account for the address <addr> shows the avatar "<avatar>"

    Examples:
      | addr | name | avatar |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice | https://example.com/alice.png |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bob   | https://example.com/bob.jpg   |

  Scenario Outline: Recent Profile Display - 2 the account avatar and display name link to the profile
    When I open the recent profiles page
    Then the recent profiles account for the address <addr> links the avatar to "<profile_path>"
    And the recent profiles account for the address <addr> links the display name to "<profile_path>"

    Examples:
      | addr | profile_path |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | /profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | /profile/bitcoincash%3Aqqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario: Recent Profile Display - 3 a profile without an avatar shows an identicon
    When I open the recent profiles page
    Then the recent profiles account for the address bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a shows an identicon avatar
    And the recent profiles account for the address bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a shows the display name "carol"

  Scenario: Recent Profile Display - 4 a profile without a display name shows the truncated address
    When I open the recent profiles page
    Then the recent profiles account for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d shows the display name "bitcoincas...py26r63g3d"
    And the recent profiles account for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d shows the avatar "https://example.com/dave.png"

  Scenario: Recent Profile Display - 5 the account column is the first column and the other columns remain
    When I open the recent profiles page
    Then the recent profiles table has the column headers "Account", "Address", "Bio", "Block", "Seen", "TXID"
