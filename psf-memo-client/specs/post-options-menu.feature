# Scenarios: Post Options Menu - 1, Post Options Menu - 2, Post Options Menu - 3, Post Options Menu - 4, Post Options Menu - 5, Post Options Menu - 6, Post Options Menu - 7, Post Options Menu - 8, Post Options Menu - 9
#
# Every post card has a "Post options" button (three dots) in its upper-right
# corner. The menu is hidden until that button is clicked. Clicking it opens a
# menu whose first (top) item is "See on block explorer", a link to the post's
# transaction on the block explorer (https://bch.loping.net/tx/<txid>) that
# opens in a new tab. Clicking the button again, clicking anywhere outside the
# menu, or pressing Escape closes the menu. Arrow keys move focus to the menu's
# first item. The menu appears everywhere a post card is rendered: the recent
# feed, the following feed, the topic feed, profile posts, and the thread
# modal. This is a read-only rendering feature in psf-memo-client: it
# broadcasts no Memo action and changes no DB data.
Feature: Post Options Menu

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Post Options Menu - 1 the post menu shows the block explorer link as its first item
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    Then the page shows a post options button for the post with txid <txid>
    And the post options menu is hidden for the post with txid <txid>
    When I click the post options button for the post with txid <txid>
    Then the post options menu is shown for the post with txid <txid>
    And the first item in the post options menu is "See on block explorer"
    And the first post options menu item links to <explorer_url> and opens in a new tab

    Examples:
      | txid | explorer_url |
      | c96a46c8b55657fe125115e3ddf5ad30ad587bb41baa952cb8d9be9334161875 | https://bch.loping.net/tx/c96a46c8b55657fe125115e3ddf5ad30ad587bb41baa952cb8d9be9334161875 |
      | 1111111111111111111111111111111111111111111111111111111111111111 | https://bch.loping.net/tx/1111111111111111111111111111111111111111111111111111111111111111 |

  Scenario Outline: Post Options Menu - 2 clicking the post options button again closes the menu
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    When I click the post options button for the post with txid <txid>
    Then the first post options menu item links to <explorer_url> and opens in a new tab
    When I click the post options button again for the post with txid <txid>
    Then the post options menu is hidden for the post with txid <txid>

    Examples:
      | txid | explorer_url |
      | 2222222222222222222222222222222222222222222222222222222222222222 | https://bch.loping.net/tx/2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario Outline: Post Options Menu - 3 clicking outside the menu closes it
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    When I click the post options button for the post with txid <txid>
    Then the first post options menu item links to <explorer_url> and opens in a new tab
    When I click outside the post options menu
    Then the post options menu is hidden for the post with txid <txid>

    Examples:
      | txid | explorer_url |
      | 3333333333333333333333333333333333333333333333333333333333333333 | https://bch.loping.net/tx/3333333333333333333333333333333333333333333333333333333333333333 |

  Scenario Outline: Post Options Menu - 4 pressing Escape closes the menu
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    When I click the post options button for the post with txid <txid>
    Then the first post options menu item links to <explorer_url> and opens in a new tab
    When I press the Escape key
    Then the post options menu is hidden for the post with txid <txid>

    Examples:
      | txid | explorer_url |
      | 4444444444444444444444444444444444444444444444444444444444444444 | https://bch.loping.net/tx/4444444444444444444444444444444444444444444444444444444444444444 |

  Scenario Outline: Post Options Menu - 5 arrow keys move focus to the menu's first item
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the recent posts feed
    When I click the post options button for the post with txid <txid>
    Then the first post options menu item links to <explorer_url> and opens in a new tab
    When I press the ArrowDown key
    Then the first post options menu item has focus

    Examples:
      | txid | explorer_url |
      | 5555555555555555555555555555555555555555555555555555555555555555 | https://bch.loping.net/tx/5555555555555555555555555555555555555555555555555555555555555555 |

  Scenario Outline: Post Options Menu - 6 the following feed post menu offers the block explorer link
    Given my wallet follows the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the Following feed
    Then the page shows a post options button for the post with txid <txid>
    When I click the post options button for the post with txid <txid>
    Then the first item in the post options menu is "See on block explorer"
    And the first post options menu item links to <explorer_url> and opens in a new tab

    Examples:
      | txid | explorer_url |
      | 6666666666666666666666666666666666666666666666666666666666666666 | https://bch.loping.net/tx/6666666666666666666666666666666666666666666666666666666666666666 |

  Scenario Outline: Post Options Menu - 7 the topic feed post menu offers the block explorer link
    Given the psf-memo-db API serves a post with txid <txid> in the topic "bitcoin" authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the topic feed for "bitcoin"
    Then the page shows a post options button for the post with txid <txid>
    When I click the post options button for the post with txid <txid>
    Then the first item in the post options menu is "See on block explorer"
    And the first post options menu item links to <explorer_url> and opens in a new tab

    Examples:
      | txid | explorer_url |
      | 7777777777777777777777777777777777777777777777777777777777777777 | https://bch.loping.net/tx/7777777777777777777777777777777777777777777777777777777777777777 |

  Scenario Outline: Post Options Menu - 8 the thread post menu offers the block explorer link
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    And the thread for the post with txid <txid> contains a reply with txid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    When I open the thread for the post with txid <txid>
    Then the page shows a post options button for the post with txid <txid>
    When I click the post options button for the post with txid <txid>
    Then the first item in the post options menu is "See on block explorer"
    And the first post options menu item links to <explorer_url> and opens in a new tab

    Examples:
      | txid | explorer_url |
      | 8888888888888888888888888888888888888888888888888888888888888888 | https://bch.loping.net/tx/8888888888888888888888888888888888888888888888888888888888888888 |

  Scenario Outline: Post Options Menu - 9 the profile post menu offers the block explorer link
    Given the psf-memo-db API serves a post with txid <txid> authored by the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy with text a post from the feed
    When I open the profile page for the address bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy
    Then the page shows a post options button for the post with txid <txid>
    When I click the post options button for the post with txid <txid>
    Then the first item in the post options menu is "See on block explorer"
    And the first post options menu item links to <explorer_url> and opens in a new tab

    Examples:
      | txid | explorer_url |
      | 9999999999999999999999999999999999999999999999999999999999999999 | https://bch.loping.net/tx/9999999999999999999999999999999999999999999999999999999999999999 |
