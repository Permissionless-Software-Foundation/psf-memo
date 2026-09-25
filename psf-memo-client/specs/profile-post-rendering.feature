# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-25T21:11:33.471712716Z","feature_name":"Profile Post Rendering","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/profile-post-rendering.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Profile Post Rendering - 1 a post containing a YouTube link embeds the video","scenario_hash":"00fe2b0f6a80f70d2081f9bfa1b0aba90bd3b5c8761b30251b11a961be4597a2","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-25T21:11:33.471712716Z"},{"index":1,"name":"Profile Post Rendering - 2 a post with surrounding text keeps the text and embeds the video","scenario_hash":"00470dd9156d64dd52b95c7a9c575c22a3a237e5ded61b52bac81095f26bc2b7","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-09-25T21:11:33.471712716Z"},{"index":2,"name":"Profile Post Rendering - 3 an image URL renders an inline image inside a link","scenario_hash":"04194d74e3791f1f3d2aebac6090c1cc91e29daaa37bcb814ef8881da81a805e","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-09-25T21:11:33.471712716Z"},{"index":4,"name":"Profile Post Rendering - 5 an image that fails to load falls back to a plain link","scenario_hash":"9f49823b70eb5c0db876550745344c7cf7044ec2a02aaa40957ef5977d892173","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-25T21:11:33.471712716Z"}]}
# acceptance-mutation-manifest-end

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
