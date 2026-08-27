# Scenarios: Like Count Display - 1, Like Count Display - 2, Like Count Display - 3, Like Count Display - 4
Feature: Like Count Display

  Background:
    Given the psf-memo-db API serves a post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa authored by the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d with a like count of 17
    Given the psf-memo-db API serves a post with txid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb authored by a second address with a like count of 3
    Given the psf-memo-db API serves a post with txid cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc authored by a third address with no like count recorded

  Scenario Outline: Like Count Display - 1 the recent feed shows the like count returned by the API for each post
    When I open the recent posts feed
    Then the post with txid <txid> shows the like count <expected>

    Examples:
      | txid | expected |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 17 |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 3 |

  Scenario: Like Count Display - 2 a post with no recorded like count shows a count of zero
    When I open the recent posts feed
    Then the post with txid cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc shows the like count 0

  Scenario Outline: Like Count Display - 3 the profile page shows the like count returned by the API for each post
    Given I open the profile page for the author of the post with txid <txid>
    Then the post with txid <txid> shows the like count <expected>

    Examples:
      | txid | expected |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 17 |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 3 |

  Scenario Outline: Like Count Display - 4 the thread view shows the like count returned by the API for the root post and each reply
    Given the thread for the post with txid <txid> contains a reply with txid <reply_txid>
    When I open the thread for the post with txid <txid>
    Then the post with txid <txid> shows the like count <expected_root>
    Then the reply with txid <reply_txid> shows the like count <expected_reply>

    Examples:
      | txid | reply_txid | expected_root | expected_reply |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd | 17 | 5 |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee | 3 | 8 |
