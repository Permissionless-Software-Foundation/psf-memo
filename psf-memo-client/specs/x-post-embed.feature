# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-02T13:31:40.494462827Z","feature_name":"X Post Embed","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/x-post-embed.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[{"index":2,"name":"X Post Embed - 3 an x.com link that is not a status post stays an ordinary link","scenario_hash":"3cc7d6d1a82bfbfc629bd4339e939c46a8a16ad8539110b7c035907bfb4ca519","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-02T13:31:40.494462827Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: X Post Embed - 1, X Post Embed - 2, X Post Embed - 3, X Post Embed - 4, X Post Embed - 5
#
# When a post's text contains an x.com or twitter.com status link (a
# /status/<numeric id> path), the client renders that post in an embedded X
# frame instead of showing the raw URL. The embed is the self-contained X tweet
# frame at https://platform.twitter.com/embed/Tweet.html?id=<status_id>.
# Surrounding text is preserved. Links on x.com or twitter.com that are not
# status posts, and status links with a missing or non-numeric id, stay
# ordinary links. The shared PostContent renderer is also used by the profile
# page. This is a read-only rendering feature in psf-memo-client: it broadcasts
# no Memo action and changes no DB data.
Feature: X Post Embed

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: X Post Embed - 1 an x.com or twitter.com status link embeds the post
    Given the psf-memo-db API serves a post with txid 1111111111111111111111111111111111111111111111111111111111111111 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <url>
    When I open the recent posts feed
    Then the feed shows an embedded X post for status <status_id>
    And the feed does not show the raw URL <url>

    Examples:
      | url | status_id |
      | https://x.com/donatello/status/2105979472067297387 | 2105979472067297387 |
      | https://www.x.com/alice/status/1234567890123456789 | 1234567890123456789 |
      | https://twitter.com/bob/status/2222222222222222222 | 2222222222222222222 |
      | https://mobile.twitter.com/carol/status/3333333333333333333 | 3333333333333333333 |
      | https://x.com/i/web/status/4444444444444444444 | 4444444444444444444 |
      | https://x.com/dave/status/5555555555555555555?s=20 | 5555555555555555555 |

  Scenario Outline: X Post Embed - 2 a post with surrounding text keeps the text and embeds the post
    Given the psf-memo-db API serves a post with txid 2222222222222222222222222222222222222222222222222222222222222222 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows the text <text_without_url>
    And the feed shows an embedded X post for status <status_id>

    Examples:
      | text | text_without_url | status_id |
      | check this out https://x.com/donatello/status/2105979472067297387 | check this out | 2105979472067297387 |
      | https://x.com/alice/status/1234567890123456789 is a great thread | is a great thread | 1234567890123456789 |
      | look at https://twitter.com/bob/status/2222222222222222222! | look at | 2222222222222222222 |

  Scenario Outline: X Post Embed - 3 an x.com link that is not a status post stays an ordinary link
    Given the psf-memo-db API serves a post with txid 3333333333333333333333333333333333333333333333333333333333333333 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows a link to <href> that opens in a new tab
    And the feed does not show an embedded X post

    Examples:
      | text | href |
      | follow https://x.com/donatello | https://x.com/donatello |
      | https://x.com/donatello/status/ | https://x.com/donatello/status/ |
      | https://x.com/donatello/status/notanumber | https://x.com/donatello/status/notanumber |
      | https://twitter.com/ | https://twitter.com/ |
      | see https://example.com/x/status/123 now | https://example.com/x/status/123 |

  Scenario Outline: X Post Embed - 4 a post without an x.com status link shows no embedded X post
    Given the psf-memo-db API serves a post with txid 4444444444444444444444444444444444444444444444444444444444444444 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text <text>
    When I open the recent posts feed
    Then the feed shows the text <text>
    And the feed does not show an embedded X post

    Examples:
      | text |
      | just a normal memo |
      | visit https://example.com for details |

  Scenario: X Post Embed - 5 the profile page embeds an x.com status link
    Given the psf-memo-db API serves a post with txid 5555555555555555555555555555555555555555555555555555555555555555 authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text https://x.com/donatello/status/2105979472067297387
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the profile page shows an embedded X post for status 2105979472067297387
    And the profile page does not show the raw URL https://x.com/donatello/status/2105979472067297387
