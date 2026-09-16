# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-16T02:30:54.209408268Z","feature_name":"Post Link Formatting","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/post-link-formatting.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":3,"name":"Post Link Formatting - 4 an embeddable YouTube link is embedded instead of rendered as a plain link","scenario_hash":"909b9c6f64851c05dec405b81a9fdb8946f83d2d8445aa60e75dc7f7c845f539","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-09-16T02:30:54.209408268Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Post Link Formatting - 1, Post Link Formatting - 2, Post Link Formatting - 3, Post Link Formatting - 4
#
# When a post's text contains a URL, the client renders it as an anchor that
# opens in a new tab. URLs written with an http:// or https:// scheme keep that
# scheme; bare domains such as memo.fullstackcash.net are linked with an
# https:// scheme while their visible text stays as written. Embeddable YouTube
# links keep their existing embedded-player behavior instead of becoming plain
# links. Posts without URLs are unchanged. This is a read-only rendering
# feature in psf-memo-client: it broadcasts no Memo action and changes no DB
# data.
Feature: Post Link Formatting

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Post Link Formatting - 1 a URL with an http scheme renders as a link that opens in a new tab
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows a link to <href> that opens in a new tab

    Examples:
      | text | href |
      | visit https://memo.fullstackcash.net for details | https://memo.fullstackcash.net |
      | link http://example.com/path here | http://example.com/path |
      | read https://memo.fullstackcash.net, then reply | https://memo.fullstackcash.net |

  Scenario Outline: Post Link Formatting - 2 a bare domain renders as a link with an https scheme and unchanged visible text
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows a link to <href> that opens in a new tab
    And the feed shows a link with the text <link_text>

    Examples:
      | text | href | link_text |
      | visit memo.fullstackcash.net for details | https://memo.fullstackcash.net | memo.fullstackcash.net |
      | see memo.fullstackcash.net/feed now | https://memo.fullstackcash.net/feed | memo.fullstackcash.net/feed |
      | go to www.example.com now | https://www.example.com | www.example.com |
      | visit memo.fullstackcash.net, it is live | https://memo.fullstackcash.net | memo.fullstackcash.net |

  Scenario: Post Link Formatting - 3 a post without a URL renders no link
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text just a normal memo
    When I open the recent posts feed
    Then the feed shows no link

  Scenario Outline: Post Link Formatting - 4 an embeddable YouTube link is embedded instead of rendered as a plain link
    Given the psf-memo-db API serves a post with txid 4444444444444444444444444444444444444444444444444444444444444444 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows an embedded YouTube player for the video <video_id>
    And the feed shows a link to <href> that opens in a new tab

    Examples:
      | text | video_id | href |
      | watch https://youtu.be/dQw4w9WgXcQ then read https://memo.fullstackcash.net | dQw4w9WgXcQ | https://memo.fullstackcash.net |
