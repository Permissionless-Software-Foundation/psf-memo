# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-22T18:13:49.997822314Z","feature_name":"Profile Address Copy","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/profile-address-copy.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Profile Address Copy - 1, Profile Address Copy - 2, Profile Address Copy - 3, Profile Address Copy - 4
#
# The /profile/:addr sidebar lists the profile's BCH cash address on the left.
# Clicking that address copies it to the system clipboard and shows a transient
# "Copied to clipboard" confirmation tooltip; the tooltip disappears shortly
# after it appears. This is a client-only behavior in psf-memo-client: it reads
# existing profile data and writes only to the clipboard, broadcasting no Memo
# action and changing no DB data. It follows the copy-confirmation pattern
# already used by the post txid on feed post cards.
Feature: Profile Address Copy

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Profile Address Copy - 1 the profile page shows the profile address
    Given I open the profile page for the address <addr>
    Then the profile page shows the profile address <addr>

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Profile Address Copy - 2 clicking the profile address copies it to the clipboard
    Given I open the profile page for the address <addr>
    When I click the profile address
    Then the clipboard contains <addr>

    Examples:
      | addr |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario: Profile Address Copy - 3 clicking the profile address shows the copy confirmation
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page does not show an address copy confirmation
    When I click the profile address
    Then the profile page shows an address copy confirmation with the text "Copied to clipboard"

  Scenario: Profile Address Copy - 4 the copy confirmation disappears after a short delay
    Given I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    When I click the profile address
    Then the profile page shows an address copy confirmation
    When the address copy confirmation timeout elapses
    Then the profile page does not show an address copy confirmation
