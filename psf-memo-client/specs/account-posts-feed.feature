# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-08T20:30:08.716665769Z","feature_name":"Account Posts Feed","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/account-posts-feed.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Account Posts Feed - 1, Account Posts Feed - 2, Account Posts Feed - 3, Account Posts Feed - 4, Account Posts Feed - 5, Account Posts Feed - 6
#
# The /account page shows the authenticated account's own Memo posts in the
# right column, below the Set Name / Set Bio / Set Avatar URL controls, using
# the same post card as the /profile/:addr feed: the post's timestamp and block
# number at the top of the card, then the rendered post text (links, images, and
# YouTube embeds), the post options menu, the interactive like/tip button, and
# the reply count that opens the thread modal. The feed loads the account's
# top-level posts newest first and shows a no-posts message when the account has
# none. This is a client-only read feature in psf-memo-client: it reads
# GET /posts/by/:addr and broadcasts no Memo action.
Feature: Account Posts Feed

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario: Account Posts Feed - 1 the account page shows the account's posts below the controls
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by my wallet address with text "first memo"
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by my wallet address with text "second memo"
    When I open the account page
    Then the account page shows 2 posts
    And the account page shows the account controls above the posts

  Scenario Outline: Account Posts Feed - 2 the account feed renders a post like the profile feed
    Given the psf-memo-db API serves a post with txid <txid> authored by my wallet address with text <text>
    When I open the account page
    Then the account page shows an embedded YouTube player for the video <video_id>
    And the account page does not show the raw URL <url>
    And the account page shows a post options button for the post with txid <txid>

    Examples:
      | txid | text | url | video_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 | check this out https://youtu.be/dQw4w9WgXcQ | https://youtu.be/dQw4w9WgXcQ | dQw4w9WgXcQ |
      | 2222222222222222222222222222222222222222222222222222222222222222 | watch https://www.youtube.com/watch?v=dQw4w9WgXcQ now | https://www.youtube.com/watch?v=dQw4w9WgXcQ | dQw4w9WgXcQ |

  Scenario: Account Posts Feed - 3 the account feed shows a no-posts message when the account has none
    When I open the account page
    Then the account feed shows the message "You have no posts yet."

  Scenario Outline: Account Posts Feed - 4 the account feed's like button is interactive
    Given the psf-memo-db API serves a post with txid <txid> authored by my wallet address with text "my memo"
    When I open the account page
    Then the account post with txid <txid> shows an interactive like button
    When I click the heart icon on the post with txid <txid>
    Then a like/tip modal opens for the post with txid <txid>

    Examples:
      | txid |
      | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Account Posts Feed - 5 the account feed's comment icon opens the thread modal
    Given the psf-memo-db API serves a post with txid <txid> authored by my wallet address with text "my memo"
    When I open the account page
    When I click the comment icon on the post with txid <txid>
    Then the thread modal opens for the post with txid <txid>

    Examples:
      | txid |
      | 5555555555555555555555555555555555555555555555555555555555555555 |
      | 6666666666666666666666666666666666666666666666666666666666666666 |

  Scenario Outline: Account Posts Feed - 6 each account post shows its timestamp and block number
    Given the psf-memo-db API serves a post with txid <txid> authored by my wallet address with text "a dated memo" at block height <height> seen <seen>
    When I open the account page
    Then the account post with txid <txid> shows block number <height>
    And the account post with txid <txid> shows the timestamp for seen <seen>

    Examples:
      | txid | height | seen |
      | 7777777777777777777777777777777777777777777777777777777777777777 | 812345 | 1700000000 |
      | 8888888888888888888888888888888888888888888888888888888888888888 | 900001 | 1700000000000 |
