# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-18T19:43:11.863411027Z","feature_name":"Notification Entry Display","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/notification-entry-display.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":1,"name":"Notification Entry Display - 2 the avatar and display name link to the actor's profile","scenario_hash":"6eac4433d642f99b7538085e60169c835655026202b1abee6b2264fe01d52711","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-18T19:43:11.863411027Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Notification Entry Display - 1, Notification Entry Display - 2, Notification Entry Display - 3, Notification Entry Display - 4, Notification Entry Display - 5, Notification Entry Display - 6, Notification Entry Display - 7, Notification Entry Display - 8
#
# Each Notifications entry names its actor with the actor's Memo display name
# and avatar, resolved client-side from the name and profile-picture records.
# The full BCH address is shown too, as small non-emphasised plain text, and
# the avatar and display name link to the actor's profile. Like and reply
# notifications also offer a "View Post" link that opens the referenced
# original post's thread; follow notifications have no such link. When the
# actor has no display name the entry shows the truncated address as the name
# and still shows the small full address. When the actor has no avatar, or the
# profile lookup fails, the entry falls back to an identicon.
Feature: Notification Entry Display

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Notification Entry Display - 1 a notification shows the actor's display name, avatar, and address
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address <addr>
    And the psf-memo-db API serves the display name "<name>" for the address <addr>
    And the psf-memo-db API serves the avatar "<avatar>" for the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> shows the display name "<name>"
    And the notification entry from the address <addr> shows the avatar "<avatar>"
    And the notification entry from the address <addr> shows the address <addr> as plain text

    Examples:
      | addr | name | avatar |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice | https://example.com/alice.png |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bob | https://example.com/bob.jpg |

  Scenario Outline: Notification Entry Display - 2 the avatar and display name link to the actor's profile
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> links the avatar to "<profile_path>"
    And the notification entry from the address <addr> links the display name to "<profile_path>"

    Examples:
      | addr | profile_path |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | /profile/bitcoincash%3Aqr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | /profile/bitcoincash%3Aqqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Notification Entry Display - 3 a like notification's "View Post" link opens the original post
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid <my_post> by the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> offers a "View Post" link
    When I click the "View Post" link in the notification from the address <addr>
    Then the thread modal opens for the post with txid <my_post>

    Examples:
      | my_post | addr |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | 3333333333333333333333333333333333333333333333333333333333333333 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Notification Entry Display - 4 a reply notification's "View Post" link opens the original post
    Given the psf-memo-db API serves a post with txid <my_post> authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a reply with txid 4444444444444444444444444444444444444444444444444444444444444444 to the post with txid <my_post> by the address <addr> with text "<reply_text>"
    When I open the Notifications page
    Then the notification entry from the address <addr> shows the reply text "<reply_text>"
    And the notification entry from the address <addr> offers a "View Post" link
    When I click the "View Post" link in the notification from the address <addr>
    Then the thread modal opens for the post with txid <my_post>

    Examples:
      | my_post | addr | reply_text |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | nice post |
      | 3333333333333333333333333333333333333333333333333333333333333333 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | agreed |

  Scenario Outline: Notification Entry Display - 5 a follow notification has no "View Post" link
    Given the psf-memo-db API records that the address <follower> follows my wallet address
    When I open the Notifications page
    Then the notification entry from the address <follower> does not offer a "View Post" link

    Examples:
      | follower |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r |

  Scenario Outline: Notification Entry Display - 6 an actor without a display name shows the truncated address as the name
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address <addr>
    And the psf-memo-db API serves the avatar "<avatar>" for the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> shows the display name "<name>"
    And the notification entry from the address <addr> shows the avatar "<avatar>"

    Examples:
      | addr | name | avatar |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincas...4y0qverfuy | https://example.com/alice.png |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bitcoincas...zqre909m2r | https://example.com/bob.jpg |

  Scenario Outline: Notification Entry Display - 7 an actor without an avatar shows an identicon
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address <addr>
    And the psf-memo-db API serves the display name "<name>" for the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> shows an identicon avatar
    And the notification entry from the address <addr> shows the display name "<name>"

    Examples:
      | addr | name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | alice |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bob |

  Scenario Outline: Notification Entry Display - 8 a failed profile lookup falls back to the address and identicon
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "hello from me"
    And the psf-memo-db API serves a like with txid 2222222222222222222222222222222222222222222222222222222222222222 on the post with txid 1111111111111111111111111111111111111111111111111111111111111111 by the address <addr>
    And the psf-memo-db API fails to serve the profile for the address <addr>
    When I open the Notifications page
    Then the notification entry from the address <addr> shows the display name "<name>"
    And the notification entry from the address <addr> shows an identicon avatar
    And the notification entry from the address <addr> shows the address <addr> as plain text

    Examples:
      | addr | name |
      | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | bitcoincas...4y0qverfuy |
      | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | bitcoincas...zqre909m2r |
