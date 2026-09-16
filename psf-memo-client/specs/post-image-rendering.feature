# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-16T14:30:45.236912355Z","feature_name":"Post Image Rendering","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/post-image-rendering.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Post Image Rendering - 1 an image URL renders an inline image inside a link","scenario_hash":"7b43dc07b8d3d0c06df1c7afa5d1497a1e555364ae0c27eb3539deff1284b005","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-09-16T14:30:45.236912355Z"},{"index":2,"name":"Post Image Rendering - 3 an image that fails to load falls back to a plain link","scenario_hash":"6fde4a40ced467661bde1c978957b34d93f9ec6162c4276d6ee942d7747af7ba","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-09-16T14:30:45.236912355Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Post Image Rendering - 1, Post Image Rendering - 2, Post Image Rendering - 3
#
# When a post contains a URL whose path ends in a common image file extension
# (.jpg, .jpeg, .png, .gif, .webp, .bmp; case-insensitive; query string and
# fragment ignored), the client renders the image inline inside an anchor that
# opens the original URL in a new tab. The image's alt text is the URL's
# filename, or "post image" when no filename is present. The URL is not shown
# as text, and surrounding text is preserved. URLs that are not images keep the
# existing plain-link behavior, and an image that fails to load falls back to a
# plain link. This is a read-only rendering feature in psf-memo-client: it
# broadcasts no Memo action and changes no DB data.
Feature: Post Image Rendering

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Post Image Rendering - 1 an image URL renders an inline image inside a link
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows an image with the URL <url> and alt text <alt>
    And the feed shows a link to <url> that opens in a new tab
    And the feed shows the text <surrounding_text>
    And the feed does not show the URL <url> as text

    Examples:
      | text | url | alt | surrounding_text |
      | https://i.imgur.com/swCI56T.jpeg Anong breed ng basil ito? | https://i.imgur.com/swCI56T.jpeg | swCI56T.jpeg | Anong breed ng basil ito? |
      | https://cdn.example.com/pics/Sunset.PNG over the bay | https://cdn.example.com/pics/Sunset.PNG | Sunset.PNG | over the bay |
      | https://example.com/img/photo.webp?w=500 a wide shot | https://example.com/img/photo.webp?w=500 | photo.webp | a wide shot |
      | http://images.example.org/cat.gif sitting still | http://images.example.org/cat.gif | cat.gif | sitting still |

  Scenario Outline: Post Image Rendering - 2 a URL that is not an image renders as a plain link
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows a link to <url> that opens in a new tab
    And the feed shows no image

    Examples:
      | text | url |
      | read https://example.com/page now | https://example.com/page |
      | view https://example.com/photo?format=jpg here | https://example.com/photo?format=jpg |
      | logo https://example.com/logo.svg here | https://example.com/logo.svg |

  Scenario Outline: Post Image Rendering - 3 an image that fails to load falls back to a plain link
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    And the image at <url> fails to load
    Then the feed shows a link to <url> that opens in a new tab
    And the feed shows a link with the text <url>
    And the feed shows no image

    Examples:
      | text | url |
      | https://i.imgur.com/swCI56T.jpeg basil leaves | https://i.imgur.com/swCI56T.jpeg |
      | https://example.com/img/photo.png the view | https://example.com/img/photo.png |
