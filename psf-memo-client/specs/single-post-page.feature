# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-14T14:25:40.644740696Z","feature_name":"Single Post Page","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/single-post-page.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[{"index":6,"name":"Single Post Page - 7 the root post has an interactive like button","scenario_hash":"c3a947207392f43b804213c3458a3421dffce7c7c1d04c727d98b42b5239cb83","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-14T14:25:40.644740696Z"}]}
# acceptance-mutation-manifest-end

# Scenarios: Single Post Page - 1, Single Post Page - 2, Single Post Page - 3, Single Post Page - 4, Single Post Page - 5, Single Post Page - 6, Single Post Page - 7, Single Post Page - 8, Single Post Page - 9, Single Post Page - 10, Single Post Page - 11, Single Post Page - 12, Single Post Page - 13, Single Post Page - 14
#
# A single-post page is a permalink view for one Memo post and its reply
# thread, served at /posts/thread/<txid>. It is reached from a post's
# timestamp (now a link) and from the "Copy post link" item in the post
# options menu, which copies the page's absolute URL. The page shows the root
# post and the oldest-first direct replies, at most ten per page, with a "Load
# more replies" control for longer threads; each rendered post keeps the normal
# like and reply actions, and a reply can itself be replied to. The page is
# read-only: liking and replying broadcast the existing Memo actions and need
# the app wallet, while loading the page needs no wallet.
Feature: Single Post Page

  Scenario Outline: Single Post Page - 1 the post timestamp links to the single post page
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    Then the timestamp link for the post with txid <txid> points to /posts/thread/<txid>

    Examples:
      | txid                                                             |
      | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario Outline: Single Post Page - 2 the post options menu copies the post page URL
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    When I click the post options button for the post with txid <txid>
    Then the post options menu offers a "Copy post link" item
    When I click the "Copy post link" item in the post options menu
    Then the clipboard contains the post page URL for the post with txid <txid>

    Examples:
      | txid                                                             |
      | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Single Post Page - 3 opening the post page shows the post and its replies
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves <served> replies to the post with txid <txid>
    When I open the single post page for the post with txid <txid>
    Then the single post page shows the post with txid <txid>
    And the single post page shows <shown> replies

    Examples:
      | txid                                                             | served | shown |
      | 5555555555555555555555555555555555555555555555555555555555555555 | 1      | 1     |
      | 6666666666666666666666666666666666666666666666666666666666666666 | 3      | 3     |
      | 7777777777777777777777777777777777777777777777777777777777777777 | 10     | 10    |

  Scenario Outline: Single Post Page - 4 the page shows at most ten replies
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves <served> replies to the post with txid <txid>
    When I open the single post page for the post with txid <txid>
    Then the single post page shows 10 replies
    And the single post page offers a Load more replies button

    Examples:
      | txid                                                             | served |
      | 8888888888888888888888888888888888888888888888888888888888888888 | 11     |
      | 9999999999999999999999999999999999999999999999999999999999999999 | 23     |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 100    |

  Scenario Outline: Single Post Page - 5 loading more replies reveals the next page
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves <served> replies to the post with txid <txid>
    When I open the single post page for the post with txid <txid>
    Then the single post page shows 10 replies
    When I click the Load more replies button
    Then the single post page shows 20 replies
    When I click the Load more replies button again
    Then the single post page shows <served> replies
    And the single post page does not offer a Load more replies button

    Examples:
      | txid                                                             | served |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | 21     |
      | cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc | 23     |

  Scenario Outline: Single Post Page - 6 a post with no replies shows the reply form
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the single post page for the post with txid <txid>
    Then the single post page shows the post with txid <txid>
    And the single post page shows no replies
    And the single post page shows a reply form

    Examples:
      | txid                                                             |
      | dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd |
      | eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee |

  Scenario Outline: Single Post Page - 7 the root post has an interactive like button
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the single post page for the post with txid <txid>
    When I click the heart icon on the post with txid <txid>
    Then a like/tip modal opens for the post with txid <txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>
    And the like count on the post increases by one
    And the heart icon on the post shows as filled

    Examples:
      | txid                                                             |
      | 1111111111111111111111111111111111111111111111111111111111111112 |
      | 1111111111111111111111111111111111111111111111111111111111111113 |

  Scenario Outline: Single Post Page - 8 a reply has an interactive like button
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves a reply with txid <replyTxid> to the post with txid <txid> with text a reply
    When I open the single post page for the post with txid <txid>
    When I click the heart icon on the post with txid <replyTxid>
    Then a like/tip modal opens for the post with txid <replyTxid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <replyTxid>
    And the like count on the post increases by one
    And the heart icon on the post shows as filled

    Examples:
      | txid                                                             | replyTxid                                                        |
      | 1111111111111111111111111111111111111111111111111111111111111114 | 2111111111111111111111111111111111111111111111111111111111111111 |
      | 1111111111111111111111111111111111111111111111111111111111111115 | 2111111111111111111111111111111111111111111111111111111111111112 |

  Scenario Outline: Single Post Page - 9 replying to the root post from the page broadcasts a reply
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the single post page for the post with txid <txid>
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the single post page shows a new reply from my address with the text "<message>"

    Examples:
      | txid                                                             | message          |
      | 1111111111111111111111111111111111111111111111111111111111111116 | hello from the page |
      | 1111111111111111111111111111111111111111111111111111111111111117 | a reply to the root |

  Scenario Outline: Single Post Page - 10 replying to a reply from the page broadcasts a reply to that reply
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves a reply with txid <replyTxid> to the post with txid <txid> with text a reply
    When I open the single post page for the post with txid <txid>
    When I click reply on the post with txid <replyTxid>
    When I type a reply to the selected post with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the single post page shows a new reply from my address with the text "<message>"

    Examples:
      | txid                                                             | replyTxid                                                        | message            |
      | 1111111111111111111111111111111111111111111111111111111111111118 | 2111111111111111111111111111111111111111111111111111111111111113 | a reply to a reply |
      | 1111111111111111111111111111111111111111111111111111111111111119 | 2111111111111111111111111111111111111111111111111111111111111114 | nested reply text  |

  Scenario Outline: Single Post Page - 11 the page offers a copy link action
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the single post page for the post with txid <txid>
    When I click the copy link button
    Then the clipboard contains the post page URL for the post with txid <txid>
    And the single post page shows a link copied confirmation

    Examples:
      | txid                                                             |
      | 3111111111111111111111111111111111111111111111111111111111111111 |
      | 3111111111111111111111111111111111111111111111111111111111111112 |

  Scenario Outline: Single Post Page - 12 a txid with no indexed post shows not found
    Given the psf-memo-db API has no thread for the post with txid <txid>
    When I open the single post page for the post with txid <txid>
    Then the single post page shows "Post not found"

    Examples:
      | txid                                                             |
      | 4111111111111111111111111111111111111111111111111111111111111111 |
      | 4111111111111111111111111111111111111111111111111111111111111112 |

  Scenario Outline: Single Post Page - 13 a failed thread request shows the error
    Given the psf-memo-db API fails the thread request for the post with txid <txid> with the error <error>
    When I open the single post page for the post with txid <txid>
    Then the single post page shows the error "<error>"

    Examples:
      | txid                                                             | error               |
      | 5111111111111111111111111111111111111111111111111111111111111111 | Service unavailable |
      | 5111111111111111111111111111111111111111111111111111111111111112 | Gateway timeout     |

  Scenario Outline: Single Post Page - 14 the page renders the thread without a wallet
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the psf-memo-db API serves a reply with txid <replyTxid> to the post with txid <txid> with text a reply
    When I open the single post page for the post with txid <txid>
    Then the single post page shows the post with txid <txid>
    And the single post page shows 1 reply

    Examples:
      | txid                                                             | replyTxid                                                        |
      | 6111111111111111111111111111111111111111111111111111111111111111 | 7111111111111111111111111111111111111111111111111111111111111111 |
      | 6111111111111111111111111111111111111111111111111111111111111112 | 7111111111111111111111111111111111111111111111111111111111111112 |
