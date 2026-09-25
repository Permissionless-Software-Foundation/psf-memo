# Scenarios: Profile Post Rendering - 1, Profile Post Rendering - 2, Profile Post Rendering - 3, Profile Post Rendering - 4, Profile Post Rendering - 5
#
# The post feed on the /profile/:address page renders every post's text with
# the same link, image, and YouTube-embed behavior as the recent posts feed.
# An embeddable YouTube link becomes an embedded player instead of raw URL
# text, an image URL renders inline inside a link to the original image, any
# other URL renders as a link that opens in a new tab, and surrounding text is
# preserved. An image that fails to load falls back to a plain link. This is a
# read-only rendering feature in psf-memo-client: it broadcasts no Memo action
# and changes no DB data.
Feature: Profile Post Rendering

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Profile Post Rendering - 1 a post containing a YouTube link embeds the video
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <url>
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows an embedded YouTube player for the video <video_id>
    And the profile page does not show the raw URL <url>

    Examples:
      | url | video_id |
      | https://www.youtube.com/watch?v=dQw4w9WgXcQ | dQw4w9WgXcQ |
      | https://youtu.be/dQw4w9WgXcQ | dQw4w9WgXcQ |

  Scenario Outline: Profile Post Rendering - 2 a post with surrounding text keeps the text and embeds the video
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows the text <text_without_url>
    And the profile page shows an embedded YouTube player for the video <video_id>

    Examples:
      | text | text_without_url | video_id |
      | check this out https://www.youtube.com/watch?v=dQw4w9WgXcQ | check this out | dQw4w9WgXcQ |

  Scenario Outline: Profile Post Rendering - 3 an image URL renders an inline image inside a link
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows an image with the URL <url> and alt text <alt>
    And the profile page shows a link to <url> that opens in a new tab
    And the profile page shows the text <text_without_url>
    And the profile page does not show the URL <url> as text

    Examples:
      | text | url | alt | text_without_url |
      | https://i.imgur.com/swCI56T.jpeg Anong breed ng basil ito? | https://i.imgur.com/swCI56T.jpeg | swCI56T.jpeg | Anong breed ng basil ito? |
      | https://cdn.example.com/pics/Sunset.PNG over the bay | https://cdn.example.com/pics/Sunset.PNG | Sunset.PNG | over the bay |
      | https://example.com/img/photo.webp?w=500 a wide shot | https://example.com/img/photo.webp?w=500 | photo.webp | a wide shot |
      | http://images.example.org/cat.gif sitting still | http://images.example.org/cat.gif | cat.gif | sitting still |

  Scenario Outline: Profile Post Rendering - 4 a URL that is not an image renders as a link that opens in a new tab
    Given the psf-memo-db API serves a post with txid 4444444444444444444444444444444444444444444444444444444444444444 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows a link to <url> that opens in a new tab
    And the profile page shows no image

    Examples:
      | text | url |
      | read https://example.com/page now | https://example.com/page |
      | view https://example.com/photo?format=jpg here | https://example.com/photo?format=jpg |
      | logo https://example.com/logo.svg here | https://example.com/logo.svg |
      | visit memo.fullstackcash.net for details | https://memo.fullstackcash.net |

  Scenario Outline: Profile Post Rendering - 5 an image that fails to load falls back to a plain link
    Given the psf-memo-db API serves a post with txid 5555555555555555555555555555555555555555555555555555555555555555 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    And the image at <url> fails to load
    Then the profile page shows a link to <url> that opens in a new tab
    And the profile page shows a link with the text <url>
    And the profile page shows no image

    Examples:
      | text | url |
      | https://i.imgur.com/swCI56T.jpeg basil leaves | https://i.imgur.com/swCI56T.jpeg |
      | https://example.com/img/photo.png the view | https://example.com/img/photo.png |
