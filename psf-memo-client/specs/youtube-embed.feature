# Scenarios: YouTube Embed - 1, YouTube Embed - 2, YouTube Embed - 3
#
# When a post's text contains a YouTube link, the client renders an embedded
# YouTube player for that video instead of showing the raw URL as plain text.
# The surrounding text (if any) is preserved. Posts without an embeddable
# YouTube link render as plain text. This is a read-only rendering feature in
# psf-memo-client: it broadcasts no Memo action and changes no DB data.
Feature: YouTube Embed

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: YouTube Embed - 1 a post containing a YouTube link embeds the video
    Given the psf-memo-db API serves a post with txid <txid> authored by the address <author> with text <url>
    When I open the recent posts feed
    Then the feed shows an embedded YouTube player for the video <video_id>
    And the feed does not show the raw URL <url>

    Examples:
      | txid | author | url | video_id |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | https://www.youtube.com/watch?v=dQw4w9WgXcQ | dQw4w9WgXcQ |
      | 2222222222222222222222222222222222222222222222222222222222222222 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | https://youtu.be/dQw4w9WgXcQ | dQw4w9WgXcQ |

  Scenario Outline: YouTube Embed - 2 a post with surrounding text keeps the text and embeds the video
    Given the psf-memo-db API serves a post with txid <txid> authored by the address <author> with text <text>
    When I open the recent posts feed
    Then the feed shows the text <text_without_url>
    And the feed shows an embedded YouTube player for the video <video_id>

    Examples:
      | txid | author | text | text_without_url | video_id |
      | 3333333333333333333333333333333333333333333333333333333333333333 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | check this out https://www.youtube.com/watch?v=dQw4w9WgXcQ | check this out | dQw4w9WgXcQ |

  Scenario Outline: YouTube Embed - 3 a post without an embeddable YouTube link shows plain text
    Given the psf-memo-db API serves a post with txid <txid> authored by the address <author> with text <text>
    When I open the recent posts feed
    Then the feed shows the text <text>
    And the feed does not show an embedded video player

    Examples:
      | txid | author | text |
      | 4444444444444444444444444444444444444444444444444444444444444444 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | just a normal memo |
      | 5555555555555555555555555555555555555555555555555555555555555555 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | visit https://example.com for details |
      | 6666666666666666666666666666666666666666666666666666666666666666 | bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy | https://www.youtube.com/watch?v= |
      | 7777777777777777777777777777777777777777777777777777777777777777 | bitcoincash:qqq3728yw0y47sqn6l2na30mcw6zm78dzqre909m2r | https://youtu.be/ |
