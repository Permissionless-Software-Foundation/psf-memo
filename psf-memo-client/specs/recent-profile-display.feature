# mutation-stamp: sha256=8af984082f2901239d5fb678777719eb4ecbb6d6efbf057a87e8e24969eff793
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-22T16:18:42.831980756Z","feature_name":"Recent Profile Display","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/recent-profile-display.feature","background_hash":"da06b9f905acb9a781acdf0c6ebd291ba14806b33c2a0219b0e324be93cca860","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Recent Profile Display - 1 the account column shows each profile's display name and avatar","scenario_hash":"051989028f7dc8aa3bcbc2791abd8077b79a96cef19c0e305808ae8895f271c1","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-09-20T20:08:48.255064334Z"},{"index":1,"name":"Recent Profile Display - 2 the account avatar and display name link to the profile","scenario_hash":"6bfc6fd8d7a183e1e51f4aef3a116f9169d54165046f069865f96e92d317354c","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-20T20:08:48.255064334Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Recent Profile Display - 1, Recent Profile Display - 2, Recent Profile Display - 3, Recent Profile Display - 4, Recent Profile Display - 5
#
# The /profile/recent page renders each recent profile in a table. A new
# leftmost "Account" column shows the profile's display name and avatar, ahead
# of the existing Address, Bio, Block, and Seen columns. The display name
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
    Then the recent profiles table has the column headers "Account", "Address", "Bio", "Block", "Seen", "Follow"
