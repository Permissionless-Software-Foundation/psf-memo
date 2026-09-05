# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-09-05T20:15:33.828984609Z","feature_name":"Account Avatar Display","feature_path":"/home/trout/work/psf-memo/.worktrees/architect/psf-memo-client/specs/account-avatar-display.feature","background_hash":"e1d5f81f1ed083ac6934c429ca3cb4a0f8d4dac44c2eaa45c0960920bde2c017","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Account Avatar Display - 1, Account Avatar Display - 2
#
# When the authenticated account has an avatar URL set, the /account page
# renders that image instead of only showing the URL as text. When no avatar
# URL is set, the account page shows no avatar image. This is a read-only
# rendering feature in psf-memo-client: it broadcasts no Memo action and
# changes no DB data.
Feature: Account Avatar Display

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee

  Scenario Outline: Account Avatar Display - 1 the account page displays the avatar image when an avatar URL is set
    Given I navigate to the path /memo/set-avatar-url
    When I type an avatar URL with the text "<url>"
    When I submit the avatar URL
    Then the app broadcasts an OP_RETURN transaction with the Memo set-profile-picture prefix
    When I navigate to the path /account
    Then the account page displays the avatar image with the URL "<url>"

    Examples:
      | url |
      | https://example.com/avatar.png |
      | https://cdn.example.com/pics/me.jpg |

  Scenario: Account Avatar Display - 2 the account page shows no avatar image when no avatar URL is set
    Given I navigate to the path /account
    Then the account page does not display an avatar image
