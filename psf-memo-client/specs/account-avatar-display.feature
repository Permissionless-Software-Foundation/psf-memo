# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-02T16:11:12.415737679Z","feature_name":"Account Avatar Display","feature_path":"/home/trout/work/psf/code/psf-memo/.worktrees/architect/psf-memo-client/specs/account-avatar-display.feature","background_hash":"0d66780cb1b8e277f0ada40a8ffe336dec7a8eaf658f19d2ea344815fb9bf26c","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Scenarios: Account Avatar Display - 1, Account Avatar Display - 2
#
# When the authenticated account has an avatar URL set, the /account page
# sidebar renders that image. When no avatar URL is set, the account page
# shows a jdenticon derived from the account address instead. This is a
# read-only rendering feature in psf-memo-client: it broadcasts no Memo action
# and changes no DB data.
Feature: Account Avatar Display

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d

  Scenario Outline: Account Avatar Display - 1 the account page displays the avatar image when an avatar URL is set
    Given the authenticated account has an avatar URL "<url>"
    When I open the account page
    Then the account page displays the avatar image with the URL "<url>"

    Examples:
      | url |
      | https://example.com/avatar.png |
      | https://cdn.example.com/pics/me.jpg |

  Scenario: Account Avatar Display - 2 the account page shows a jdenticon when no avatar URL is set
    When I open the account page
    Then the account page shows a jdenticon avatar
    Then the account page does not display an avatar image
