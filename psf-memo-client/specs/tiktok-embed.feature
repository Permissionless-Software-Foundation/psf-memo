# Scenarios: TikTok Embed - 1, TikTok Embed - 2, TikTok Embed - 3, TikTok Embed - 4, TikTok Embed - 5, TikTok Embed - 6
#
# When a post's text contains a TikTok video link, the client renders that
# video in an embedded TikTok player instead of showing the raw URL. Canonical
# links carry the numeric video id (tiktok.com/@user/video/<id>,
# m.tiktok.com/v/<id>.html, /player/v1/<id>, /embed/v2/<id>); short links
# (vt.tiktok.com/<code>, vm.tiktok.com/<code>, tiktok.com/t/<code>) carry only
# an opaque code and are resolved to a video id through TikTok's CORS-enabled
# oEmbed endpoint before the player is shown. The player is the self-contained
# frame at https://www.tiktok.com/player/v1/<video_id>. Surrounding text is
# preserved. A short link that cannot be resolved, and a tiktok.com link that
# is not a video post (profile, tag, home), stay ordinary links. The shared
# PostContent renderer is also used by the profile page. This is a read-only
# rendering feature in psf-memo-client: it broadcasts no Memo action and
# changes no DB data.
Feature: TikTok Embed

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: TikTok Embed - 1 a canonical TikTok video link embeds the player
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <url>
    When I open the recent posts feed
    Then the feed shows an embedded TikTok player for the video <video_id>
    And the feed does not show the raw URL <url>

    Examples:
      | url | video_id |
      | https://www.tiktok.com/@scout2015/video/6718335390845095173 | 6718335390845095173 |
      | https://tiktok.com/@alice/video/1234567890123456789 | 1234567890123456789 |
      | https://m.tiktok.com/v/2222222222222222222.html | 2222222222222222222 |
      | https://www.tiktok.com/player/v1/3333333333333333333 | 3333333333333333333 |
      | https://www.tiktok.com/embed/v2/4444444444444444444 | 4444444444444444444 |
      | https://www.tiktok.com/@dave/video/5555555555555555555?is_from_webapp=1 | 5555555555555555555 |

  Scenario Outline: TikTok Embed - 2 a TikTok short link embeds the player after it resolves
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <url>
    And the TikTok short link <url> resolves to the video <video_id>
    When I open the recent posts feed
    Then the feed shows an embedded TikTok player for the video <video_id>
    And the feed does not show the raw URL <url>

    Examples:
      | url | video_id |
      | https://vt.tiktok.com/ZSbUFKGVC/ | 7691425928601242902 |
      | https://vm.tiktok.com/ZM1234567/ | 6666666666666666666 |
      | https://www.tiktok.com/t/ZT7654321/ | 7777777777777777777 |

  Scenario Outline: TikTok Embed - 3 a short link that cannot be resolved stays an ordinary link
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <url>
    And the TikTok short link <url> cannot be resolved
    When I open the recent posts feed
    Then the feed shows a link to <url> that opens in a new tab
    And the feed does not show an embedded TikTok player

    Examples:
      | url |
      | https://vt.tiktok.com/ZSBROKEN99/ |
      | https://vm.tiktok.com/ZMDEAD000/ |

  Scenario Outline: TikTok Embed - 4 a post with surrounding text keeps the text and embeds the player
    Given the psf-memo-db API serves a post with txid 4444444444444444444444444444444444444444444444444444444444444444 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows the text <text_without_url>
    And the feed shows an embedded TikTok player for the video <video_id>

    Examples:
      | text | text_without_url | video_id |
      | check this out https://www.tiktok.com/@scout2015/video/6718335390845095173 | check this out | 6718335390845095173 |
      | https://www.tiktok.com/@alice/video/1234567890123456789 so good | so good | 1234567890123456789 |

  Scenario Outline: TikTok Embed - 5 a tiktok.com link that is not a video post stays an ordinary link
    Given the psf-memo-db API serves a post with txid 5555555555555555555555555555555555555555555555555555555555555555 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows a link to <href> that opens in a new tab
    And the feed does not show an embedded TikTok player

    Examples:
      | text | href |
      | follow https://www.tiktok.com/@scout2015 | https://www.tiktok.com/@scout2015 |
      | browse https://www.tiktok.com/tag/chess | https://www.tiktok.com/tag/chess |
      | https://www.tiktok.com/ | https://www.tiktok.com/ |
      | https://www.tiktok.com/@user/video/notanumber | https://www.tiktok.com/@user/video/notanumber |
      | https://vt.tiktok.com/ | https://vt.tiktok.com/ |
      | see https://example.com/video/123 now | https://example.com/video/123 |

  Scenario: TikTok Embed - 6 the profile page embeds a TikTok video link
    Given the psf-memo-db API serves a post with txid 6666666666666666666666666666666666666666666666666666666666666666 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text https://www.tiktok.com/@scout2015/video/6718335390845095173
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows an embedded TikTok player for the video 6718335390845095173
    And the profile page does not show the raw URL https://www.tiktok.com/@scout2015/video/6718335390845095173
